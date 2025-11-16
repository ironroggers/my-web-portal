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
import { PieChart, BarChart, LineChart } from "@mui/x-charts";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import AssessmentIcon from "@mui/icons-material/Assessment";
import RefreshIcon from "@mui/icons-material/Refresh";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import MapIcon from "@mui/icons-material/Map";
import RouterIcon from "@mui/icons-material/Router";
import LanIcon from "@mui/icons-material/Lan";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TimelineIcon from "@mui/icons-material/Timeline";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import BuildIcon from "@mui/icons-material/Build";

import summaryService from "../services/summaryService.jsx";
import { useAuth } from "../context/AuthContext";


const AnalyticsDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await summaryService.getComputedSummary();
      const summaryPayload = response.Summary || response.summary || {};
      const dataPayload = response.Data || response.data || {};

      setSummary({
        summary: summaryPayload,
        data: dataPayload,
      });
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

  // Data processing and calculations
  const s = summary?.summary || {};

  const calculateCompletionRate = (approved, submitted) => {
    return submitted > 0 ? Math.round((approved / submitted) * 100) : 0;
  };

  // Configuration mapping for process steps - defined at component level for reuse
  const processStepConfigs = {
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

  // Dynamic configuration for process steps based on available summary data
  const getProcessStepsConfig = () => {
    // Only return configs for sections that exist in the summary data
    return Object.entries(processStepConfigs)
      .filter(([key]) => s[key])
      .map(([key, config]) => ({
        ...config,
        submitted: s[key]?.[config.submittedKey] ?? 0,
        approved: s[key]?.[config.approvedKey] ?? 0,
      }));
  };

  const processSteps = getProcessStepsConfig();

  // Dynamic network infrastructure data based on available keys
  const getNetworkData = () => {
    const networkConfigs = {
      'Hdd': { name: 'HDD Machines', valueKey: 'Deployed', color: theme.palette.primary.main },
      'Block_Routers': { name: 'Block Routers', valueKey: 'Deployed', color: theme.palette.success.main },
      'Gp_Routers': { name: 'GP Routers', valueKey: 'Deployed', color: theme.palette.warning.main },
      'Snoc': { name: 'SNOC Visibility', valueKey: 'Deployed', color: theme.palette.info.main },
    };

    return Object.entries(networkConfigs)
      .filter(([key]) => s[key]?.[networkConfigs[key].valueKey] > 0)
      .map(([key, config]) => ({
        name: config.name,
        value: s[key][config.valueKey] ?? 0,
        color: config.color,
      }));
  };

  const networkData = getNetworkData();

  // Main consolidated card component
  const MainAnalyticsCard = ({ title, icon, children, color = 'primary' }) => (
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

  // KPI Grid Component
  const KPIGrid = ({ kpis }) => (
    <Grid container spacing={3}>
      {kpis.map((kpi, index) => (
        <Grid key={index} item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: alpha(kpi.color === 'primary' ? theme.palette.primary.main :
                           kpi.color === 'success' ? theme.palette.success.main :
                           kpi.color === 'warning' ? theme.palette.warning.main :
                           theme.palette.info.main, 0.08),
              border: `1px solid ${alpha(kpi.color === 'primary' ? theme.palette.primary.main :
                                       kpi.color === 'success' ? theme.palette.success.main :
                                       kpi.color === 'warning' ? theme.palette.warning.main :
                                       theme.palette.info.main, 0.2)}`,
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight={800} color={`${kpi.color}.main`} sx={{ mb: 0.5 }}>
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
      ))}
    </Grid>
  );

  // Physical Survey Table Component
  const PhysicalSurveyTable = ({ data, title, totalBlocks }) => (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: 'black !important' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total Blocks: {totalBlocks}
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

  // Performance Table Component
  const PerformanceTable = ({ data, title }) => (
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
          <MainAnalyticsCard title="Project Overview" icon={<AssessmentIcon />}>
            <Stack spacing={2}>
              {/* Key KPIs - dynamically generated based on available data */}
              <KPIGrid kpis={(() => {
                const kpis = [];

                // GPS Operational KPI
                if (s.Gps?.Operational !== undefined) {
                  kpis.push({
                    title: 'GPs Operational',
                    value: s.Gps.Operational,
                    subtitle: `${s.Gps[">= 98%"] ?? 0} with >= 98% availability`,
                    color: 'success',
                  });
                }

                // Desktop Survey Approved KPI
                if (s.Desktop_Survey?.Approved !== undefined) {
                  const totalBlocks = s.Physical_Survey?.TotalBlocks ?? 152; // Use dynamic total or fallback
                  kpis.push({
                    title: 'Desktop Survey Approved',
                    value: Math.round(((s.Desktop_Survey.Approved ?? 0) / totalBlocks) * 100),
                    suffix: '%',
                    subtitle: `${s.Desktop_Survey.Approved ?? 0} approved out of ${totalBlocks} target`,
                    color: 'primary',
                  });
                }

                // Physical Survey Completed KPI
                if (s.Physical_Survey?.Approved !== undefined && s.Physical_Survey?.Submitted !== undefined) {
                  kpis.push({
                    title: 'Physical Survey Completed',
                    value: calculateCompletionRate(s.Physical_Survey.Approved, s.Physical_Survey.Submitted),
                    suffix: '%',
                    subtitle: `${s.Physical_Survey.Approved} completed out of ${s.Physical_Survey.Submitted} submitted`,
                    color: 'success',
                  });
                }

                // BOQ Approved KPI
                if (s.Boq?.Approved !== undefined && s.Boq?.Submitted !== undefined) {
                  kpis.push({
                    title: 'BOQ Approved',
                    value: calculateCompletionRate(s.Boq.Approved, s.Boq.Submitted),
                    suffix: '%',
                    subtitle: `${s.Boq.Approved} approved out of ${s.Boq.Submitted} submitted`,
                    color: 'info',
                  });
                }

                // Network Assets Deployed KPI
                const networkAssets = (s.Block_Routers?.Deployed ?? 0) + (s.Gp_Routers?.Deployed ?? 0);
                if (networkAssets > 0) {
                  kpis.push({
                    title: 'Network Assets Deployed',
                    value: networkAssets,
                    subtitle: 'Total deployed infrastructure',
                    color: 'warning',
                  });
                }

                // Active Teams KPI
                if (s.Deployed_Teams?.Frt_Teams !== undefined || s.Deployed_Teams?.Patrollers !== undefined) {
                  const frtTeams = s.Deployed_Teams?.Frt_Teams ?? 0;
                  const patrollers = s.Deployed_Teams?.Patrollers ?? 0;
                  kpis.push({
                    title: 'Active Teams',
                    value: frtTeams + patrollers,
                    subtitle: `${patrollers} patrollers and ${frtTeams} FRT teams`,
                    color: 'secondary',
                  });
                }

                // HDD Status KPI
                if (s.Hdd?.Operational !== undefined && s.Hdd?.Deployed !== undefined) {
                  kpis.push({
                    title: 'HDD Status',
                    value: s.Hdd.Operational,
                    subtitle: `${s.Hdd.Operational} operational out of ${s.Hdd.Deployed} deployed`,
                    color: 'error',
                  });
                }

                return kpis;
              })()} />

            </Stack>
          </MainAnalyticsCard>

          {/* Survey Analytics */}
          <MainAnalyticsCard title="Survey Analytics" icon={<AssignmentTurnedInIcon />} color="primary">
            <Stack spacing={3}>
              {/* Desktop Survey Table - dynamically generated */}
              {s.Desktop_Survey && (
                <PerformanceTable
                  title="Desktop Survey Performance"
                  data={[{
                    category: 'Desktop Surveys',
                    total: s.Desktop_Survey.Submitted ?? 0,
                    completed: s.Desktop_Survey.Approved ?? 0,
                    submittedToIE: s.Desktop_Survey.SubmittedToIE ?? 0,
                    approvedByIE: s.Desktop_Survey.ApprovedByIE ?? 0,
                    progress: calculateCompletionRate(s.Desktop_Survey.ApprovedByIE ?? 0, s.Desktop_Survey.Submitted ?? 0)
                  }]}
                />
              )}

              {/* Desktop Survey Workflow Statuses - dynamically generated */}
              {s.Desktop_Survey && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'black !important' }}>
                    Desktop Survey Workflow Status
                  </Typography>
                  <Stack spacing={2}>
                    {s.Desktop_Survey.Approved !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>1. Completed</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {Number(s.Desktop_Survey.Approved)}
                        </Typography>
                      </Box>
                    )}
                    {s.Desktop_Survey.SubmittedToIE !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.08), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>2. Submitted to IE</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {Number(s.Desktop_Survey.SubmittedToIE)}
                        </Typography>
                      </Box>
                    )}
                    {s.Desktop_Survey.ApprovedByIE !== undefined && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>3. Approved by IE</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {Number(s.Desktop_Survey.ApprovedByIE)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}

              {/* Physical Survey Table - dynamically generated */}
              {s.Physical_Survey && (() => {
                const totalBlocks = s.Physical_Survey.TotalBlocks ?? s.Physical_Survey.Submitted ?? 0;
                const physicalSurveyStages = [];

                // In Progress stage
                if (s.Physical_Survey.Submitted !== undefined && s.Physical_Survey.Approved !== undefined) {
                  const inProgressCount = s.Physical_Survey.Submitted - s.Physical_Survey.Approved;
                  if (inProgressCount > 0) {
                    physicalSurveyStages.push({
                      stage: 'In Progress',
                      count: inProgressCount,
                      percentage: calculateCompletionRate(inProgressCount, totalBlocks)
                    });
                  }
                }

                // Completed stage
                if (s.Physical_Survey.Approved !== undefined && s.Physical_Survey.Approved > 0) {
                  physicalSurveyStages.push({
                    stage: 'Completed',
                    count: s.Physical_Survey.Approved,
                    percentage: calculateCompletionRate(s.Physical_Survey.Approved, totalBlocks)
                  });
                }

                // BOQ stages - dynamically include only if data exists
                if (s.Physical_Survey.BOQSubmittedToIE !== undefined && s.Physical_Survey.BOQSubmittedToIE > 0) {
                  physicalSurveyStages.push({
                    stage: 'BOQ Submitted to IE',
                    count: s.Physical_Survey.BOQSubmittedToIE,
                    percentage: calculateCompletionRate(s.Physical_Survey.BOQSubmittedToIE, totalBlocks)
                  });
                }

                if (s.Physical_Survey.BOQRecommendedByIE !== undefined && s.Physical_Survey.BOQRecommendedByIE > 0) {
                  physicalSurveyStages.push({
                    stage: 'BOQ Recommended by IE',
                    count: s.Physical_Survey.BOQRecommendedByIE,
                    percentage: calculateCompletionRate(s.Physical_Survey.BOQRecommendedByIE, totalBlocks)
                  });
                }

                if (s.Physical_Survey.BOQApprovedByBSNL !== undefined && s.Physical_Survey.BOQApprovedByBSNL > 0) {
                  physicalSurveyStages.push({
                    stage: 'BOQ Approved by BSNL',
                    count: s.Physical_Survey.BOQApprovedByBSNL,
                    percentage: calculateCompletionRate(s.Physical_Survey.BOQApprovedByBSNL, totalBlocks)
                  });
                }

                return physicalSurveyStages.length > 0 ? (
                  <PhysicalSurveyTable
                    title="Physical Survey Performance"
                    data={physicalSurveyStages}
                    totalBlocks={totalBlocks}
                  />
                ) : null;
              })()}

            </Stack>
          </MainAnalyticsCard>

          {/* Network Infrastructure */}
          <MainAnalyticsCard title="Network Infrastructure" icon={<RouterIcon />} color="info">
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
                      Scope: {s.Gp_Routers?.Scope ?? '978'}
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>Installed:</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {s.Gp_Routers?.Installed ?? 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>Commissioned:</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {s.Gp_Routers?.Commissioned ?? 0}
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
                      Scope: {s.Block_Routers?.Scope ?? '152'}
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>Installed:</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {s.Block_Routers?.Installed ?? 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ color: 'black !important' }}>Commissioned:</Typography>
                        <Typography variant="h6" fontWeight={600} sx={{ color: 'black !important' }}>
                          {s.Block_Routers?.Commissioned ?? 0}
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
            const hasHddData = s.Hdd && (s.Hdd.Deployed !== undefined || s.Hdd.Operational !== undefined);

            return hasHddData ? (
              <MainAnalyticsCard title="Machineries & Equipment" icon={<BuildIcon />} color="warning">
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
                            data: [s.Hdd?.Deployed ?? 0],
                            label: 'Deployed',
                            color: theme.palette.primary.main,
                          },
                          {
                            data: [s.Hdd?.Operational ?? 0],
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

          {/* Physical Survey & BOQ */}
          <MainAnalyticsCard title="Process Flow and Workflow" icon={<TimelineIcon />} color="warning">
            <Stack spacing={1}>
              {processSteps.map((step, index) => (
                <Accordion
                  key={index}
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
                          {step.approved} approved of {step.submitted} submitted
                        </Typography>
                      </Box>
                      <Chip
                        label={`${Math.round(
                          (step.approved / Math.max(step.submitted, 1)) * 100
                        )}%`}
                        color={
                          step.approved / Math.max(step.submitted, 1) >= 0.8
                            ? 'success'
                            : step.approved / Math.max(step.submitted, 1) >= 0.6
                            ? 'warning'
                            : 'error'
                        }
                        size="small"
                        sx={{ color: 'black !important' }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 1 }}>
                    {(() => {
                      // Dynamic content based on the step data key and available fields
                      const stepKey = Object.keys(processStepConfigs).find(key => processStepConfigs[key].title === step.title);
                      const stepData = stepKey ? s[stepKey] : null;

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
                                  {Math.round((step.approved / Math.max(step.submitted, 1)) * 100)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={(step.approved / Math.max(step.submitted, 1)) * 100}
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
                              if (stage.key === 'In_Progress' && s.Physical_Survey?.Submitted !== undefined && s.Physical_Survey?.Approved !== undefined) {
                                value = s.Physical_Survey.Submitted - s.Physical_Survey.Approved;
                              } else if (stage.key === 'Completed' && s.Physical_Survey?.Approved !== undefined) {
                                value = s.Physical_Survey.Approved;
                              } else if (stage.key === 'BOQ_Submitted_to_IE' && s.Physical_Survey?.BOQSubmittedToIE !== undefined) {
                                value = s.Physical_Survey.BOQSubmittedToIE;
                              } else if (stage.key === 'BOQ_Recommended_by_IE' && s.Physical_Survey?.BOQRecommendedByIE !== undefined) {
                                value = s.Physical_Survey.BOQRecommendedByIE;
                              } else if (stage.key === 'BOQ_Approved_by_BSNL' && s.Physical_Survey?.BOQApprovedByBSNL !== undefined) {
                                value = s.Physical_Survey.BOQApprovedByBSNL;
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

                      // Dynamic stages based on available data in the step for other processes
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
                                {Math.round((step.approved / Math.max(step.submitted, 1)) * 100)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={(step.approved / Math.max(step.submitted, 1)) * 100}
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
                    })()}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </MainAnalyticsCard>
        </Stack>
      )}
    </Container>
  );
};

export default AnalyticsDashboard;
