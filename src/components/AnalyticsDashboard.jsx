import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Stack,
  alpha,
  Button,
  LinearProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import AssessmentIcon from "@mui/icons-material/Assessment";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import MapIcon from "@mui/icons-material/Map";
import RouterIcon from "@mui/icons-material/Router";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TimelineIcon from "@mui/icons-material/Timeline";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import BuildIcon from "@mui/icons-material/Build";

import summaryService from "../services/summaryService.jsx";
import { useAuth } from "../context/AuthContext";

/**
 * Analytics Dashboard Component
 *
 * This component displays comprehensive project analytics by fetching and processing
 * summary data from the backend API. It provides visual insights into project progress,
 * KPIs, network infrastructure, and process workflows.
 *
 * DATA FLOW:
 * 1. Backend API (`summaryService.getComputedSummary()`) returns structured data:
 *    - Summary: Contains aggregated metrics (GPS, surveys, routers, teams, etc.)
 *    - Data: Contains detailed records (not used in current implementation)
 *
 * 2. Data Processing Pipeline:
 *    - `processSummaryData()`: Normalizes API response structure
 *    - `generateKPIs()`: Extracts and calculates key performance indicators
 *    - `getProcessSteps()`: Processes workflow steps for accordions
 *    - `getNetworkData()`: Extracts network infrastructure metrics
 *    - `processPhysicalSurveyStages()`: Handles physical survey stage calculations
 *
 * 3. Frontend Binding:
 *    - KPIs display real-time metrics from backend summary fields
 *    - Tables show processed data with progress bars and completion rates
 *    - Charts visualize equipment and network deployment status
 *    - Accordions provide drill-down into process workflows
 *
 * BACKEND DATA MAPPING:
 * - `Desktop_Survey`: Desktop survey approval workflow
 * - `Physical_Survey`: Physical survey and BOQ processing stages
 * - `Gp_Routers`/`Block_Routers`: Network infrastructure deployment
 * - `Hdd`: Equipment deployment and operational status
 * - `Deployed_Teams`: Field team deployment metrics
 * - `Gps`: GPS operational availability statistics
 */

// =============================================================================
// CONFIGURATIONS & CONSTANTS
// =============================================================================

// Backend field mappings for process steps
// Maps backend data keys to UI display configuration
const PROCESS_STEP_CONFIGS = {
  'Desktop_Survey': {
    title: 'Desktop Survey',
    submittedKey: 'Submitted',
    approvedKey: 'Approved',
    icon: <DesktopWindowsIcon />,
    color: 'primary',
  },
  'Physical_Survey': {
    title: 'Physical Survey and BOQ',
    submittedKey: 'Submitted',
    approvedKey: 'Approved',
    icon: <MapIcon />,
    color: 'success',
  },
  'Row': {
    title: 'ROW Status',
    submittedKey: 'Applied',
    approvedKey: 'Approved',
    icon: <ReceiptLongIcon />,
    color: 'warning',
  },
  'Invoice': {
    title: 'Invoice Processing',
    submittedKey: 'Submitted',
    approvedKey: 'Approved',
    icon: <ReceiptLongIcon />,
    color: 'secondary',
  },
};

// Network infrastructure mappings
const NETWORK_CONFIGS = {
  'Hdd': { name: 'HDD Machines', valueKey: 'Deployed', color: 'primary' },
  'Block_Routers': { name: 'Block Routers', valueKey: 'Deployed', color: 'success' },
  'Gp_Routers': { name: 'GP Routers', valueKey: 'Deployed', color: 'warning' },
  'Snoc': { name: 'SNOC Visibility', valueKey: 'Deployed', color: 'info' },
};

// =============================================================================
// DATA PROCESSING UTILITIES
// =============================================================================

/**
 * Calculates completion rate as percentage
 * @param {number} approved - Number of approved items
 * @param {number} submitted - Number of submitted items
 * @returns {number} Completion percentage (0-100)
 */
const calculateCompletionRate = (approved, submitted) => {
  return submitted > 0 ? Math.round((approved / submitted) * 100) : 0;
};

