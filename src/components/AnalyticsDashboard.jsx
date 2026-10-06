import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Skeleton,
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
import { alpha } from "@mui/material/styles";
import { format } from "date-fns";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import CellTowerOutlinedIcon from "@mui/icons-material/CellTowerOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import TravelExploreOutlinedIcon from "@mui/icons-material/TravelExploreOutlined";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";
import RouterOutlinedIcon from "@mui/icons-material/RouterOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import DesktopWindowsOutlinedIcon from "@mui/icons-material/DesktopWindowsOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import AltRouteOutlinedIcon from "@mui/icons-material/AltRouteOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";

import summaryService from "../services/summaryService.jsx";
import PageHeader from "./common/PageHeader";
import SectionCard from "./common/SectionCard";
import StatTile from "./common/StatTile";
import Meter from "./common/Meter";
import { formatNumber } from "../utils/formatNumber";

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
 *    - GeneratedAt: When the backend computed the summary (shown in the header)
 *
 * 2. Data Processing Pipeline:
 *    - `processSummaryData()`: Normalizes API response structure
 *    - `generateKPIs()`: Extracts and calculates key performance indicators
 *    - `getProcessSteps()`: Processes workflow steps for accordions
 *    - `processPhysicalSurveyStages()`: Handles physical survey stage calculations
 *    - `getPhysicalWorkflowStages()` / `getDynamicStages()`: Stage breakdowns per process
 *
 * 3. Frontend Binding:
 *    - KPI tiles display real-time metrics from backend summary fields
 *    - Tables show processed data with progress meters and completion rates
 *    - Asset cards show infrastructure and equipment deployment against scope
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

// Project targets used until the summary API provides them.
const PHYSICAL_SURVEY_TARGET = 978;
const DEFAULT_TOTAL_BLOCKS = 152;

// Backend field mappings for process steps
// Maps backend data keys to UI display configuration
const PROCESS_STEP_CONFIGS = {
  'Desktop_Survey': {
    title: 'Desktop Survey',
    submittedKey: 'Submitted',
    approvedKey: 'Approved',
    icon: <DesktopWindowsOutlinedIcon />,
  },
  'Physical_Survey': {
    title: 'Physical Survey and BOQ',
    submittedKey: 'Submitted',
    approvedKey: 'Approved',
    icon: <MapOutlinedIcon />,
  },
  'Row': {
    title: 'ROW Status',
    submittedKey: 'Applied',
    approvedKey: 'Approved',
    icon: <AltRouteOutlinedIcon />,
  },
  'Invoice': {
    title: 'Invoice Processing',
    submittedKey: 'Submitted',
    approvedKey: 'Approved',
    icon: <ReceiptLongOutlinedIcon />,
  },
};

