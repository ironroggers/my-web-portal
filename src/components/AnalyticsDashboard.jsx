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

  // Process Flow Data
  const processSteps = [
    {
      title: 'Desktop Survey',
      submitted: s.Desktop_Survey?.Submitted ?? 0,
      approved: s.Desktop_Survey?.Approved ?? 0,
      icon: <DesktopWindowsIcon />,
      color: 'primary',
    },
    {
      title: 'Physical Survey',
      submitted: s.Physical_Survey?.Submitted ?? 0,
      approved: s.Physical_Survey?.Approved ?? 0,
      icon: <MapIcon />,
      color: 'success',
    },
    {
      title: 'ROW Application',
      submitted: s.Row?.Applied ?? 0,
      approved: s.Row?.Approved ?? 0,
      icon: <ReceiptLongIcon />,
      color: 'warning',
    },
    {
      title: 'BOQ Preparation',
      submitted: s.Boq?.Submitted ?? 0,
      approved: s.Boq?.Approved ?? 0,
      icon: <AssignmentTurnedInIcon />,
      color: 'info',
    },
    {
      title: 'Invoice Processing',
      submitted: s.Invoice?.Submitted ?? 0,
      approved: s.Invoice?.Approved ?? 0,
      icon: <ReceiptLongIcon />,
      color: 'secondary',
    },
  ];

  // Network Infrastructure Data
  const networkData = [
    { name: 'HDD Machines', value: s.Hdd?.Deployed ?? 0, color: theme.palette.primary.main },
    { name: 'Block Routers', value: s.Block_Routers?.Deployed ?? 0, color: theme.palette.success.main },
    { name: 'GP Routers', value: s.Gp_Routers?.Deployed ?? 0, color: theme.palette.warning.main },
    { name: 'SNOC Visibility', value: s.Snoc?.Deployed ?? 0, color: theme.palette.info.main },
  ].filter(item => item.value > 0);

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

  // Performance Table Component
  const PerformanceTable = ({ data, title }) => (
    <Box>
      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, width: '100%' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Category</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Total</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Completed</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>Progress</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index} sx={{ '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) } }}>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{row.category}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>{row.total}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>{row.completed}</TableCell>
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
              {/* Key KPIs */}
              <KPIGrid kpis={[
                {
                  title: 'GPs Operational',
                  value: s.Gps?.Operational ?? 0,
                  subtitle: `${s.Gps?.[">= 98%"] ?? 0} with >= 98% availability`,
                  color: 'success',
                },
                {
                  title: 'Survey Completion',
                  value: calculateCompletionRate(
                    (s.Desktop_Survey?.Approved ?? 0) + (s.Physical_Survey?.Approved ?? 0),
                    (s.Desktop_Survey?.Submitted ?? 0) + (s.Physical_Survey?.Submitted ?? 0)
                  ),
                  suffix: '%',
                  subtitle: 'Overall survey progress',
                  color: 'primary',
                },
                {
                  title: 'Network Assets Deployed',
                  value:  (s.Block_Routers?.Deployed ?? 0) + (s.Gp_Routers?.Deployed ?? 0),
                  subtitle: 'Total deployed infrastructure',
                  color: 'info',
                },
                {
                  title: 'Active Teams',
                  value: s.Deployed_Teams?.Frt_Teams + s.Deployed_Teams?.Patrollers ?? 0,
                  subtitle: `${s.Deployed_Teams?.Patrollers ?? 0} patrollers and ${s.Deployed_Teams?.Frt_Teams ?? 0} FRT teams`,
                  color: 'secondary',
                },
              ]} />

              {/* Charts Row */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
                      Survey Progress
                    </Typography>
                    <BarChart
                      height={180}
                      xAxis={[{ data: ['Desktop', 'Physical'], scaleType: 'band' }]}
                      series={[
                        { data: [s.Desktop_Survey?.Submitted ?? 0, s.Physical_Survey?.Submitted ?? 0], label: 'Submitted', color: theme.palette.primary.main },
                        { data: [s.Desktop_Survey?.Approved ?? 0, s.Physical_Survey?.Approved ?? 0], label: 'Approved', color: theme.palette.success.main },
                      ]}
                      margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
                      Network Infrastructure
                    </Typography>
                    <BarChart
                      height={180}
                      xAxis={[{ data: ['HDD', 'Block Routers', 'GP Routers', 'SNOC'], scaleType: 'band' }]}
                      series={[{
                        data: [
                          s.Hdd?.Deployed ?? 0,
                          s.Block_Routers?.Deployed ?? 0,
                          s.Gp_Routers?.Deployed ?? 0,
                          s.Snoc?.Deployed ?? 0,
                        ],
                        color: theme.palette.info.main,
                      }]}
                      margin={{ left: 60, right: 20, top: 10, bottom: 40 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Stack>
          </MainAnalyticsCard>

          {/* Survey Analytics */}
          <MainAnalyticsCard title="Survey Analytics" icon={<AssignmentTurnedInIcon />} color="primary">
            <Stack spacing={2}>
              <PerformanceTable
                title="Survey Performance Overview"
                data={[
                  {
                    category: 'Desktop Surveys',
                    total: s.Desktop_Survey?.Submitted ?? 0,
                    completed: s.Desktop_Survey?.Approved ?? 0,
                    progress: calculateCompletionRate(s.Desktop_Survey?.Approved ?? 0, s.Desktop_Survey?.Submitted ?? 0)
                  },
                  {
                    category: 'Physical Surveys',
                    total: s.Physical_Survey?.Submitted ?? 0,
                    completed: s.Physical_Survey?.Approved ?? 0,
                    progress: calculateCompletionRate(s.Physical_Survey?.Approved ?? 0, s.Physical_Survey?.Submitted ?? 0)
                  },
                ]}
              />

              <Box>
                <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
                  Survey Completion Trends
                </Typography>
                <Box sx={{ height: 350, width: '100%', maxWidth: '100%' }}>
                  <LineChart
                    xAxis={[
                      {
                        data: ['Desktop', 'Physical'],
                        scaleType: 'band',
                      },
                    ]}
                    yAxis={[
                      {
                        min: 0,
                        max: 100,
                      },
                    ]}
                    series={[
                      {
                        data: [
                          calculateCompletionRate(
                            s.Desktop_Survey?.Approved ?? 0,
                            s.Desktop_Survey?.Submitted ?? 0
                          ),
                          calculateCompletionRate(
                            s.Physical_Survey?.Approved ?? 0,
                            s.Physical_Survey?.Submitted ?? 0
                          ),
                        ],
                        color: theme.palette.primary.main,
                      },
                    ]}
                    margin={{ left: 60, right: 20, top: 20, bottom: 40 }}
                    height={350}
                  />
                </Box>
              </Box>
            </Stack>
          </MainAnalyticsCard>

          {/* Network Infrastructure */}
          <MainAnalyticsCard title="Network Infrastructure" icon={<RouterIcon />} color="info">
            <Stack spacing={2}>
              <Grid container spacing={3}>
                {networkData.map((item, index) => (
                  <Grid key={index} item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.background.default, 0.5),
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ mb: 1 }}>
                        {item.value}
                      </Typography>
                      <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>
                        {item.name}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((item.value / Math.max(...networkData.map(d => d.value), 1)) * 100, 100)}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.grey[400], 0.2),
                          '& .MuiLinearProgress-bar': {
                            bgcolor: item.color,
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Box>
                <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
                  Infrastructure Deployment Overview
                </Typography>
                <Box sx={{ height: 350, width: '100%', maxWidth: '100%' }}>
                  <BarChart
                    height={350}
                    xAxis={[{ data: networkData.map(d => d.name), scaleType: 'band' }]}
                    series={[{
                      data: networkData.map(d => d.value),
                      color: theme.palette.info.main,
                    }]}
                    margin={{ left: 60, right: 20, top: 20, bottom: 80 }}
                  />
                </Box>
              </Box>
            </Stack>
          </MainAnalyticsCard>

          {/* Process Flow & Workflow */}
          <MainAnalyticsCard title="Process Flow & Workflow" icon={<TimelineIcon />} color="warning">
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