/**
 * Processes raw summary data from backend into structured format
 * @param {Object} rawData - Raw response from summaryService.getComputedSummary()
 * @returns {Object} Processed summary with normalized structure
 */
const processSummaryData = (rawData) => {
  const summaryPayload = rawData.Summary || rawData.summary || {};
  const dataPayload = rawData.Data || rawData.data || {};

  return {
    summary: summaryPayload,
    data: dataPayload,
  };
};

/**
 * Extracts and processes process steps data for display
 * @param {Object} summaryData - Processed summary data
 * @returns {Array} Array of process step objects with calculated values
 */
const getProcessSteps = (summaryData) => {
  return Object.entries(PROCESS_STEP_CONFIGS)
    .filter(([key]) => summaryData[key]) // Only include steps that exist in data
    .map(([key, config]) => ({
      ...config,
      submitted: summaryData[key]?.[config.submittedKey] ?? 0,
      approved: summaryData[key]?.[config.approvedKey] ?? 0,
    }));
};

/**
 * Extracts network infrastructure data for visualization
 * @param {Object} summaryData - Processed summary data
 * @param {Object} theme - MUI theme object for colors
 * @returns {Array} Array of network data objects
 */
const getNetworkData = (summaryData, theme) => {
  return Object.entries(NETWORK_CONFIGS)
    .filter(([key]) => summaryData[key]?.[NETWORK_CONFIGS[key].valueKey] > 0)
    .map(([key, config]) => ({
      name: config.name,
      value: summaryData[key][config.valueKey] ?? 0,
      color: theme.palette[config.color].main,
    }));
};

/**
 * Generates KPI metrics from summary data
 * @param {Object} summaryData - Processed summary data
 * @returns {Array} Array of KPI objects for display
 */
const generateKPIs = (summaryData) => {
  const kpis = [];

  // GPS Operational KPI
  if (summaryData.Gps?.Operational !== undefined) {
    kpis.push({
      title: 'GPs Operational',
      value: summaryData.Gps.Operational,
      subtitle: `${summaryData.Gps[">= 98%"] ?? 0} with >= 98% availability`,
      color: 'success',
    });
  }

  // Desktop Survey Approved KPI
  if (summaryData.Desktop_Survey?.Approved !== undefined) {
    const totalBlocks = summaryData.Physical_Survey?.TotalBlocks ?? 152;
    kpis.push({
      title: 'Desktop Survey Approved',
      value: Math.round(((summaryData.Desktop_Survey.Approved ?? 0) / totalBlocks) * 100),
      suffix: '%',
      subtitle: `${summaryData.Desktop_Survey.Approved ?? 0} approved out of ${totalBlocks} target`,
      color: 'primary',
    });
  }

  // Physical Survey Completed KPI
  if (summaryData.Physical_Survey?.Approved !== undefined && summaryData.Physical_Survey?.Submitted !== undefined) {
    kpis.push({
      title: 'Physical Survey Completed',
      value: calculateCompletionRate(summaryData.Physical_Survey.Approved,978),
      suffix: '%',
      subtitle: `${summaryData.Physical_Survey.Approved} completed out of ${978} target`,
      color: 'success',
    });
  }

  // BOQ Approved KPI
  if (summaryData.Boq?.Approved !== undefined && summaryData.Boq?.Submitted !== undefined) {
    kpis.push({
      title: 'BOQ Approved',
      value: calculateCompletionRate(summaryData.Boq.Approved, summaryData.Boq.Submitted),
      suffix: '%',
      subtitle: `${summaryData.Boq.Approved} approved out of ${summaryData.Boq.Submitted} submitted`,
      color: 'info',
    });
  }

  // Network Assets Deployed KPI
  const networkAssets = (summaryData.Block_Routers?.Deployed ?? 0) + (summaryData.Gp_Routers?.Deployed ?? 0);
  if (networkAssets > 0) {
    kpis.push({
      title: 'Network Assets Deployed',
      value: networkAssets,
      subtitle: 'Total deployed infrastructure',
      color: 'warning',
    });
  }

  // Active Teams KPI
  if (summaryData.Deployed_Teams?.Frt_Teams !== undefined || summaryData.Deployed_Teams?.Patrollers !== undefined) {
    const frtTeams = summaryData.Deployed_Teams?.Frt_Teams ?? 0;
    const patrollers = summaryData.Deployed_Teams?.Patrollers ?? 0;
    kpis.push({
      title: 'Active Teams',
      value: frtTeams + patrollers,
      subtitle: `${patrollers} patrollers and ${frtTeams} FRT teams`,
      color: 'secondary',
    });
  }

  // HDD Status KPI
  if (summaryData.Hdd?.Operational !== undefined && summaryData.Hdd?.Deployed !== undefined) {
    kpis.push({
      title: 'HDD Status',
      value: summaryData.Hdd.Operational,
      subtitle: `${summaryData.Hdd.Operational} operational out of ${summaryData.Hdd.Deployed} deployed`,
      color: 'error',
    });
  }

  return kpis;
};

