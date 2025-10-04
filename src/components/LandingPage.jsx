import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Button,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Stack,
  alpha
} from '@mui/material';
import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DateRangeIcon from '@mui/icons-material/DateRange';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SpeedIcon from '@mui/icons-material/Speed';
import PlaceIcon from '@mui/icons-material/Place';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PublishedWithChangesIcon from '@mui/icons-material/PublishedWithChanges';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import EditLocationIcon from '@mui/icons-material/EditLocation';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ReplayIcon from '@mui/icons-material/Replay';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import RouteIcon from '@mui/icons-material/Route';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import './LandingPage.css';
import {ATTENDANCE_URL, AUTH_URL, LOCATION_URL} from "../API/api-keys.jsx";
import { useAuth } from '../context/AuthContext';
import surveyService from '../services/surveyService';

// Styled components
const GlassCard = styled(Card)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 15px 30px 0 rgba(31, 38, 135, 0.25)',
  },
}));

const StatsCard = styled(Card)(({ theme, colorvariant = 'primary' }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: alpha(theme.palette[colorvariant].main, 0.05),
  borderRadius: 16,
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '6px',
    height: '100%',
    background: theme.palette[colorvariant].main,
  },
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: `0 8px 25px ${alpha(theme.palette[colorvariant].main, 0.25)}`,
  },
}));

const ActivityCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  borderRadius: 16,
  boxShadow: '0 5px 20px rgba(0, 0, 0, 0.05)',
  background: alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(10px)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  border: '1px solid rgba(255, 255, 255, 0.18)',
}));

const FeatureCard = styled(Card)(({ theme, bgColor = 'primary.light' }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)',
  },
}));

const IconWrapper = styled(Box)(({ theme, bgcolor = 'primary.main' }) => ({
  backgroundColor: theme.palette[bgcolor.split('.')[0]][bgcolor.split('.')[1] || 'main'],
  borderRadius: '50%',
  padding: theme.spacing(1.5),
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: '#fff',
  width: 48,
  height: 48,
  boxShadow: `0 4px 14px ${alpha(theme.palette[bgcolor.split('.')[0]][bgcolor.split('.')[1] || 'main'], 0.4)}`,
}));

const DashboardSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  position: 'relative',
}));

