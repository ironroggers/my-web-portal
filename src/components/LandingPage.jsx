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
  Tooltip
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
import './LandingPage.css';

// Styled components
const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)',
  },
}));

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  borderLeft: `4px solid ${theme.palette.primary.main}`,
}));

const LandingPage = () => {
  // State for attendance stats
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
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

  // State for recent activities
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsError, setStatsError] = useState(null);

  // Fetch initial data on component mount
  useEffect(() => {
    fetchStats();
    fetchRecentActivities();
  }, []);

  // Fetch attendance and user stats
  const fetchStats = async () => {
    try {
      setAttendanceStats(prev => ({ ...prev, loading: true }));
      setUserStats(prev => ({ ...prev, loading: true }));
      setStatsError(null);
      
      // Fetch users from auth API
      const usersResponse = await fetch(`${import.meta.env.VITE_AUTH_API_URL}/auth/users`);
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users data');
      }
      const usersData = await usersResponse.json();
      
      if (!usersData.success || !Array.isArray(usersData.data)) {
        throw new Error('Invalid data format received from Auth API');
      }
      
      const users = usersData.data;
      const supervisors = users.filter(user => user.role === 'SUPERVISOR').length;
      const surveyors = users.filter(user => user.role === 'SURVEYOR').length;
      
      // Set user stats
      setUserStats({
        supervisors,
        surveyors,
        total: users.length,
        loading: false
      });
      
      // Fetch today's attendance from attendance API
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      
      const attendanceResponse = await fetch(`${import.meta.env.VITE_ATTENDANCE_API_URL}/attendance/all?month=${month}&year=${year}`);
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
      
      // Count by status
      const present = todayRecords.filter(record => record.status === 'present').length;
      const late = todayRecords.filter(record => record.status === 'late').length;
      const absent = todayRecords.filter(record => record.status === 'absent').length;
      
      // Set attendance stats
      setAttendanceStats({
        present,
        absent,
        late,
        total: users.length, // Assuming every user should have an attendance record
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
        total: 0,
        loading: false
      });
      
      setUserStats({
        supervisors: 0,
        surveyors: 0,
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
      
      const response = await fetch(`${import.meta.env.VITE_ATTENDANCE_API_URL}/attendance/all?month=${month}&year=${year}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }
      
      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received from Attendance API');
      }
      
      // Get user information to enrich attendance records
      const usersResponse = await fetch(`${import.meta.env.VITE_AUTH_API_URL}/auth/users`);
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users data');
      }
      
      const usersData = await usersResponse.json();
      if (!usersData.success || !Array.isArray(usersData.data)) {
        throw new Error('Invalid data format received from Auth API');
      }
      
      const users = usersData.data;
      
      // Sort by date, most recent first
      const sortedRecords = [...data.data].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      // Take the 5 most recent records
      const recentRecords = sortedRecords.slice(0, 5);
      
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
      default:
        return <Chip size="small" label={status} color="default" />;
    }
  };

  // Calculate attendance percentage
  const calculateAttendancePercentage = () => {
    if (attendanceStats.total === 0) return 0;
    return Math.round(((attendanceStats.present + attendanceStats.late) / attendanceStats.total) * 100);
  };

  return (
    <Container maxWidth="lg" className="landing-container">
      <Box mb={4} className="welcome-section">
        <Typography variant="h3" component="h1" gutterBottom className="welcome-title">
          Welcome to Survey Tool Portal
        </Typography>
        <Typography variant="h6" color="textSecondary" className="welcome-subtitle">
          Your comprehensive dashboard for survey management and attendance tracking
        </Typography>
      </Box>

      {/* Quick Stats Section */}
      <Box mb={5}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            <DashboardIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Dashboard Overview
          </Typography>
          <Box display="flex" alignItems="center">
            <Typography variant="subtitle1" color="primary" sx={{ mr: 2 }}>
              Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
            <Tooltip title="Refresh Data">
              <IconButton onClick={() => { fetchStats(); fetchRecentActivities(); }} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {statsError ? (
          <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: 'error.light', color: 'error.contrastText' }}>
            <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
              <Typography variant="h6" gutterBottom>
                {statsError}
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<RefreshIcon />}
                onClick={fetchStats}
                sx={{ mt: 1 }}
              >
                Retry
              </Button>
            </Box>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {/* Attendance Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Attendance Rate
                  </Typography>
                  {attendanceStats.loading ? (
                    <Box display="flex" justifyContent="center" py={1}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : (
                    <Box display="flex" alignItems="baseline">
                      <Typography variant="h4" component="div" color="primary">
                        {calculateAttendancePercentage()}%
                      </Typography>
                      <CheckCircleIcon color="success" sx={{ ml: 1 }} />
                    </Box>
                  )}
                  <Typography variant="body2" color="textSecondary">
                    Present today: {attendanceStats.present + attendanceStats.late} / {attendanceStats.total}
                  </Typography>
                </CardContent>
              </StatsCard>
            </Grid>

            {/* Total Users */}
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Users
                  </Typography>
                  {userStats.loading ? (
                    <Box display="flex" justifyContent="center" py={1}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : (
                    <Box display="flex" alignItems="baseline">
                      <Typography variant="h4" component="div" color="primary">
                        {userStats.total}
                      </Typography>
                      <PeopleAltIcon color="primary" sx={{ ml: 1 }} />
                    </Box>
                  )}
                  <Typography variant="body2" color="textSecondary">
                    {userStats.supervisors} Supervisors, {userStats.surveyors} Surveyors
                  </Typography>
                </CardContent>
              </StatsCard>
            </Grid>

            {/* Present Today */}
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Present Today
                  </Typography>
                  {attendanceStats.loading ? (
                    <Box display="flex" justifyContent="center" py={1}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : (
                    <Box display="flex" alignItems="baseline">
                      <Typography variant="h4" component="div" color="success.main">
                        {attendanceStats.present}
                      </Typography>
                      <CheckCircleIcon color="success" sx={{ ml: 1 }} />
                    </Box>
                  )}
                  <Typography variant="body2" color="textSecondary">
                    On time check-ins
                  </Typography>
                </CardContent>
              </StatsCard>
            </Grid>

            {/* Late Today */}
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard elevation={2}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Late Today
                  </Typography>
                  {attendanceStats.loading ? (
                    <Box display="flex" justifyContent="center" py={1}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : (
                    <Box display="flex" alignItems="baseline">
                      <Typography variant="h4" component="div" color="warning.main">
                        {attendanceStats.late}
                      </Typography>
                      <AccessTimeIcon color="warning" sx={{ ml: 1 }} />
                    </Box>
                  )}
                  <Typography variant="body2" color="textSecondary">
                    Late check-ins
                  </Typography>
                </CardContent>
              </StatsCard>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Main Features Section */}
      <Box mb={5}>
        <Typography variant="h5" component="h2" gutterBottom>
          Main Features
        </Typography>
        <Grid container spacing={3}>
          {/* Attendance Tracking */}
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard elevation={3}>
              <CardActionArea component={Link} to="/attendance">
                <CardMedia
                  component="div"
                  sx={{ 
                    height: 140, 
                    backgroundColor: 'primary.light',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <CalendarMonthIcon sx={{ fontSize: 60, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    Attendance Tracking
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track attendance records with calendar, table, and history views. Monitor check-ins, check-outs, and absences.
                  </Typography>
                  <Button 
                    endIcon={<ArrowForwardIcon />} 
                    sx={{ mt: 2 }}
                    color="primary"
                  >
                    Go to Attendance
                  </Button>
                </CardContent>
              </CardActionArea>
            </FeatureCard>
          </Grid>

          {/* User Management */}
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard elevation={3}>
              <CardActionArea component={Link} to="/users">
                <CardMedia
                  component="div"
                  sx={{ 
                    height: 140, 
                    backgroundColor: 'secondary.light',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <PeopleAltIcon sx={{ fontSize: 60, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    User Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage supervisors and surveyors. View user profiles, reporting relationships, and performance metrics.
                  </Typography>
                  <Button 
                    endIcon={<ArrowForwardIcon />} 
                    sx={{ mt: 2 }}
                    color="secondary"
                  >
                    Go to Users
                  </Button>
                </CardContent>
              </CardActionArea>
            </FeatureCard>
          </Grid>

          {/* Reports & Analytics */}
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard elevation={3}>
              <CardActionArea component={Link} to="/reports">
                <CardMedia
                  component="div"
                  sx={{ 
                    height: 140, 
                    backgroundColor: 'success.light',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <AssessmentIcon sx={{ fontSize: 60, color: 'white' }} />
                </CardMedia>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    Reports & Analytics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate comprehensive reports on attendance patterns, user performance, and historical trends.
                  </Typography>
                  <Button 
                    endIcon={<ArrowForwardIcon />} 
                    sx={{ mt: 2 }}
                    color="success"
                  >
                    Go to Reports
                  </Button>
                </CardContent>
              </CardActionArea>
            </FeatureCard>
          </Grid>
        </Grid>
      </Box>

      {/* Recent Activity Section */}
      <Grid container spacing={4} mb={5}>
        <Grid item xs={12} md={7}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h5" component="h2" gutterBottom>
                Recent Activity
              </Typography>
              {activitiesLoading && (
                <CircularProgress size={24} />
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {error ? (
              <Box py={4} textAlign="center">
                <Typography color="error">{error}</Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  startIcon={<RefreshIcon />}
                  onClick={fetchRecentActivities}
                  sx={{ mt: 2 }}
                >
                  Try Again
                </Button>
              </Box>
            ) : activitiesLoading ? (
              <Box py={4} display="flex" justifyContent="center" alignItems="center" flexDirection="column">
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography>Loading recent activities...</Typography>
              </Box>
            ) : (
              <>
                <List>
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <ListItem key={activity.id} divider sx={{ py: 1.5 }}>
                        <ListItemIcon>
                          <Avatar sx={{ 
                            bgcolor: 
                              activity.status === 'present' ? 'success.light' : 
                              activity.status === 'late' ? 'warning.light' : 'error.light' 
                          }}>
                            {activity.status === 'present' ? <CheckCircleIcon /> : 
                             activity.status === 'late' ? <AccessTimeIcon /> : <EventBusyIcon />}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body1">
                                {activity.username}
                              </Typography>
                              {getStatusChip(activity.status)}
                            </Box>
                          }
                          secondary={
                            <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                              <Typography variant="body2" color="textSecondary">
                                {activity.type === 'check-in' ? 'Checked in at' : 
                                 activity.type === 'check-out' ? 'Checked out at' : 'Absent'}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {activity.time} - {activity.date}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))
                  ) : (
                    <Box py={4} textAlign="center">
                      <Typography color="textSecondary">No recent activity found</Typography>
                    </Box>
                  )}
                </List>
                
                {recentActivities.length > 0 && (
                  <Box textAlign="center" mt={2}>
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      component={Link} 
                      to="/attendance"
                      endIcon={<ArrowForwardIcon />}
                    >
                      View All Activity
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Team Overview
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                <SupervisorAccountIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Supervisors ({userStats.supervisors})
              </Typography>
              <LinearProgressWithLabel 
                value={userStats.total > 0 ? (userStats.supervisors / userStats.total) * 100 : 0} 
              />
              <Typography variant="body2" color="textSecondary" mt={1}>
                {userStats.supervisors} of {userStats.total} total users
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="h6" gutterBottom>
                <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Surveyors ({userStats.surveyors})
              </Typography>
              <LinearProgressWithLabel 
                value={userStats.total > 0 ? (userStats.surveyors / userStats.total) * 100 : 0} 
              />
              <Typography variant="body2" color="textSecondary" mt={1}>
                {userStats.surveyors} of {userStats.total} total users
              </Typography>
            </Box>
            
            <Box textAlign="center" mt={4}>
              <Button 
                variant="outlined" 
                color="secondary" 
                component={Link} 
                to="/users"
                endIcon={<ArrowForwardIcon />}
              >
                View Team Details
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Quick Access Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, backgroundColor: 'background.default' }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Quick Access
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Button 
              variant="outlined" 
              fullWidth 
              component={Link} 
              to="/attendance"
              startIcon={<CalendarMonthIcon />}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              Attendance
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button 
              variant="outlined" 
              fullWidth 
              component={Link} 
              to="/users"
              startIcon={<PeopleAltIcon />}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              Users
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button 
              variant="outlined" 
              fullWidth 
              component={Link} 
              to="/reports"
              startIcon={<AssessmentIcon />}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              Reports
            </Button>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button 
              variant="outlined" 
              fullWidth 
              component={Link} 
              to="/profile"
              startIcon={<PersonIcon />}
              sx={{ justifyContent: 'flex-start', py: 1.5 }}
            >
              My Profile
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

// Custom progress bar with label
function LinearProgressWithLabel(props) {
  return (
    <Box display="flex" alignItems="center">
      <Box width="100%" mr={1}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box minWidth={35}>
        <Typography variant="body2" color="textSecondary">{`${Math.round(
          props.value,
        )}%`}</Typography>
      </Box>
    </Box>
  );
}

export default LandingPage; 