/**
 * Processes physical survey stages data
 * @param {Object} physicalSurveyData - Physical survey section from summary
 * @returns {Array} Array of stage objects with calculated data
 */
const processPhysicalSurveyStages = (physicalSurveyData, boqData) => {
  const stages = [];
  const totalBlocks = 978;

  // In Progress stage
  if (physicalSurveyData.Submitted !== undefined) {
    const inProgressCount = 978 - physicalSurveyData.Submitted;
    if (inProgressCount > 0) {
      stages.push({
        stage: 'In Progress',
        count: inProgressCount,
        percentage: calculateCompletionRate(inProgressCount, totalBlocks)
      });
    }
  }

  // Completed stage
  if (physicalSurveyData.Approved !== undefined && physicalSurveyData.Approved > 0) {
    stages.push({
      stage: 'Completed',
      count: physicalSurveyData.Approved,
      percentage: calculateCompletionRate(physicalSurveyData.Approved, totalBlocks)
    });
  }

  // BOQ stages
  if (boqData.Submitted !== undefined && boqData.Submitted > 0) {
    stages.push({
      stage: 'BOQ Submitted to IE',
      count: boqData.Submitted,
      percentage: calculateCompletionRate(boqData.Submitted, totalBlocks)
    });
  }

  if (boqData.Approved !== undefined && boqData.Approved > 0) {
    stages.push({
      stage: 'BOQ Recommended by IE',
      count: boqData.Approved,
      percentage: calculateCompletionRate(boqData.Approved, totalBlocks)
    });
  }

  if (boqData.Approved !== undefined && boqData.Approved > 0) {
    stages.push({
      stage: 'BOQ Approved by BSNL',
      count: boqData.Approved,
      percentage: calculateCompletionRate(boqData.Approved, totalBlocks)
    });
  }

  return stages;
};

// =============================================================================
// =============================================================================
// REUSABLE UI COMPONENTS
// =============================================================================

/**
 * Main analytics card wrapper with consistent styling
 */
const MainAnalyticsCard = ({ title, icon, children, color = 'primary', theme }) => (
  <Card
    sx={{
      borderRadius: 4,
      border: `1px solid ${alpha(theme.palette[color].main, 0.15)}`,
      boxShadow: `0 8px 32px ${alpha(theme.palette[color].main, 0.12)}`,
      bgcolor: theme.palette.background.paper,
      height: 'auto',
      width: '100%',
      minWidth: 800,
      maxWidth: 1200,
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: `0 12px 48px ${alpha(theme.palette[color].main, 0.2)}`,
        transform: 'translateY(-2px)',
      },
    }}
  >
    <CardContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          bgcolor: alpha(theme.palette[color].main, 0.05),
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: alpha(theme.palette[color].main, 0.1), color: theme.palette[color].main }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time analytics and performance metrics
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Box sx={{
        p: 2,
        flex: 1,
        width: '100%',
      }}>
        {children}
      </Box>
    </CardContent>
  </Card>
);

