import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Create a localizer for the calendar
const localizer = momentLocalizer(moment);

const AttendanceCalendarView = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Define API URLs - using environment variables if available
  const ATTENDANCE_API_URL = import.meta.env.VITE_ATTENDANCE_API_URL || 'https://attendance.annuprojects.com/api';
  const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'https://api.annuprojects.com/api';

  // Create a memoized fetchData function
  const fetchData = useCallback(async (date) => {
    try {
      setLoading(true);
      
      // Get month and year from the provided date
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      // Fetch attendance data for the selected month
      const attendanceResponse = await axios.get(`${ATTENDANCE_API_URL}/attendance/all`, {
        params: { month, year },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Fetch user data to get roles
      const userResponse = await axios.get(`${AUTH_API_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setAttendanceData(attendanceResponse.data.data || []);
      setUsers(userResponse.data.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load attendance data: ' + err.message);
      setLoading(false);
    }
  }, [ATTENDANCE_API_URL, AUTH_API_URL]);

  // Effect to fetch data when date changes
  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate, fetchData]);
  
  // Handle calendar navigation (prev/next month)
  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
  };
  
  // Process data to get attendance counts by date
  const getCalendarEvents = () => {
    // Create a map to store attendance counts by date
    const attendanceByDate = {};
    
    // Process attendance records
    attendanceData.forEach(record => {
      if (record.status === 'present' || record.status === 'late') {
        const date = moment(record.date).format('YYYY-MM-DD');
        
        if (!attendanceByDate[date]) {
          attendanceByDate[date] = {
            supervisors: 0,
            surveyors: 0
          };
        }
        
        // Find user to determine role
        const user = users.find(u => u._id === record.userId);
        if (user) {
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
      allDay: true
    }));
  };

  // Custom event component to display attendance counts
  const EventComponent = ({ event }) => (
    <div style={{ fontSize: '0.8rem', padding: '2px' }}>
      <div><strong>S:</strong> {event.supervisors}</div>
      <div><strong>SV:</strong> {event.surveyors}</div>
    </div>
  );

  return (
    <div>
      <Typography variant="h6" component="h2">
        Attendance Calendar View
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Showing counts of supervisors (S) and surveyors (SV) present each day. 
        Navigate between months using the calendar controls.
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : (
        <Box 
          sx={{ 
            height: '600px', 
            bgcolor: '#ffffff', 
            borderRadius: 1, 
            p: 2, 
            mt: 2,
            border: '1px solid #e0e0e0'
          }}
        >
          <Calendar
            localizer={localizer}
            events={getCalendarEvents()}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            components={{
              event: EventComponent
            }}
            views={['month']}
            defaultView="month"
            date={currentDate}
            onNavigate={handleNavigate}
          />
        </Box>
      )}
    </div>
  );
};

export default AttendanceCalendarView; 