import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  useTheme,
  IconButton,
  Chip,
  Tooltip,
  Card
} from '@mui/material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import TodayIcon from '@mui/icons-material/Today';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonIcon from '@mui/icons-material/Person';
import {AUTH_URL, ATTENDANCE_URL} from "../API/api-keys.jsx";

// Create a localizer for the calendar
const localizer = momentLocalizer(moment);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          <Typography variant="h6">Something went wrong</Typography>
          <Typography variant="body2">{this.state.error?.message}</Typography>
        </Alert>
      );
    }
    return this.props.children;
  }
}

const AttendanceCalendarView = ({ projectFilter = 'ALL' }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Define API URLs using imported constants
  const ATTENDANCE_API_URL = ATTENDANCE_URL + '/api';
  const AUTH_API_URL = AUTH_URL + '/api';

  // Create a memoized fetchData function with proper error handling
  const fetchData = useCallback(async (date) => {
    try {
      setLoading(true);
      setError(null);

      if (!date) {
        throw new Error('Invalid date provided');
      }

      // Get month and year from the provided date
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const headers = {
        Authorization: `Bearer ${token}`
      };

      // Use Promise.all to fetch data concurrently
      const [attendanceResponse, userResponse] = await Promise.all([
        axios.get(`${ATTENDANCE_API_URL}/attendance/all`, {
          params: { month, year },
          headers
        }),
        axios.get(`${AUTH_API_URL}/auth/users`, {
          headers
        })
      ]);

      setAttendanceData(attendanceResponse.data?.data || []);
      setUsers(userResponse.data?.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || err.message || 'An unexpected error occurred');
      setAttendanceData([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [ATTENDANCE_API_URL, AUTH_API_URL]);

  // Effect to fetch data when date changes
  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate, fetchData]);

  // Handle calendar navigation (prev/next month)
  const handleNavigate = (newDate) => {
    // Prevent navigation to future dates
    const today = new Date();
    if (moment(newDate).isAfter(today, 'month')) {
      return; // Don't update if trying to navigate to future month
    }
    setCurrentDate(newDate);
  };

  // Process data to get attendance counts by date
  const getCalendarEvents = () => {
    // Return empty array if no data
    if (!attendanceData || !users || attendanceData.length === 0 || users.length === 0) {
      return [];
    }

    // Filter users by project first
    const eligibleUserIds = new Set(
      projectFilter === 'ALL'
        ? users.map(u => u._id)
        : users.filter(u => (u.project || '') === projectFilter).map(u => u._id)
    );

    // Create a map to store attendance counts by date
    const attendanceByDate = {};

    // Process attendance records
    attendanceData.forEach(record => {
      if ((record.status === 'present' || record.status === 'late' || record.status === 'overtime') && eligibleUserIds.has(record.userId)) {
        const date = moment(record.date).format('YYYY-MM-DD');

        if (!attendanceByDate[date]) {
          attendanceByDate[date] = {
            supervisors: 0,
            surveyors: 0,
            total: 0
          };
        }

        // Find user to determine role
        const user = users.find(u => u._id === record.userId);
        if (user) {
          attendanceByDate[date].total += 1;
          if (user.role === 'SUPERVISOR') {
            attendanceByDate[date].supervisors += 1;
          } else if (user.role === 'SURVEYOR') {
            attendanceByDate[date].surveyors += 1;
          }
        }
      }
    });

    // Convert to events for the calendar
    return Object.keys(attendanceByDate).map(date => ({
      id: date,
      title: `Supervisors: ${attendanceByDate[date].supervisors}, Surveyors: ${attendanceByDate[date].surveyors}`,
      start: new Date(date),
      end: new Date(date),
      supervisors: attendanceByDate[date].supervisors,
      surveyors: attendanceByDate[date].surveyors,
      total: attendanceByDate[date].total,
      allDay: true
    }));
  };

  // Simplified event component to display attendance counts
  const EventComponent = ({ event }) => {
    return (
      <Tooltip
        title={`Total: ${event.total} (${event.supervisors} Supervisors, ${event.surveyors} Surveyors)`}
        arrow
      >
        <Card
          sx={{
            p: 1,
            height: '100%',
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            cursor: 'pointer',
            '&:hover': {
              boxShadow: 2,
            }
          }}
        >
          <Chip
            icon={<SupervisorAccountIcon />}
            label={event.supervisors}
            size="small"
            color="primary"
            variant="filled"
          />
          <Chip
            icon={<PersonIcon />}
            label={event.surveyors}
            size="small"
            color="secondary"
            variant="filled"
          />
        </Card>
      </Tooltip>
    );
  };

  // Simplified custom toolbar
  const CustomToolbar = (toolbar) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      // Prevent navigation to future months
      const nextMonth = moment(toolbar.date).add(1, 'month').startOf('month');
      if (nextMonth.isAfter(moment(), 'month')) {
        return;
      }
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {moment(toolbar.date).format('MMMM YYYY')}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={goToBack} size="small">
            <NavigateBeforeIcon />
          </IconButton>
          
          <IconButton onClick={goToCurrent} size="small" color="primary">
            <TodayIcon />
          </IconButton>
          
          <IconButton onClick={goToNext} size="small">
            <NavigateNextIcon />
          </IconButton>
        </Box>
      </Box>
    );
  };

  return (
    <ErrorBoundary>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          Attendance Calendar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Daily attendance overview for supervisors and surveyors
        </Typography>
        
        {/* Simple Legend */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">Legend:</Typography>
          <Chip
            icon={<SupervisorAccountIcon />}
            label="Supervisors"
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<PersonIcon />}
            label="Surveyors"
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : (!attendanceData || !users || attendanceData.length === 0 || users.length === 0) ? (
          <Alert severity="info" sx={{ my: 2 }}>
            No attendance data available for the selected period.
          </Alert>
        ) : (
          <Paper sx={{ p: 2, height: 600 }}>
            <Calendar
              localizer={localizer}
              events={getCalendarEvents()}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={["month"]}
              onNavigate={handleNavigate}
              components={{
                toolbar: CustomToolbar,
                event: EventComponent
              }}
              tooltipAccessor={null}
            />
          </Paper>
        )}
      </Box>
    </ErrorBoundary>
  );
};

export default AttendanceCalendarView;
