import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  useTheme,
  alpha,
  Chip,
  Tooltip
} from '@mui/material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import TodayIcon from '@mui/icons-material/Today';
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

const AttendanceCalendarView = () => {
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

    // Create a map to store attendance counts by date
    const attendanceByDate = {};

    // Process attendance records
    attendanceData.forEach(record => {
      if (record.status === 'present' || record.status === 'late') {
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

  // Custom event component to display attendance counts
  const EventComponent = ({ event }) => {
    // Calculate color intensity based on attendance counts
    const maxSupervisors = 10; // Adjust based on your expected maximum
    const maxSurveyors = 20; // Adjust based on your expected maximum

    // Separate intensity for each role type for better visualization
    const supervisorIntensity = Math.min(event.supervisors / maxSupervisors, 1) * 0.7 + 0.3;
    const surveyorIntensity = Math.min(event.surveyors / maxSurveyors, 1) * 0.7 + 0.3;

    return (
      <Tooltip
        title={
          <Box sx={{ p: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Total Attendance: {event.total}
            </Typography>
            <Box component="div" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
              <Typography variant="caption">
                Supervisors: {event.supervisors}
              </Typography>
              <Typography variant="caption">
                Surveyors: {event.surveyors}
              </Typography>
            </Box>
          </Box>
        }
        arrow
        placement="top"
      >
        <Box
          sx={{
            fontSize: '0.85rem',
            padding: '8px',
            background: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            borderRadius: '6px',
            height: '100%',
            boxShadow: theme.shadows[1],
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: theme.shadows[2],
              transform: 'translateY(-1px)',
              borderColor: theme.palette.primary.main,
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                Supervisors
              </Typography>
            </Box>
            <Box
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: '#fff',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                minWidth: '24px',
                textAlign: 'center',
                boxShadow: `0 0 0 ${Math.round(supervisorIntensity * 6)}px ${alpha(theme.palette.primary.main, 0.15)}`
              }}
            >
              {event.supervisors}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.secondary.main
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                Surveyors
              </Typography>
            </Box>
            <Box
              sx={{
                backgroundColor: theme.palette.secondary.main,
                color: '#fff',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                minWidth: '24px',
                textAlign: 'center',
                boxShadow: `0 0 0 ${Math.round(surveyorIntensity * 6)}px ${alpha(theme.palette.secondary.main, 0.15)}`
              }}
            >
              {event.surveyors}
            </Box>
          </Box>
        </Box>
      </Tooltip>
    );
  };

  // Custom toolbar formatter for better month display
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

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {date.format('MMMM YYYY')}
          </Typography>
        </Box>
      );
    };

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 2,
          justifyContent: 'space-between',
          px: 1.5,
          py: 1.5,
          borderRadius: 1.5,
          background: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.6)
            : alpha(theme.palette.primary.main, 0.02),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`
        }}
      >
        <Box>
          {label()}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Previous Month" arrow>
            <Box
              onClick={goToBack}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                color: theme.palette.text.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                  borderColor: theme.palette.divider
                }
              }}
            >
              <NavigateBeforeIcon fontSize="small" />
            </Box>
          </Tooltip>

          <Tooltip title="Today" arrow>
            <Box
              onClick={goToCurrent}
              sx={{
                border: `1px solid ${theme.palette.primary.main}`,
                background: theme.palette.primary.main,
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                color: theme.palette.primary.contrastText,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                boxShadow: theme.shadows[1],
                transition: 'all 0.2s',
                '&:hover': {
                  background: theme.palette.primary.dark,
                  boxShadow: theme.shadows[2]
                }
              }}
            >
              <TodayIcon fontSize="small" />
              <Typography variant="button" sx={{ fontWeight: 600 }}>Today</Typography>
            </Box>
          </Tooltip>

          <Tooltip title="Next Month" arrow>
            <Box
              onClick={goToNext}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                color: theme.palette.text.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                  borderColor: theme.palette.divider
                }
              }}
            >
              <NavigateNextIcon fontSize="small" />
            </Box>
          </Tooltip>
        </Box>
      </Box>
    );
  };

  return (
    <ErrorBoundary>
      <Paper
        elevation={1}
        sx={{
          p: 3,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1],
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <PeopleAltIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Attendance Calendar
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="textSecondary"
          sx={{
            mb: 3,
            maxWidth: '90%',
            lineHeight: 1.5
          }}
        >
          This calendar displays daily attendance records showing the number of supervisors and surveyors present each day.
        </Typography>

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              p: 8,
              gap: 2
            }}
          >
            <CircularProgress size={40} thickness={4} color="primary" />
            <Typography variant="body2" color="textSecondary">Loading attendance data...</Typography>
          </Box>
        ) : error ? (
          <Alert
            severity="error"
            sx={{
              mt: 2,
              borderRadius: 2,
              boxShadow: theme.shadows[1]
            }}
          >
            {error}
          </Alert>
        ) : (!attendanceData || !users || attendanceData.length === 0 || users.length === 0) ? (
          <Alert
            severity="info"
            sx={{
              mt: 2,
              borderRadius: 2,
              boxShadow: theme.shadows[1]
            }}
          >
            No attendance data available for the selected period.
          </Alert>
        ) : (
          <Box
            sx={{
              height: '680px',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.shadows[1],
              '& .rbc-header': {
                fontWeight: 600,
                padding: '12px 0',
                background: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.primary.dark, 0.3)
                  : alpha(theme.palette.primary.light, 0.15),
                color: theme.palette.text.primary,
                borderBottom: `1px solid ${theme.palette.divider}`,
                fontSize: '0.9rem'
              },
              '& .rbc-month-view': {
                border: 'none',
                backgroundColor: theme.palette.background.paper
              },
              '& .rbc-day-bg': {
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.action.hover, 0.05)
                }
              },
              '& .rbc-day-bg.rbc-today': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.3)}`
              },
              '& .rbc-off-range-bg': {
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.action.disabled, 0.1)
                  : alpha(theme.palette.action.disabled, 0.04)
              },
              '& .rbc-date-cell': {
                padding: '5px 8px',
                textAlign: 'center',
                fontSize: '0.9rem'
              },
              '& .rbc-date-cell.rbc-now': {
                fontWeight: 'bold',
                color: theme.palette.primary.main
              },
              '& .rbc-month-row': {
                borderColor: theme.palette.divider
              },
              '& .rbc-row-content': {
                paddingRight: 1
              },
              '& .rbc-show-more': {
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
                color: theme.palette.primary.main,
                fontWeight: 600,
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.8rem'
              }
            }}
          >
            <Calendar
              localizer={localizer}
              events={getCalendarEvents()}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              components={{
                event: EventComponent,
                toolbar: CustomToolbar
              }}
              views={['month']}
              defaultView="month"
              date={currentDate}
              onNavigate={handleNavigate}
              popup={true}
              eventPropGetter={() => ({
                style: {
                  borderRadius: '0px'
                }
              })}
            />
          </Box>
        )}
      </Paper>
    </ErrorBoundary>
  );
};

export default AttendanceCalendarView;