const QuickButton = styled(Button)(({ theme, bgcolor = 'primary' }) => ({
  borderRadius: 12,
  padding: theme.spacing(1.5),
  justifyContent: 'flex-start',
  backgroundColor: alpha(theme.palette[bgcolor].main, 0.05),
  color: theme.palette[bgcolor].main,
  border: `1px solid ${alpha(theme.palette[bgcolor].main, 0.2)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette[bgcolor].main, 0.1),
    borderColor: alpha(theme.palette[bgcolor].main, 0.3),
    transform: 'translateY(-2px)',
  },
}));

// New component for location status cards
const LocationStatusCard = styled(Box)(({ theme, statusColor = 'primary.main' }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius * 2,
  background: alpha(statusColor, 0.08),
  border: `1px solid ${alpha(statusColor, 0.2)}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  height: '100%',
  minHeight: 120,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 6px 20px ${alpha(statusColor, 0.15)}`,
    background: alpha(statusColor, 0.12),
  }
}));

const LandingPage = () => {
  const { user } = useAuth();
  const isViewer = user && user.role === 'VIEWER';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // State for attendance stats
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    overtime: 0,
    total: 0,
    loading: true
  });

  // State for user stats
  const [userStats, setUserStats] = useState({
    supervisors: 0,
    surveyors: 0,
    total: 0,
    loading: true
  });

  // State for survey stats
  const [surveyStats, setSurveyStats] = useState({
    totalSurveys: 0,
    activeSurveys: 0,
    blockSurveys: 0,
    gpSurveys: 0,
    ofcSurveys: 0,
    totalMediaFiles: 0,
    totalFields: 0,
    loading: true
  });

  // State for location statistics
  const [locationStats, setLocationStats] = useState({
    released: 0,
    assigned: 0,
    active: 0,
    submitted: 0,
    accepted: 0,
    reverted: 0,
    total: 0,
    loading: true
  });

  // State for recent activities
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsError, setStatsError] = useState(null);

  // Fetch initial data on component mount
  useEffect(() => {
    fetchStats();
    fetchSurveyStats();
    fetchRecentActivities();
  }, []);

  // Fetch survey statistics
  const fetchSurveyStats = async () => {
    try {
      setSurveyStats(prev => ({ ...prev, loading: true }));
      const response = await surveyService.getSurveyStats();
      
      if (response.success) {
        setSurveyStats({
          ...response.data,
          loading: false
        });
      } else {
        throw new Error('Failed to fetch survey stats');
      }
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      setSurveyStats({
        totalSurveys: 0,
        activeSurveys: 0,
        blockSurveys: 0,
        gpSurveys: 0,
        ofcSurveys: 0,
        totalMediaFiles: 0,
        totalFields: 0,
        loading: false
      });
    }
  };

  // Fetch attendance and user stats
  const fetchStats = async () => {
    try {
      setAttendanceStats(prev => ({ ...prev, loading: true }));
      setUserStats(prev => ({ ...prev, loading: true }));
      setLocationStats(prev => ({ ...prev, loading: true }));
      setStatsError(null);

      // Fetch users from auth API
      const usersResponse = await fetch(`${AUTH_URL}/api/auth/users`);
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users data');
      }
      const usersData = await usersResponse.json();

      if (!usersData.success || !Array.isArray(usersData.data)) {
        throw new Error('Invalid data format received from Auth API');
      }

      const users = usersData.data;
      const viewerProject = (isViewer && user && user.project) ? user.project : null;
      const usersForStats = viewerProject ? users.filter(u => (u.project || '') === viewerProject) : users;
      const supervisors = usersForStats.filter(u => u.role === 'SUPERVISOR').length;
      const surveyors = usersForStats.filter(u => u.role === 'SURVEYOR').length;

      // Set user stats
      setUserStats({
        supervisors,
        surveyors,
        total: usersForStats.length,
        loading: false
      });

      // Fetch today's attendance from attendance API
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();

      const attendanceResponse = await fetch(`${ATTENDANCE_URL}/api/attendance/all?month=${month}&year=${year}`);
      if (!attendanceResponse.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const attendanceData = await attendanceResponse.json();
      if (!attendanceData.success || !Array.isArray(attendanceData.data)) {
        throw new Error('Invalid data format received from Attendance API');
      }

      // Filter for today's records
      const todayStr = today.toISOString().split('T')[0];
      const todayRecords = attendanceData.data.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.toISOString().split('T')[0] === todayStr;
      });

      // If viewer has a project, restrict attendance to users in that project
      const allowedUserIds = viewerProject ? new Set(usersForStats.map(u => u._id)) : null;
      const filteredTodayRecords = allowedUserIds
        ? todayRecords.filter(record => allowedUserIds.has(record.userId))
        : todayRecords;

      // Count by status
      const present = filteredTodayRecords.filter(record => record.status === 'present').length;
      const late = filteredTodayRecords.filter(record => record.status === 'late').length;
      const overtime = filteredTodayRecords.filter(record => record.status === 'overtime').length;
      const absent = filteredTodayRecords.filter(record => record.status === 'absent').length;

      // Set attendance stats
      setAttendanceStats({
        present,
        absent,
        late,
        overtime,
        total: usersForStats.length,
        loading: false
      });

      // Fetch location statistics from location API
      const locationsResponse = await fetch(`${LOCATION_URL}/api/locations`);
      if (!locationsResponse.ok) {
        throw new Error('Failed to fetch locations data');
      }

      const locationsData = await locationsResponse.json();
      if (!locationsData.success || !Array.isArray(locationsData.data)) {
        throw new Error('Invalid data format received from Location API');
      }

      const locations = locationsData.data;
      
      // Count locations by status
      // Status mapping: 1: Released, 2: Assigned, 3: Active, 4: Submitted, 5: Accepted, 6: Reverted
      const locationCounts = {
        released: locations.filter(loc => loc.status === 1).length,
        assigned: locations.filter(loc => loc.status === 2).length,
        active: locations.filter(loc => loc.status === 3).length,
        submitted: locations.filter(loc => loc.status === 4).length,
        accepted: locations.filter(loc => loc.status === 5).length,
        reverted: locations.filter(loc => loc.status === 6).length,
        total: locations.length
      };

      setLocationStats({
        ...locationCounts,
        loading: false
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      setStatsError('Failed to load dashboard data. Please try again later.');

      // In case of error, show empty stats
      setAttendanceStats({
        present: 0,
        absent: 0,
        late: 0,
        overtime: 0,
        total: 0,
        loading: false
      });

      setUserStats({
        supervisors: 0,
        surveyors: 0,
        total: 0,
        loading: false
      });

      setLocationStats({
        released: 0,
        assigned: 0,
        active: 0,
        submitted: 0,
        accepted: 0,
        reverted: 0,
        total: 0,
        loading: false
      });
    }
  };

  // Fetch recent activities
  const fetchRecentActivities = async () => {
    try {
      setActivitiesLoading(true);
      setError(null);

      // Fetch attendance data for recent activities
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();

      const response = await fetch(`${ATTENDANCE_URL}/api/attendance/all?month=${month}&year=${year}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received from Attendance API');
      }

      // Get user information to enrich attendance records
      const usersResponse = await fetch(`${AUTH_URL}/api/auth/users`);
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users data');
      }

      const usersData = await usersResponse.json();
      if (!usersData.success || !Array.isArray(usersData.data)) {
        throw new Error('Invalid data format received from Auth API');
      }

      const users = usersData.data;
      const viewerProject = (isViewer && user && user.project) ? user.project : null;
      const usersForView = viewerProject ? users.filter(u => (u.project || '') === viewerProject) : users;
      const allowedUserIds = viewerProject ? new Set(usersForView.map(u => u._id)) : null;

      // Sort by date, most recent first
      const sortedRecords = [...data.data].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      // Take the 5 most recent records
      const filteredSortedRecords = allowedUserIds
        ? sortedRecords.filter(r => allowedUserIds.has(r.userId))
        : sortedRecords;
      const recentRecords = filteredSortedRecords.slice(0, 5);

      // Format records as activities
      const activities = recentRecords.map((record, index) => {
        const user = users.find(u => u._id === record.userId) || { username: 'Unknown User' };

        // Format time
        let formattedTime;
        let activityType;

        if (record.status === 'absent') {
          formattedTime = 'All day';
          activityType = 'absence';
        } else if (record.checkInTime) {
          const checkInDate = new Date(record.checkInTime);
          formattedTime = checkInDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          activityType = 'check-in';
        } else {
          formattedTime = 'N/A';
          activityType = 'attendance';
        }

        return {
          id: record._id || index,
          type: activityType,
          username: user.username,
          time: formattedTime,
          status: record.status,
          date: new Date(record.date).toLocaleDateString()
        };
      });

      setRecentActivities(activities);
      setActivitiesLoading(false);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setActivitiesLoading(false);
      setError('Failed to load recent activity data. Please try again later.');
      setRecentActivities([]);
    }
  };

  // Render status chip with appropriate color
  const getStatusChip = (status) => {
    switch (status) {
      case 'present':
        return <Chip size="small" label="Present" color="success" />;
      case 'absent':
        return <Chip size="small" label="Absent" color="error" />;
      case 'late':
        return <Chip size="small" label="Late" color="warning" />;
      case 'overtime':
        return <Chip size="small" label="Overtime" color="info" />;
      default:
        return <Chip size="small" label={status} color="default" />;
    }
  };

  // Calculate attendance percentage
  const calculateAttendancePercentage = () => {
    if (attendanceStats.total === 0) return 0;
    return Math.round(((attendanceStats.present + attendanceStats.late + attendanceStats.overtime) / attendanceStats.total) * 100);
  };

  return (
    <Container maxWidth="lg" className="dashboard-container">
      {/* Header Section */}
      <Box className="dashboard-header">
        <Box className="header-content">
          <Typography variant="h3" component="h1" className="dashboard-title">
            Welcome to Project Management Dashboard
          </Typography>
          <Typography variant="subtitle1" className="dashboard-subtitle">
            Your workspace for project monitoring
          </Typography>
        </Box>
      </Box>

      {/* Dashboard Controls */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          mt: 2,
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DashboardIcon
            sx={{
              fontSize: 30,
              mr: 1.5,
              color: 'primary.main',
              filter: `drop-shadow(0 0 8px ${alpha(theme.palette.primary.main, 0.5)})`
            }}
          />
          <Box>
            <Typography variant="h5" component="h2" fontWeight="600" sx={{ color: 'text.primary' }}>
              Dashboard Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Tooltip title="View Notifications">
            <IconButton
              sx={{
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                color: 'warning.main',
                '&:hover': {
                  bgcolor: alpha(theme.palette.warning.main, 0.2),
                }
              }}
            >
              <NotificationsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Dashboard">
            <IconButton
              onClick={() => { fetchStats(); fetchRecentActivities(); }}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error message */}
      {statsError && (
        <Box
          sx={{
            mt: 1,
            mb: 4,
            p: 2,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            display: 'flex',
            alignItems: 'center',
            boxShadow: `0 4px 14px ${alpha(theme.palette.error.main, 0.1)}`
          }}
        >
          <ErrorOutlineIcon color="error" sx={{ mr: 1.5, fontSize: 24 }} />
          <Typography color="error.main" fontWeight="500">{statsError}</Typography>
        </Box>
      )}

      {/* Main Dashboard Content */}
      <Grid container spacing={4} sx={{ mb: 5 }}>
        {/* Location Statuses Section - NEW */}
        <Grid item xs={12} sx={{ width: '100%' }}>
          <GlassCard elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <IconWrapper bgcolor="primary.main">
                    <LocationOnIcon />
                  </IconWrapper>
                  <Typography variant="h5" fontWeight="600">
                    Location Status Overview
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<VisibilityIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  View Details
                </Button>
              </Stack>

              {locationStats.loading ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4} md={2}>
                    <LocationStatusCard statusColor={theme.palette.info.main}>
                      <Avatar
                        sx={{
                          bgcolor: 'info.main',
                          mb: 1,
                          width: 50,
                          height: 50,
                          boxShadow: `0 4px 15px ${alpha(theme.palette.info.main, 0.3)}`
                        }}
                      >
                        <PublishedWithChangesIcon />
                      </Avatar>
                      <Typography variant="h5" fontWeight="700" color="info.main">
                        {locationStats.released}
                      </Typography>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">
                        Released
                      </Typography>
                    </LocationStatusCard>
                  </Grid>

                  <Grid item xs={6} sm={4} md={2}>
                    <LocationStatusCard statusColor={theme.palette.secondary.main}>
                      <Avatar
                        sx={{
                          bgcolor: 'secondary.main',
                          mb: 1,
                          width: 50,
                          height: 50,
                          boxShadow: `0 4px 15px ${alpha(theme.palette.secondary.main, 0.3)}`
                        }}
                      >
                        <AssignmentIndIcon />
                      </Avatar>
                      <Typography variant="h5" fontWeight="700" color="secondary.main">
                        {locationStats.assigned}
                      </Typography>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">
                        Assigned
                      </Typography>
                    </LocationStatusCard>
                  </Grid>

                  <Grid item xs={6} sm={4} md={2}>
                    <LocationStatusCard statusColor={theme.palette.success.main}>
                      <Avatar
                        sx={{
                          bgcolor: 'success.main',
                          mb: 1,
                          width: 50,
                          height: 50,
                          boxShadow: `0 4px 15px ${alpha(theme.palette.success.main, 0.3)}`
                        }}
                      >
                        <EditLocationIcon />
                      </Avatar>
                      <Typography variant="h5" fontWeight="700" color="success.main">
                        {locationStats.active}
                      </Typography>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">
                        Active
                      </Typography>
                    </LocationStatusCard>
                  </Grid>

                  <Grid item xs={6} sm={4} md={2}>
                    <LocationStatusCard statusColor={theme.palette.warning.main}>
                      <Avatar
                        sx={{
                          bgcolor: 'warning.main',
                          mb: 1,
                          width: 50,
                          height: 50,
                          boxShadow: `0 4px 15px ${alpha(theme.palette.warning.main, 0.3)}`
                        }}
                      >
                        <AssignmentTurnedInIcon />
                      </Avatar>
                      <Typography variant="h5" fontWeight="700" color="warning.main">
                        {locationStats.submitted}
                      </Typography>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">
                        Submitted
                      </Typography>
                    </LocationStatusCard>
                  </Grid>

                  <Grid item xs={6} sm={4} md={2}>
                    <LocationStatusCard statusColor={theme.palette.primary.main}>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          mb: 1,
                          width: 50,
                          height: 50,
                          boxShadow: `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`
                        }}
                      >
                        <ThumbUpAltIcon />
                      </Avatar>
                      <Typography variant="h5" fontWeight="700" color="primary.main">
                        {locationStats.accepted}
                      </Typography>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">
                        Accepted
                      </Typography>
                    </LocationStatusCard>
                  </Grid>

                  <Grid item xs={6} sm={4} md={2}>
                    <LocationStatusCard statusColor={theme.palette.error.main}>
                      <Avatar
                        sx={{
                          bgcolor: 'error.main',
                          mb: 1,
                          width: 50,
                          height: 50,
                          boxShadow: `0 4px 15px ${alpha(theme.palette.error.main, 0.3)}`
                        }}
                      >
                        <ReplayIcon />
                      </Avatar>
                      <Typography variant="h5" fontWeight="700" color="error.main">
                        {locationStats.reverted}
                      </Typography>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">
                        Reverted
                      </Typography>
                    </LocationStatusCard>
                  </Grid>
                </Grid>
              )}

              <Box mt={3} sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.7),
                p: 2,
                borderRadius: 2,
                border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`
              }}>
                <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body1" fontWeight="600">
                      Total of {locationStats.total} locations in the system
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Updated: {new Date().toLocaleString()}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SpeedIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`
                    }}
                  >
                    View Complete Analytics
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Three-column layout for main widgets */}
        <Grid item xs={12} md={4} sx={{ width: '100%' }}>
          {/* Team Overview */}
          <GlassCard elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" fontWeight="600" gutterBottom mb={2}>
                Team Overview
              </Typography>

              {userStats.loading ? (
                <Box display="flex" justifyContent="center" py={3} flexGrow={1} alignItems="center">
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={6} md={12}>
                      <Box sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                        height: '100%'
                      }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: 'secondary.main', width: 50, height: 50 }}>
                              <SupervisorAccountIcon />
                            </Avatar>
                            <Box>
                              <Typography fontWeight="600">Supervisors</Typography>
                              <Typography variant="body2" color="text.secondary">Management team</Typography>
                            </Box>
                          </Box>
                          <Typography variant="h4" fontWeight="700" color="secondary.main">
                            {userStats.supervisors}
                          </Typography>
                        </Stack>
                        <Box sx={{ width: '100%', mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={userStats.total > 0 ? (userStats.supervisors / userStats.total) * 100 : 0}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: alpha(theme.palette.secondary.main, 0.15),
                              '& .MuiLinearProgress-bar': {
                                bgcolor: 'secondary.main'
                              }
                            }}
                          />
                          <Typography variant="caption" display="block" sx={{ textAlign: 'right', mt: 0.5 }}>
                            {userStats.total > 0 ?
                              `${Math.round((userStats.supervisors / userStats.total) * 100)}% of team` :
                              '0% of team'
                            }
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={12}>
                      <Box sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                        height: '100%'
                      }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: 'info.main', width: 50, height: 50 }}>
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography fontWeight="600">Surveyors</Typography>
                              <Typography variant="body2" color="text.secondary">Field team</Typography>
                            </Box>
                          </Box>
                          <Typography variant="h4" fontWeight="700" color="info.main">
                            {userStats.surveyors}
                          </Typography>
                        </Stack>
                        <Box sx={{ width: '100%', mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={userStats.total > 0 ? (userStats.surveyors / userStats.total) * 100 : 0}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: alpha(theme.palette.info.main, 0.15),
                              '& .MuiLinearProgress-bar': {
                                bgcolor: 'info.main'
                              }
                            }}
                          />
                          <Typography variant="caption" display="block" sx={{ textAlign: 'right', mt: 0.5 }}>
                            {userStats.total > 0 ?
                              `${Math.round((userStats.surveyors / userStats.total) * 100)}% of team` :
                              '0% of team'
                            }
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                    textAlign: 'center',
                    mb: 2
                  }}>
                    <Typography variant="h5" fontWeight="700" color="primary.main" gutterBottom>
                      {userStats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Team Members
                    </Typography>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    component={isViewer ? 'button' : Link}
                    to={isViewer ? undefined : "/users"}
                    color="primary"
                    endIcon={<ArrowForwardIcon />}
                    disabled={isViewer}
                    sx={{
                      borderRadius: 2,
                      py: 1.5,
                      fontWeight: 600,
                      textTransform: 'none',
                      mt: 'auto'
                    }}
                  >
                    View All Team Members
                  </Button>
                </>
              )}
            </CardContent>
          </GlassCard>
        </Grid >

        <Grid item xs={12} md={4} sx={{ width: '100%' }}>
          {/* Attendance Overview */}
          <GlassCard elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h5" fontWeight="600">
                  Attendance Overview
                </Typography>
                <Chip
                  icon={<TrendingUpIcon fontSize="small" />}
                  label={`${calculateAttendancePercentage()}% Present Today`}
                  color="success"
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    p: 0.5,
                    borderWidth: 2,
                    '& .MuiChip-icon': { color: 'success.main' }
                  }}
                />
              </Stack>

              {attendanceStats.loading ? (
                <Box display="flex" justifyContent="center" py={3} flexGrow={1} alignItems="center">
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexGrow: 1
                  }}>
                    {/* Attendance Circle */}
                    <Box sx={{ position: 'relative', textAlign: 'center', mb: 3, mt: 2 }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <CircularProgress
                          variant="determinate"
                          value={calculateAttendancePercentage()}
                          size={160}
                          thickness={5}
                          sx={{
                            color: theme.palette.success.main,
                            boxShadow: `0 0 20px ${alpha(theme.palette.success.main, 0.2)}`,
                            borderRadius: '50%'
                          }}
                        />
                        <Box
                          sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column'
                          }}
                        >
                          <Typography variant="h3" fontWeight="700" sx={{ color: 'success.main' }}>
                            {calculateAttendancePercentage()}%
                          </Typography>
                          <Typography variant="caption" fontWeight="500" color="text.secondary">
                            ATTENDANCE RATE
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Attendance Stats */}
                    <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
                      <Grid item xs={4}>
                        <Box sx={{
                          textAlign: 'center',
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.success.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                          height: '100%',
                          minHeight: 110
                        }}>
                          <Stack alignItems="center" spacing={1}>
                            <Avatar sx={{ bgcolor: 'success.main', width: 45, height: 45 }}>
                              <CheckCircleIcon />
                            </Avatar>
                            <div>
                              <Typography variant="h5" fontWeight="700" color="success.main">
                                {attendanceStats.present}
                              </Typography>
                              <Typography variant="body2" fontWeight="500" color="text.secondary">
                                Present
                              </Typography>
                            </div>
                          </Stack>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{
                          textAlign: 'center',
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.warning.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                          height: '100%',
                          minHeight: 110
                        }}>
                          <Stack alignItems="center" spacing={1}>
                            <Avatar sx={{ bgcolor: 'warning.main', width: 45, height: 45 }}>
                              <AccessTimeIcon />
                            </Avatar>
                            <div>
                              <Typography variant="h5" fontWeight="700" color="warning.main">
                                {attendanceStats.late}
                              </Typography>
                              <Typography variant="body2" fontWeight="500" color="text.secondary">
                                Late
                              </Typography>
                            </div>
                          </Stack>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{
                          textAlign: 'center',
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.error.main, 0.08),
                          border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                          height: '100%',
                          minHeight: 110
                        }}>
                          <Stack alignItems="center" spacing={1}>
                            <Avatar sx={{ bgcolor: 'error.main', width: 45, height: 45 }}>
                              <EventBusyIcon />
                            </Avatar>
                            <div>
                              <Typography variant="h5" fontWeight="700" color="error.main">
                                {attendanceStats.absent}
                              </Typography>
                              <Typography variant="body2" fontWeight="500" color="text.secondary">
                                Absent
                              </Typography>
                            </div>
                          </Stack>
                        </Box>
                      </Grid>
                    </Grid>

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backdropFilter: 'blur(4px)',
                        bgcolor: alpha(theme.palette.common.white, 0.9),
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                        textAlign: 'center',
                        width: '100%',
                        mt: 'auto'
                      }}
                    >
                      <Typography variant="body1" gutterBottom color="text.secondary">
                        {attendanceStats.total} Team Members Total
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        component={Link}
                        to="/attendance"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          py: 1,
                          mt: 1
                        }}
                      >
                        View Detailed Records
                      </Button>
                    </Box>
                  </Box>
                </>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4} sx={{ width: '100%' }}>
          {/* Quick Actions */}
          <GlassCard elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h5" fontWeight="600" gutterBottom mb={2}>
                Quick Actions
              </Typography>

              <Grid container spacing={2} sx={{ flexGrow: 1 }}>
                <Grid item xs={12}>
                  <QuickButton
                    fullWidth
                    variant="text"
                    startIcon={
                      <IconWrapper bgcolor="primary.light" sx={{ width: 40, height: 40 }}>
                        <CalendarMonthIcon fontSize="small" />
                      </IconWrapper>
                    }
                    component={Link}
                    to="/attendance"
                    bgcolor="primary"
                    sx={{ py: 1.5 }}
                  >
                    <Box textAlign="left" sx={{ ml: 1 }}>
                      <Typography fontWeight="600">Attendance Management</Typography>
                      <Typography variant="caption" color="text.secondary">Track daily attendance</Typography>
                    </Box>
                  </QuickButton>
                </Grid>
                <Grid item xs={12}>
                  <QuickButton
                    fullWidth
                    variant="text"
                    startIcon={
                      <IconWrapper bgcolor="secondary.light" sx={{ width: 40, height: 40 }}>
                        <PeopleAltIcon fontSize="small" />
                      </IconWrapper>
                    }
                    component={isViewer ? 'button' : Link}
                    to={isViewer ? undefined : '/users'}
                    bgcolor="secondary"
                    disabled={isViewer}
                    sx={{ py: 1.5 }}
                  >
                    <Box textAlign="left" sx={{ ml: 1 }}>
                      <Typography fontWeight="600">User Management</Typography>
                      <Typography variant="caption" color="text.secondary">Manage team members</Typography>
                    </Box>
                  </QuickButton>
                </Grid>
                <Grid item xs={12}>
                  <QuickButton
                    fullWidth
                    variant="text"
                    startIcon={
                      <IconWrapper bgcolor="success.light" sx={{ width: 40, height: 40 }}>
                        <AssessmentIcon fontSize="small" />
                      </IconWrapper>
                    }
                    component={Link}
                    to="/reports"
                    bgcolor="success"
                    sx={{ py: 1.5 }}
                  >
                    <Box textAlign="left" sx={{ ml: 1 }}>
                      <Typography fontWeight="600">Reports & Analytics</Typography>
                      <Typography variant="caption" color="text.secondary">Generate detailed reports</Typography>
                    </Box>
                  </QuickButton>
                </Grid>
                <Grid item xs={12}>
                  <QuickButton
                    fullWidth
                    variant="text"
                    startIcon={
                      <IconWrapper bgcolor="info.light" sx={{ width: 40, height: 40 }}>
                        <PersonIcon fontSize="small" />
                      </IconWrapper>
                    }
                    component={Link}
                    to="/profile"
                    bgcolor="info"
                    sx={{ py: 1.5 }}
                  >
                    <Box textAlign="left" sx={{ ml: 1 }}>
                      <Typography fontWeight="600">My Profile</Typography>
                      <Typography variant="caption" color="text.secondary">View your account</Typography>
                    </Box>
                  </QuickButton>
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Recent Activities - Full width */}
        <Grid item xs={12} sx={{ width: '100%' }}>
          <GlassCard elevation={0}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h5" fontWeight="600">
                  Recent Activities
                </Typography>
                <Button
                  component={Link}
                  to="/attendance"
                  color="primary"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  View All
                </Button>
              </Stack>

              {error && (
                <Box sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <ErrorOutlineIcon color="error" />
                  <Typography color="error.main" fontWeight="500">{error}</Typography>
                </Box>
              )}

              {activitiesLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : recentActivities.length === 0 ? (
                <Box
                  textAlign="center"
                  py={4}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    borderRadius: 2,
                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`
                  }}
                >
                  <DateRangeIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography color="text.secondary" fontWeight="500">No recent activities found</Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {recentActivities.map((activity, index) => (
                    <Grid item xs={12} md={6} lg={4} key={activity.id || index}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: index % 2 === 0 ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          transition: 'all 0.2s',
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            transform: 'translateY(-3px)',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
                          }
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Avatar
                            sx={{
                              width: 45,
                              height: 45,
                              fontWeight: 'bold',
                              bgcolor:
                                activity.status === 'present' ? 'success.main' :
                                activity.status === 'late' ? 'warning.main' :
                                activity.status === 'overtime' ? 'info.main' : 'error.main'
                            }}
                          >
                            {activity.username.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                              <Typography variant="body1" fontWeight="600">
                                {activity.username}
                              </Typography>
                              {getStatusChip(activity.status)}
                            </Box>
                            <Box display="flex" alignItems="center" mb={1}>
                              <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {activity.time}
                              </Typography>
                            </Box>
                            <Typography variant="caption" fontWeight="500"
                              sx={{
                                color: 'text.secondary',
                                bgcolor: alpha(theme.palette.common.black, 0.03),
                                borderRadius: 1,
                                px: 1,
                                py: 0.5,
                                display: 'inline-block'
                              }}
                            >
                              {activity.date}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>
    </Container>
  );
};

// Custom progress bar with label
function LinearProgressWithLabel(props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" {...props} sx={{ height: 10, borderRadius: 5 }} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(
          props.value,
        )}%`}</Typography>
      </Box>
    </Box>
  );
}

export default LandingPage;
