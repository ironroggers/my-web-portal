import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  ButtonGroup,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {AUTH_URL, ATTENDANCE_URL} from "../API/api-keys.jsx";
import { staffRoleColors } from '../theme/theme';

const SERIES = [
  { key: 'supervisors', label: 'Supervisors', color: staffRoleColors.SUPERVISOR },
  { key: 'surveyors', label: 'Surveyors', color: staffRoleColors.SURVEYOR },
];

const SeriesDot = ({ color }) => (
  <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
);

// Theme the react-big-calendar month grid to match the portal
const calendarSx = (theme) => ({
  height: 640,
  '& .rbc-month-view': { border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' },
  '& .rbc-header': {
    py: 1,
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    bgcolor: '#f7f9fc',
    borderColor: 'divider',
  },
  '& .rbc-header + .rbc-header, & .rbc-day-bg + .rbc-day-bg': { borderLeftColor: theme.palette.divider },
  '& .rbc-month-row + .rbc-month-row': { borderTopColor: theme.palette.divider },
  '& .rbc-date-cell': { px: 1, pt: 0.75, fontSize: '0.8125rem', fontWeight: 500, textAlign: 'left' },
  '& .rbc-off-range': { color: 'text.disabled' },
  '& .rbc-off-range-bg': { bgcolor: 'background.default' },
  '& .rbc-today': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
  '& .rbc-now .rbc-button-link': { color: 'primary.main', fontWeight: 700 },
  '& .rbc-event, & .rbc-event.rbc-selected': {
    bgcolor: 'transparent',
    p: 0,
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
  },
  '& .rbc-row-segment': { px: 0.75, py: 0.25 },
  '& .rbc-show-more': { color: 'primary.main', fontSize: '0.75rem', bgcolor: 'transparent' },
});

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
        <Alert severity="error">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Something went wrong</Typography>
          <Typography variant="body2">{this.state.error?.message}</Typography>
        </Alert>
      );
    }
    return this.props.children;
  }
}

const AttendanceCalendarView = ({ projectFilter = 'ALL' }) => {
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

  // Event component showing the day's attendance counts per role
  const EventComponent = ({ event }) => (
    <Tooltip
      title={`Total: ${event.total} (${event.supervisors} Supervisors, ${event.surveyors} Surveyors)`}
      arrow
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          fontSize: '0.75rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.6,
        }}
      >
        {SERIES.map((series) => (
          <Box key={series.key} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <SeriesDot color={series.color} />
            {event[series.key]}
          </Box>
        ))}
      </Box>
    </Tooltip>
  );

  // Toolbar: month title, legend and navigation (no future months)
  const CustomToolbar = (toolbar) => {
    const isCurrentMonth = moment(toolbar.date).isSame(moment(), 'month');

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
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ minWidth: 160 }}>
          {moment(toolbar.date).format('MMMM YYYY')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {SERIES.map((series) => (
            <Box key={series.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <SeriesDot color={series.color} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{series.label}</Typography>
            </Box>
          ))}
        </Box>
        <ButtonGroup size="small" variant="outlined" aria-label="Month navigation">
          <Button onClick={goToBack} aria-label="Previous month">
            <ChevronLeftIcon fontSize="small" />
          </Button>
          <Button onClick={goToCurrent} disabled={isCurrentMonth}>
            This month
          </Button>
          <Button onClick={goToNext} disabled={isCurrentMonth} aria-label="Next month">
            <ChevronRightIcon fontSize="small" />
          </Button>
        </ButtonGroup>
      </Box>
    );
  };

  const hasData = attendanceData && users && attendanceData.length > 0 && users.length > 0;

  return (
    <ErrorBoundary>
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : (
        <>
          {!hasData && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No attendance data available for {moment(currentDate).format('MMMM YYYY')}.
            </Alert>
          )}
          <Box sx={calendarSx}>
            <Calendar
              localizer={localizer}
              date={currentDate}
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
          </Box>
        </>
      )}
    </ErrorBoundary>
  );
};

export default AttendanceCalendarView;