/**
 * KPI grid displaying key performance indicators
 */
const KPIGrid = ({ kpis, theme }) => (
  <Grid container spacing={3}>
    {kpis.map((kpi, index) => {
      // Map color strings to theme colors
      const getColorValue = (color) => {
        switch (color) {
          case 'primary': return theme.palette.primary.main;
          case 'success': return theme.palette.success.main;
          case 'warning': return theme.palette.warning.main;
          case 'info': return theme.palette.info.main;
          case 'error': return theme.palette.error.main;
          case 'secondary': return theme.palette.secondary.main;
          default: return theme.palette.primary.main;
        }
      };

      const colorValue = getColorValue(kpi.color);

      return (
        <Grid key={index} item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: alpha(colorValue, 0.08),
              border: `1px solid ${alpha(colorValue, 0.2)}`,
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight={800} sx={{ color: colorValue, mb: 0.5 }}>
              {kpi.value}{kpi.suffix || ''}
            </Typography>
            <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ mb: 0.5 }}>
              {kpi.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {kpi.subtitle}
            </Typography>
          </Box>
        </Grid>
      );
    })}
  </Grid>
);

/**
 * Table component for displaying physical survey performance data
 */
const PhysicalSurveyTable = ({ data, title, totalBlocks, theme }) => (
  <Box>
    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'black !important' }}>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Total GP: {totalBlocks}
    </Typography>
    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, width: '100%' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Stage</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Count</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>% Achieved</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Progress</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index} sx={{ '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) } }}>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{row.stage}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>{row.count}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>{row.percentage}%</TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={row.percentage}
                    sx={{
                      width: 80,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.grey[400], 0.2),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: row.percentage >= 80 ? theme.palette.success.main :
                                 row.percentage >= 60 ? theme.palette.warning.main : theme.palette.error.main,
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

/**
 * Performance table for displaying various process metrics
 */
const PerformanceTable = ({ data, title, theme }) => (
  <Box>
    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'black !important' }}>
      {title}
    </Typography>
    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, width: '100%' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Category</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Total</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Completed</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Submitted to IE</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Approved by IE</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Progress</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index} sx={{ '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) } }}>
              <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{row.category}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>{row.total}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>{row.completed}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>{row.submittedToIE}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>{row.approvedByIE}</TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {row.progress}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={row.progress}
                    sx={{
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.grey[400], 0.2),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: row.progress >= 80 ? theme.palette.success.main :
                                 row.progress >= 60 ? theme.palette.warning.main : theme.palette.error.main,
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

// =============================================================================
// PROCESS STEP ACCORDION COMPONENT
// =============================================================================

/**
 * Accordion component for displaying process step details
 */
const ProcessStepAccordion = ({ step, summaryData, theme }) => {
  // Get step data from summary
  const stepKey = Object.keys(PROCESS_STEP_CONFIGS).find(key => PROCESS_STEP_CONFIGS[key].title === step.title);
  const stepData = stepKey ? summaryData[stepKey] : null;
  console.log('Rendering step:', step.title);

  // Calculate completion rate for chip color

  const completionRate = step.title === 'Physical Survey and BOQ' ? step.approved/978 : step.approved / Math.max(step.submitted, 1);
  const chipColor = completionRate >= 0.8 ? 'success' : completionRate >= 0.6 ? 'warning' : 'error';

  // Render detailed content based on step type
  const renderStepDetails = () => {
    if (!stepData) {
      // Default content for basic steps
      return (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  {step.submitted}
                </Typography>
                <Typography variant="body2" color="text.secondary">Submitted</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: alpha(theme.palette.success.main, 0.08), borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={800} color="success.main">
                  {step.approved}
                </Typography>
                <Typography variant="body2" color="text.secondary">Approved</Typography>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
              <Typography variant="body2" fontWeight={600}>
                {Math.round(completionRate * 100)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionRate * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: alpha(theme.palette.grey[400], 0.2),
                '& .MuiLinearProgress-bar': {
                  bgcolor: theme.palette.success.main,
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        </>
      );
    }

    // Handle Physical Survey specifically
    if (step.title === 'Physical Survey and BOQ') {
      const physicalSurveyStages = [
        { key: 'In_Progress', title: '1. In Progress', color: 'warning' },
        { key: 'Completed', title: '2. Completed', color: 'success' },
        { key: 'BOQ_Submitted_to_IE', title: '3. BOQ Submitted to IE', color: 'primary' },
        { key: 'BOQ_Recommended_by_IE', title: '4. BOQ Recommended by IE', color: 'info' },
        { key: 'BOQ_Approved_by_BSNL', title: '5. BOQ Approved by BSNL', color: 'secondary' }
      ];

      return (
        <Stack spacing={2}>
          {physicalSurveyStages.map((stage, index) => {
            // Calculate values based on the available data
            let value = 0;
            const physicalSurvey = summaryData.Physical_Survey;

            if (stage.key === 'In_Progress' && physicalSurvey?.Submitted !== undefined && physicalSurvey?.Approved !== undefined) {
              value = 978 - physicalSurvey.Submitted;
            } else if (stage.key === 'Completed' && physicalSurvey?.Approved !== undefined) {
              value = physicalSurvey.Submitted;
            } else if (stage.key === 'BOQ_Submitted_to_IE' && summaryData.Boq.Submitted !== undefined) {
              value = summaryData.Boq.Submitted;
            } else if (stage.key === 'BOQ_Recommended_by_IE' && summaryData.Boq.Approved !== undefined) {
              value = summaryData.Boq.Approved;
            } else if (stage.key === 'BOQ_Approved_by_BSNL' && summaryData.Boq.Approved !== undefined) {
              value = summaryData.Boq.Approved;
            }

            return (
              <Box key={index} sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette[stage.color]?.main || theme.palette.primary.main, 0.08),
                border: `1px solid ${alpha(theme.palette[stage.color]?.main || theme.palette.primary.main, 0.2)}`
              }}>
                <Typography variant="body1" sx={{ color: 'black !important' }}>
                  {stage.title}
                </Typography>
                <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                  {value}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      );
    }

    // Dynamic stages based on available data for other processes
    const stages = [];
    let stageIndex = 1;

    // Add stages dynamically based on available data
    Object.keys(stepData).forEach(key => {
      if (typeof stepData[key] === 'number' && stepData[key] > 0) {
        const stageTitle = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        stages.push({
          title: `${stageIndex}. ${stageTitle}`,
          value: stepData[key],
          color: stageIndex === 1 ? 'warning' :
                 stageIndex === 2 ? 'success' :
                 stageIndex === 3 ? 'primary' :
                 stageIndex === 4 ? 'info' : 'secondary'
        });
        stageIndex++;
      }
    });

    return stages.length > 0 ? (
      <Stack spacing={2}>
        {stages.map((stage, index) => (
          <Box key={index} sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette[stage.color]?.main || theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette[stage.color]?.main || theme.palette.primary.main, 0.2)}`
          }}>
            <Typography variant="body1" sx={{ color: 'black !important' }}>
              {stage.title}
            </Typography>
            <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
              {stage.value}
            </Typography>
          </Box>
        ))}
      </Stack>
    ) : (
      // Fallback to default content if no detailed stages
      <>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: 2 }}>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                {step.submitted}
              </Typography>
              <Typography variant="body2" color="text.secondary">Submitted</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: alpha(theme.palette.success.main, 0.08), borderRadius: 2 }}>
              <Typography variant="h5" fontWeight={800} color="success.main">
                {step.approved}
              </Typography>
              <Typography variant="body2" color="text.secondary">Approved</Typography>
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
            <Typography variant="body2" fontWeight={600}>
              {Math.round(completionRate * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionRate * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.grey[400], 0.2),
              '& .MuiLinearProgress-bar': {
                bgcolor: theme.palette.success.main,
                borderRadius: 4,
              },
            }}
          />
        </Box>
      </>
    );
  };

  return (
    <Accordion
      sx={{
        borderRadius: 2,
        '&:before': { display: 'none' },
        '&.Mui-expanded': {
          margin: 0,
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: 'transparent',
          borderRadius: 2,
          py: 1,
          '&:hover': {
            bgcolor: 'transparent',
          },
          '&.Mui-expanded': {
            bgcolor: 'transparent',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Avatar
            sx={{
              bgcolor: alpha(
                theme.palette[step.color]?.main || theme.palette.primary.main,
                0.1
              ),
              color: theme.palette[step.color]?.main || theme.palette.primary.main,
            }}
          >
            {step.icon}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ color: 'black !important' }}
            >
              {step.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {step.approved} {step.title === 'Physical Survey and BOQ' ? 'completed of' : 'approved of'} {step.title === 'Physical Survey and BOQ' ? 978 : step.submitted} {step.title === 'Physical Survey and BOQ' ? 'Target' : 'submitted'}
            </Typography>
          </Box>
          <Chip
            label={`${Math.round(completionRate * 100)}%`}
            color={chipColor}
            size="small"
            sx={{ color: 'black !important' }}
          />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 1 }}>
        {renderStepDetails()}
      </AccordionDetails>
    </Accordion>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AnalyticsDashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data fetching function
  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await summaryService.getComputedSummary();
      const processedSummary = processSummaryData(response);
      setSummary(processedSummary);
    } catch (err) {
      console.error("Error fetching summary analytics:", err);
      setError(err.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, []);

  // Early return for loading state
  if (loading && !summary && !error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "70vh",
            gap: 3,
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <CircularProgress size={80} thickness={3} sx={{ color: 'primary.main' }} />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnalyticsIcon sx={{ fontSize: 20, color: 'primary.main' }} />
            </Box>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
              Loading Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Fetching comprehensive project insights and performance metrics...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // Extract and process summary data
  const summaryData = summary?.summary || {};
  const kpis = generateKPIs(summaryData);
  const processSteps = getProcessSteps(summaryData);
  const networkData = getNetworkData(summaryData, theme);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}` }}>
              <AnalyticsIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="text.primary">
                Welcome to Project Management Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Comprehensive project insights and performance metrics
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={fetchSummaryData}
                disabled={loading}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: 'primary.main',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) },
                }}
              >
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
            <Button size="small" onClick={fetchSummaryData} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        )}
      </Box>

      {/* Loading State */}
      {loading && !summary && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">Loading dashboard...</Typography>
        </Box>
      )}

      {/* Main Content */}
      {summary && !loading && (
        <Stack spacing={3} sx={{ width: '100%', maxWidth: 1200 }}>
          {/* Project Overview */}
          <MainAnalyticsCard title="Project Overview" icon={<AssessmentIcon />} theme={theme}>
            <Stack spacing={2}>
              {/* Key KPIs - dynamically generated based on available data */}
              <KPIGrid kpis={kpis} theme={theme} />
            </Stack>
          </MainAnalyticsCard>

          {/* Survey Analytics */}
          <MainAnalyticsCard title="Survey Analytics" icon={<AssignmentTurnedInIcon />} color="primary" theme={theme}>
            <Stack spacing={3}>
              {/* Desktop Survey Table - dynamically generated */}
              {summaryData.Desktop_Survey && (
                <PerformanceTable
                  title="Desktop Survey Performance"
                  data={[{
                    category: 'Desktop Surveys',
                    total: summaryData.Desktop_Survey.Submitted ?? 0,
                    completed: summaryData.Desktop_Survey.Approved ?? 0,
                    submittedToIE: summaryData.Desktop_Survey.Approved ?? 0,
                    approvedByIE: summaryData.Desktop_Survey.ApprovedByIE ?? 0,
                    progress: calculateCompletionRate(summaryData.Desktop_Survey.Approved ?? 0, summaryData.Desktop_Survey.Submitted ?? 0)
                  }]}
                  theme={theme}
                />
              )}

              {/* Desktop Survey Workflow Statuses - dynamically generated */}
              {summaryData.Desktop_Survey && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'black !important' }}>
                    Desktop Survey Workflow Status
                  </Typography>
                  <Stack spacing={2}>
                    {summaryData.Desktop_Survey.Approved !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>1. Completed</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {Number(summaryData.Desktop_Survey.Approved)}
                        </Typography>
                      </Box>
                    )}
                    {summaryData.Desktop_Survey.SubmittedToIE !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.08), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>2. Submitted to IE</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {Number(summaryData.Desktop_Survey.SubmittedToIE)}
                        </Typography>
                      </Box>
                    )}
                    {summaryData.Desktop_Survey.ApprovedByIE !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>3. Approved by IE</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {Number(summaryData.Desktop_Survey.ApprovedByIE)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}

              {/* Physical Survey Table - dynamically generated */}
              {summaryData.Physical_Survey && (() => {
                const physicalSurveyStages = processPhysicalSurveyStages(summaryData.Physical_Survey, summaryData.Boq);
                const totalBlocks = 978;

                return physicalSurveyStages.length > 0 ? (
                  <PhysicalSurveyTable
                    title="Physical Survey Performance"
                    data={physicalSurveyStages}
                    totalBlocks={totalBlocks}
                    theme={theme}
                  />
                ) : null;
              })()}

            </Stack>
          </MainAnalyticsCard>

          {/* Network Infrastructure */}
          <MainAnalyticsCard title="Network Infrastructure" icon={<RouterIcon />} color="info" theme={theme}>
            <Stack spacing={2}>
              <Grid container spacing={3}>
                {/* GP Routers */}
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.background.default, 0.5),
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'black !important' }}>
                      GP Routers
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: 'black !important' }}>
                      Scope: {summaryData.Gp_Routers?.Scope ?? '978'}
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>Installed:</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {summaryData.Gp_Routers?.Installed ?? 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>Commissioned:</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {summaryData.Gp_Routers?.Commissioned ?? 0}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Grid>

                {/* Block Routers */}
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.background.default, 0.5),
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'black !important' }}>
                      Block Routers
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: 'black !important' }}>
                      Scope: {summaryData.Block_Routers?.Scope ?? '152'}
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>Installed:</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {summaryData.Block_Routers?.Installed ?? 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>Commissioned:</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {summaryData.Block_Routers?.Commissioned ?? 0}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </Stack>
          </MainAnalyticsCard>

          {/* Machineries & Equipment - dynamically generated */}
          {(() => {
            // Check if HDD data exists
            const hasHddData = summaryData.Hdd && (summaryData.Hdd.Deployed !== undefined || summaryData.Hdd.Operational !== undefined);

            return hasHddData ? (
              <MainAnalyticsCard title="Machineries & Equipment" icon={<BuildIcon />} color="warning" theme={theme}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 2 }}>
                      Equipment Status Overview
                    </Typography>
                    <Box sx={{ height: 400, width: '100%', maxWidth: '100%' }}>
                      <BarChart
                        height={400}
                        xAxis={[{ data: ['HDD Machines'], scaleType: 'band' }]}
                        series={[
                          {
                            data: [summaryData.Hdd?.Deployed ?? 0],
                            label: 'Deployed',
                            color: theme.palette.primary.main,
                          },
                          {
                            data: [summaryData.Hdd?.Operational ?? 0],
                            label: 'Operational',
                            color: theme.palette.success.main,
                          },
                        ]}
                        margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                      />
                    </Box>
                  </Box>
                </Stack>
              </MainAnalyticsCard>
            ) : null;
          })()}

          {/* Process Flow and Workflow */}
          <MainAnalyticsCard title="Process Flow and Workflow" icon={<TimelineIcon />} color="warning" theme={theme}>
            <Stack spacing={1}>
              {processSteps.map((step, index) => (
                <ProcessStepAccordion key={index} step={step} summaryData={summaryData} theme={theme} />
              ))}
            </Stack>
          </MainAnalyticsCard>
        </Stack>
      )}
    </Container>
  );
};

export default AnalyticsDashboard;