const PHYSICAL_SURVEY_STEP_TITLE = PROCESS_STEP_CONFIGS.Physical_Survey.title;

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
    generatedAt: rawData.GeneratedAt || rawData.generatedAt || null,
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
      key,
      submitted: summaryData[key]?.[config.submittedKey] ?? 0,
      approved: summaryData[key]?.[config.approvedKey] ?? 0,
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
      subtitle: `${formatNumber(summaryData.Gps[">= 98%"] ?? 0)} with ≥ 98% availability`,
      icon: <CellTowerOutlinedIcon />,
    });
  }

  // Desktop Survey Approved KPI
  if (summaryData.Desktop_Survey?.Approved !== undefined) {
    const totalBlocks = summaryData.Physical_Survey?.TotalBlocks ?? DEFAULT_TOTAL_BLOCKS;
    kpis.push({
      title: 'Desktop Survey Approved',
      value: Math.round(((summaryData.Desktop_Survey.Approved ?? 0) / totalBlocks) * 100),
      suffix: '%',
      subtitle: `${summaryData.Desktop_Survey.Approved ?? 0} approved out of ${totalBlocks} target`,
      icon: <FactCheckOutlinedIcon />,
    });
  }

  // Physical Survey Completed KPI
  if (summaryData.Physical_Survey?.Approved !== undefined && summaryData.Physical_Survey?.Submitted !== undefined) {
    kpis.push({
      title: 'Physical Survey Completed',
      value: calculateCompletionRate(summaryData.Physical_Survey.Approved, PHYSICAL_SURVEY_TARGET),
      suffix: '%',
      subtitle: `${summaryData.Physical_Survey.Approved} completed out of ${PHYSICAL_SURVEY_TARGET} target`,
      icon: <TravelExploreOutlinedIcon />,
    });
  }

  // BOQ Approved KPI
  if (summaryData.Boq?.Approved !== undefined && summaryData.Boq?.Submitted !== undefined) {
    kpis.push({
      title: 'BOQ Approved',
      value: calculateCompletionRate(summaryData.Boq.Approved, summaryData.Boq.Submitted),
      suffix: '%',
      subtitle: `${summaryData.Boq.Approved} approved out of ${summaryData.Boq.Submitted} submitted`,
      icon: <RequestQuoteOutlinedIcon />,
    });
  }

  // Network Assets Deployed KPI
  const networkAssets = (summaryData.Block_Routers?.Deployed ?? 0) + (summaryData.Gp_Routers?.Deployed ?? 0);
  if (networkAssets > 0) {
    kpis.push({
      title: 'Network Assets Deployed',
      value: networkAssets,
      subtitle: 'Total deployed infrastructure',
      icon: <RouterOutlinedIcon />,
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
      icon: <GroupsOutlinedIcon />,
    });
  }

  // HDD Status KPI
  if (summaryData.Hdd?.Operational !== undefined && summaryData.Hdd?.Deployed !== undefined) {
    kpis.push({
      title: 'HDD Status',
      value: summaryData.Hdd.Operational,
      subtitle: `${summaryData.Hdd.Operational} operational out of ${summaryData.Hdd.Deployed} deployed`,
      icon: <ConstructionOutlinedIcon />,
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
  const totalBlocks = PHYSICAL_SURVEY_TARGET;

  // In Progress stage
  if (physicalSurveyData.Submitted !== undefined) {
    const inProgressCount = PHYSICAL_SURVEY_TARGET - physicalSurveyData.Submitted;
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

/**
 * Stage breakdown shown when the Physical Survey process step is expanded
 */
const getPhysicalWorkflowStages = (summaryData) => {
  const physicalSurvey = summaryData.Physical_Survey;
  const boq = summaryData.Boq ?? {};

  return [
    {
      label: 'In Progress',
      value: physicalSurvey?.Submitted !== undefined && physicalSurvey?.Approved !== undefined
        ? PHYSICAL_SURVEY_TARGET - physicalSurvey.Submitted
        : 0,
    },
    { label: 'Completed', value: physicalSurvey?.Approved !== undefined ? physicalSurvey.Submitted : 0 },
    { label: 'BOQ Submitted to IE', value: boq.Submitted ?? 0 },
    { label: 'BOQ Recommended by IE', value: boq.Approved ?? 0 },
    { label: 'BOQ Approved by BSNL', value: boq.Approved ?? 0 },
  ];
};

/**
 * Turns an API key into a sentence-case label, keeping acronyms:
 * "SubmittedToIE" -> "Submitted to IE", "Frt_Teams" -> "Frt teams"
 */
const humanizeKey = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map((word, index) => (index > 0 && /^[A-Z][a-z]+$/.test(word) ? word.toLowerCase() : word))
    .join(' ')
    .replace(/^./, (str) => str.toUpperCase());

/**
 * Stage breakdown for other processes: every positive numeric field, in API order
 */
const getDynamicStages = (stepData) =>
  Object.keys(stepData)
    .filter((key) => typeof stepData[key] === 'number' && stepData[key] > 0)
    .map((key) => ({ label: humanizeKey(key), value: stepData[key] }));

// =============================================================================
// REUSABLE UI COMPONENTS
// =============================================================================

const tabularNums = { fontVariantNumeric: 'tabular-nums' };

const SectionLabel = ({ children }) => (
  <Typography variant="overline" component="h2" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
    {children}
  </Typography>
);

const autoGrid = (minWidth) => ({
  display: 'grid',
  gap: 2,
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`,
});

// KPI columns chosen from the tile count so rows stay balanced (5 -> one row, 6 -> 3+3, 7 -> 4+3).
const kpiGrid = (count) => ({
  display: 'grid',
  gap: 2,
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, 1fr)',
    md: `repeat(${Math.min(count, 3)}, 1fr)`,
    lg: `repeat(${count <= 5 ? count : count === 6 ? 3 : 4}, 1fr)`,
  },
});

/**
 * Row of label/value pairs separated by hairlines
 */
const MetricStrip = ({ items }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: `repeat(${items.length}, 1fr)` },
      gap: '1px',
      bgcolor: 'divider',
      border: 1,
      borderColor: 'divider',
      borderRadius: 1.5,
      overflow: 'hidden',
    }}
  >
    {items.map((item) => (
      <Box key={item.label} sx={{ bgcolor: 'background.paper', px: 2, py: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {item.label}
        </Typography>
        <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3 }}>
          {formatNumber(item.value)}
        </Typography>
      </Box>
    ))}
  </Box>
);

/**
 * Labelled completion meter
 */
const ProgressRow = ({ label, value }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, ...tabularNums }}>{value}%</Typography>
    </Box>
    <Meter value={value} aria-label={`${label}: ${value}%`} />
  </Box>
);

/**
 * Numbered list of workflow stages with their counts
 */
const StageList = ({ stages }) => (
  <Box
    component="ol"
    sx={{ listStyle: 'none', m: 0, p: 0, border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}
  >
    {stages.map((stage, index) => (
      <Box
        component="li"
        key={index}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          '& + &': { borderTop: 1, borderColor: 'divider' },
        }}
      >
        <Box
          sx={{
            width: 22,
            height: 22,
            flexShrink: 0,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          }}
        >
          {index + 1}
        </Box>
        <Typography variant="body2" sx={{ flex: 1 }}>{stage.label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, ...tabularNums }}>{formatNumber(stage.value)}</Typography>
      </Box>
    ))}
  </Box>
);

const EmptyNote = ({ children }) => (
  <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
    {children}
  </Typography>
);

/**
 * Desktop survey totals, completion and IE workflow status
 */
const DesktopSurveyPanel = ({ desktopSurvey }) => {
  const total = desktopSurvey.Submitted ?? 0;
  const completed = desktopSurvey.Approved ?? 0;
  const workflow = [
    desktopSurvey.Approved !== undefined && { label: 'Completed', value: Number(desktopSurvey.Approved) },
    desktopSurvey.SubmittedToIE !== undefined && { label: 'Submitted to IE', value: Number(desktopSurvey.SubmittedToIE) },
    desktopSurvey.ApprovedByIE !== undefined && { label: 'Approved by IE', value: Number(desktopSurvey.ApprovedByIE) },
  ].filter(Boolean);

  return (
    <SectionCard title="Desktop survey" subtitle="Submissions and IE review" icon={<DesktopWindowsOutlinedIcon />}>
      <Stack spacing={2.5}>
        <MetricStrip
          items={[
            { label: 'Total', value: total },
            { label: 'Completed', value: completed },
            { label: 'Submitted to IE', value: desktopSurvey.Approved ?? 0 },
            { label: 'Approved by IE', value: desktopSurvey.ApprovedByIE ?? 0 },
          ]}
        />
        <ProgressRow label="Completion rate" value={calculateCompletionRate(completed, total)} />
        {workflow.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Workflow status</Typography>
            <StageList stages={workflow} />
          </Box>
        )}
      </Stack>
    </SectionCard>
  );
};

/**
 * Physical survey and BOQ stages against the GP target
 */
const PhysicalSurveyPanel = ({ stages }) => (
  <SectionCard
    title="Physical survey & BOQ"
    subtitle={`Total GP: ${formatNumber(PHYSICAL_SURVEY_TARGET)}`}
    icon={<MapOutlinedIcon />}
    contentSx={{ p: 0 }}
  >
    {stages.length > 0 ? (
      <TableContainer>
        <Table sx={{ '& tbody tr:last-of-type td': { borderBottom: 0 } }}>
          <TableHead>
            <TableRow>
              <TableCell>Stage</TableCell>
              <TableCell align="right">Count</TableCell>
              <TableCell align="right">% achieved</TableCell>
              <TableCell sx={{ width: '30%', display: { xs: 'none', sm: 'table-cell' } }}>Progress</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stages.map((row) => (
              <TableRow key={row.stage} hover>
                <TableCell sx={{ fontWeight: 500 }}>{row.stage}</TableCell>
                <TableCell align="right" sx={tabularNums}>{formatNumber(row.count)}</TableCell>
                <TableCell align="right" sx={tabularNums}>{row.percentage}%</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  <Meter value={row.percentage} aria-label={`${row.stage}: ${row.percentage}%`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      <EmptyNote>No physical survey activity reported yet.</EmptyNote>
    )}
  </SectionCard>
);

/**
 * Asset deployment card; rows with a `total` also show a meter against it
 */
const AssetCard = ({ title, icon, scope, rows }) => (
  <SectionCard
    title={title}
    icon={icon}
    action={scope !== undefined && <Chip size="small" variant="outlined" label={`Scope ${formatNumber(scope)}`} />}
  >
    <Stack spacing={2}>
      {rows.map((row) => {
        const total = Number(row.total);
        return (
          <Box key={row.label}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: total > 0 ? 0.75 : 0 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{row.label}</Typography>
              <Typography variant="body2" sx={{ ...tabularNums }}>
                {row.note ? (
                  <Box component="span" sx={{ color: 'text.secondary' }}>{row.note}</Box>
                ) : (
                  <Box component="span" sx={{ fontWeight: 600, fontSize: '1rem' }}>{formatNumber(row.value)}</Box>
                )}
                {total > 0 && (
                  <Box component="span" sx={{ color: 'text.secondary' }}> / {formatNumber(total)}</Box>
                )}
              </Typography>
            </Box>
            {total > 0 && (
              <Meter value={(row.value / total) * 100} aria-label={`${title} ${row.label}: ${row.value} of ${total}`} />
            )}
          </Box>
        );
      })}
    </Stack>
  </SectionCard>
);

// =============================================================================
// PROCESS STEP ACCORDION COMPONENT
// =============================================================================

/**
 * Expandable row for one process step, with its stage breakdown
 */
const ProcessStepAccordion = ({ step, summaryData }) => {
  const stepData = summaryData[step.key];
  const isPhysicalSurvey = step.title === PHYSICAL_SURVEY_STEP_TITLE;

  const completionRate = isPhysicalSurvey
    ? step.approved / PHYSICAL_SURVEY_TARGET
    : step.approved / Math.max(step.submitted, 1);
  const completionPercent = Math.round(completionRate * 100);

  const renderSubmittedApproved = () => (
    <Stack spacing={2}>
      <MetricStrip
        items={[
          { label: 'Submitted', value: step.submitted },
          { label: 'Approved', value: step.approved },
        ]}
      />
      <ProgressRow label="Completion rate" value={completionPercent} />
    </Stack>
  );

  const renderStepDetails = () => {
    if (!stepData) return renderSubmittedApproved();
    if (isPhysicalSurvey) return <StageList stages={getPhysicalWorkflowStages(summaryData)} />;

    const stages = getDynamicStages(stepData);
    return stages.length > 0 ? <StageList stages={stages} /> : renderSubmittedApproved();
  };

  return (
    <Accordion
      disableGutters
      elevation={0}
      square
      sx={{
        bgcolor: 'transparent',
        '&::before': { display: 'none' },
        '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ px: 2.5, py: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              '& svg': { fontSize: 20 },
            }}
          >
            {step.icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{step.title}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {isPhysicalSurvey
                ? `${formatNumber(step.approved)} completed of ${formatNumber(PHYSICAL_SURVEY_TARGET)} target`
                : `${formatNumber(step.approved)} approved of ${formatNumber(step.submitted)} submitted`}
            </Typography>
          </Box>
          <Meter
            value={completionPercent}
            aria-label={`${step.title}: ${completionPercent}%`}
            sx={{ width: 160, display: { xs: 'none', sm: 'block' } }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 44, textAlign: 'right', ...tabularNums }}>
            {completionPercent}%
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0.5, pl: { sm: 9 } }}>
        {renderStepDetails()}
      </AccordionDetails>
    </Accordion>
  );
};

const DashboardSkeleton = () => (
  <Stack spacing={3}>
    <Box sx={autoGrid(220)}>
      {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} variant="rounded" height={132} />)}
    </Box>
    <Box sx={autoGrid(420)}>
      <Skeleton variant="rounded" height={320} />
      <Skeleton variant="rounded" height={320} />
    </Box>
  </Stack>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AnalyticsDashboard = () => {
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

  // Extract and process summary data
  const summaryData = summary?.summary || {};
  const kpis = generateKPIs(summaryData);
  const processSteps = getProcessSteps(summaryData);
  const physicalSurveyStages = summaryData.Physical_Survey
    ? processPhysicalSurveyStages(summaryData.Physical_Survey, summaryData.Boq ?? {})
    : [];
  const hasHddData = summaryData.Hdd && (summaryData.Hdd.Deployed !== undefined || summaryData.Hdd.Operational !== undefined);

  const generatedAt = summary?.generatedAt ? new Date(summary.generatedAt) : null;
  const stateName = typeof summaryData.State === 'string' ? summaryData.State : null;

  return (
    <Box>
      <PageHeader
        title="Project Dashboard"
        subtitle={[stateName, 'Rollout progress across surveys, infrastructure, field teams and workflows']
          .filter(Boolean)
          .join(' · ')}
        actions={
          <>
            {generatedAt && !Number.isNaN(generatedAt.getTime()) && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Data as of {format(generatedAt, 'd MMM yyyy, h:mm a')}
              </Typography>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={fetchSummaryData}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
            >
              Refresh
            </Button>
          </>
        }
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchSummaryData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading && !summary && <DashboardSkeleton />}

      {/* Keep the previous data on screen, dimmed, while refreshing */}
      {summary && (
        <Stack
          spacing={3}
          aria-busy={loading}
          sx={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s ease' }}
        >
          {kpis.length > 0 && (
            <Box component="section">
              <SectionLabel>Key metrics</SectionLabel>
              <Box sx={kpiGrid(kpis.length)}>
                {kpis.map((kpi) => (
                  <StatTile
                    key={kpi.title}
                    label={kpi.title}
                    value={kpi.value}
                    suffix={kpi.suffix}
                    caption={kpi.subtitle}
                    icon={kpi.icon}
                    meterValue={kpi.suffix === '%' ? kpi.value : undefined}
                  />
                ))}
              </Box>
            </Box>
          )}

          {(summaryData.Desktop_Survey || summaryData.Physical_Survey) && (
            <Box component="section">
              <SectionLabel>Surveys</SectionLabel>
              <Box sx={autoGrid(420)}>
                {summaryData.Desktop_Survey && <DesktopSurveyPanel desktopSurvey={summaryData.Desktop_Survey} />}
                {summaryData.Physical_Survey && <PhysicalSurveyPanel stages={physicalSurveyStages} />}
              </Box>
            </Box>
          )}

          <Box component="section">
            <SectionLabel>Infrastructure &amp; equipment</SectionLabel>
            <Box sx={autoGrid(280)}>
              <AssetCard
                title="GP routers"
                icon={<RouterOutlinedIcon />}
                scope={summaryData.Gp_Routers?.Scope ?? PHYSICAL_SURVEY_TARGET}
                rows={[
                  { label: 'Installed', value: summaryData.Gp_Routers?.Installed ?? 0, total: summaryData.Gp_Routers?.Scope ?? PHYSICAL_SURVEY_TARGET },
                  { label: 'Commissioned', value: summaryData.Gp_Routers?.Commissioned ?? 0, total: summaryData.Gp_Routers?.Scope ?? PHYSICAL_SURVEY_TARGET },
                ]}
              />
              <AssetCard
                title="Block routers"
                icon={<HubOutlinedIcon />}
                scope={summaryData.Block_Routers?.Scope ?? DEFAULT_TOTAL_BLOCKS}
                rows={[
                  { label: 'Installed', value: summaryData.Block_Routers?.Installed ?? 0, total: summaryData.Block_Routers?.Scope ?? DEFAULT_TOTAL_BLOCKS },
                  { label: 'Commissioned', value: summaryData.Block_Routers?.Commissioned ?? 0, total: summaryData.Block_Routers?.Scope ?? DEFAULT_TOTAL_BLOCKS },
                ]}
              />
              {hasHddData && (
                <AssetCard
                  title="HDD machines"
                  icon={<ConstructionOutlinedIcon />}
                  rows={[
                    { label: 'Deployed', value: summaryData.Hdd.Deployed ?? 0 },
                    summaryData.Hdd.Operational !== undefined
                      ? { label: 'Operational', value: summaryData.Hdd.Operational, total: summaryData.Hdd.Deployed }
                      : { label: 'Operational', note: 'Not reported' },
                  ]}
                />
              )}
            </Box>
          </Box>

          <Box component="section">
            <SectionLabel>Workflow</SectionLabel>
            <SectionCard
              title="Process flow and workflow"
              subtitle="Approval progress for each project process — expand a row for its stage breakdown"
              icon={<AccountTreeOutlinedIcon />}
              contentSx={{ p: 0 }}
            >
              {processSteps.length > 0 ? (
                processSteps.map((step) => (
                  <ProcessStepAccordion key={step.key} step={step} summaryData={summaryData} />
                ))
              ) : (
                <EmptyNote>No process data reported yet.</EmptyNote>
              )}
            </SectionCard>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;
