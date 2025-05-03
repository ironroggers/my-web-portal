import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  CircularProgress,
  TextField,
  Grid,
  Box,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Autocomplete,
  Card,
  CardContent,
  Button,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Badge
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { enUS } from 'date-fns/locale';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TableViewIcon from '@mui/icons-material/TableView';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HistoryIcon from '@mui/icons-material/History';
import { BarChart } from '@mui/x-charts/BarChart';
import { addMonths, subMonths, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import './AttendancePage.css';

// Calendar localization setup
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Custom event component for the calendar
const EventComponent = ({ event }) => {
  const statusColor = 
    event.status === 'present' ? '#4caf50' : 
    event.status === 'late' ? '#ff9800' : '#f44336';
  
  return (
    <Tooltip 
      title={
        <div>
          <p><strong>User:</strong> {event.username}</p>
          <p><strong>Check In:</strong> {event.checkIn}</p>
          <p><strong>Check Out:</strong> {event.checkOut}</p>
          <p><strong>Work Hours:</strong> {event.workHours || 'N/A'}</p>
          <p><strong>Status:</strong> {event.status}</p>
          {event.justification && <p><strong>Justification:</strong> {event.justification}</p>}
        </div>
      }
      arrow
      placement="top"
    >
      <div style={{ 
        backgroundColor: statusColor, 
        color: 'white', 
        height: '100%', 
        width: '100%',
        borderRadius: '4px',
        padding: '2px 4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {event.username} ({event.status})
      </div>
    </Tooltip>
  );
};

// Stats overview component
const AttendanceStats = ({ attendanceData }) => {
  // Calculate attendance stats for today
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to beginning of the day
  
  const todayRecords = attendanceData.filter(record => {
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  });
  
  const supervisors = todayRecords.filter(r => r.userRole === 'SUPERVISOR');
  const surveyors = todayRecords.filter(r => r.userRole === 'SURVEYOR');
  
  const presentSupervisors = supervisors.filter(r => r.status === 'present' || r.status === 'late');
  const presentSurveyors = surveyors.filter(r => r.status === 'present' || r.status === 'late');
  
  return (
    <Grid container spacing={2} className="stats-container">
      <Grid item xs={12} md={4}>
        <Card className="stats-card">
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <SupervisorAccountIcon color="primary" sx={{ fontSize: 28, mr: 1 }} />
              <Typography variant="h6">Supervisors</Typography>
            </Box>
            <Typography variant="h4" color="primary" align="center">
              {presentSupervisors.length} / {supervisors.length}
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center">
              Present Today
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card className="stats-card">
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <PersonIcon color="primary" sx={{ fontSize: 28, mr: 1 }} />
              <Typography variant="h6">Surveyors</Typography>
            </Box>
            <Typography variant="h4" color="primary" align="center">
              {presentSurveyors.length} / {surveyors.length}
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center">
              Present Today
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card className="stats-card">
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <PeopleAltIcon color="primary" sx={{ fontSize: 28, mr: 1 }} />
              <Typography variant="h6">Total</Typography>
            </Box>
            <Typography variant="h4" color="primary" align="center">
              {presentSupervisors.length + presentSurveyors.length} / {supervisors.length + surveyors.length}
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center">
              Present Today
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Table view component
const AttendanceTable = ({ attendanceData, selectedUser }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filter data for selected user if necessary
  const filteredData = selectedUser 
    ? attendanceData.filter(record => record.userId === selectedUser.id)
    : attendanceData;
  
  // Sort data by date (newest first)
  const sortedData = [...filteredData].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format time for display
  const formatTime = (timeString) => {
    return timeString 
      ? new Date(timeString).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';
  };
  
  // Get status chip color and icon
  const getStatusChip = (status) => {
    let color = 'default';
    let label = status;
    
    if (status === 'present') {
      color = 'success';
    } else if (status === 'late') {
      color = 'warning';
    } else if (status === 'absent') {
      color = 'error';
    }
    
    return (
      <Chip 
        label={label.charAt(0).toUpperCase() + label.slice(1)} 
        color={color} 
        size="small" 
        variant="outlined"
      />
    );
  };
  
  return (
    <div className="attendance-table-container">
      <TableContainer component={Paper} sx={{ mb: 2, borderRadius: '8px' }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Check In</TableCell>
              <TableCell>Check Out</TableCell>
              <TableCell>Work Hours</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((record) => (
                <TableRow 
                  key={record._id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>{record.username}</TableCell>
                  <TableCell>{record.userRole}</TableCell>
                  <TableCell>{formatTime(record.checkInTime)}</TableCell>
                  <TableCell>{formatTime(record.checkOutTime)}</TableCell>
                  <TableCell>{record.workHours || 'N/A'}</TableCell>
                  <TableCell>{getStatusChip(record.status)}</TableCell>
                </TableRow>
              ))}
              
            {sortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    No attendance records found for the selected filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={sortedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </div>
  );
};

// History View Component
const AttendanceHistory = ({ attendanceData, selectedUser, currentMonth }) => {
  // Calculate data for the past 6 months
  const generateHistoryData = () => {
    const today = new Date(currentMonth);
    const months = [];
    const presentCounts = [];
    const lateCounts = [];
    const absentCounts = [];
    
    // Generate data for past 6 months (including current)
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const monthLabel = format(monthDate, 'MMM yyyy');
      months.push(monthLabel);
      
      // Filter attendance data for this month
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthData = attendanceData.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= monthStart && recordDate <= monthEnd;
      });
      
      // Filter for selected user if specified
      const filteredData = selectedUser 
        ? monthData.filter(record => record.userId === selectedUser.id)
        : monthData;
      
      // Count by status
      const present = filteredData.filter(record => record.status === 'present').length;
      const late = filteredData.filter(record => record.status === 'late').length;
      const absent = filteredData.filter(record => record.status === 'absent').length;
      
      presentCounts.push(present);
      lateCounts.push(late);
      absentCounts.push(absent);
    }
    
    return { months, presentCounts, lateCounts, absentCounts };
  };
  
  const { months, presentCounts, lateCounts, absentCounts } = generateHistoryData();
  
  return (
    <div className="history-view-container">
      <Card className="history-card" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Monthly Attendance Summary</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            View attendance trends over the past 6 months {selectedUser ? `for ${selectedUser.username}` : 'for all users'}
          </Typography>
          
          <Box sx={{ mt: 3, height: 350 }}>
            <BarChart
              series={[
                { data: presentCounts, label: 'Present', color: '#4caf50' },
                { data: lateCounts, label: 'Late', color: '#ff9800' },
                { data: absentCounts, label: 'Absent', color: '#f44336' }
              ]}
              xAxis={[{ data: months, scaleType: 'band' }]}
              yAxis={[{ label: 'Number of Records' }]}
              legend={{ hidden: false }}
              height={300}
              margin={{ top: 20, right: 30, bottom: 50, left: 50 }}
            />
          </Box>
        </CardContent>
      </Card>
      
      {/* Daily breakdown for current month */}
      <Card className="history-card">
        <CardContent>
          <Typography variant="h6">Daily Attendance Breakdown</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Current month daily breakdown {selectedUser ? `for ${selectedUser.username}` : 'for all users'}
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" color="textSecondary" align="center">
              {!selectedUser 
                ? "Select a user to see their detailed daily attendance"
                : "Daily breakdown visualization will be implemented in the next phase"}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

const AttendancePage = () => {
  // State for attendance data
  const [attendance, setAttendance] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for users
  const [users, setUsers] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  
  // Filter state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState(null);
  
  // UI state
  const [view, setView] = useState('calendar'); // 'calendar', 'table', or 'history'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Date picker state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [monthYearAnchorEl, setMonthYearAnchorEl] = useState(null);
  
  // Available years for selection (last 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Load data on component mount
  useEffect(() => {
    fetchUsers();
    fetchAttendance();
  }, []);

  // Convert attendance data to calendar events when attendance or filters change
  useEffect(() => {
    const events = convertToCalendarEvents(attendance);
    setCalendarEvents(events);
  }, [attendance, selectedUser]);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_AUTH_API_URL}/auth/users`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      
      const userData = await response.json();
      
      if (!userData.success || !Array.isArray(userData.data)) {
        throw new Error('Invalid data format received from Auth API');
      }
      
      const allUsers = userData.data;
      
      // Create user options for autocomplete
      const options = allUsers.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        reportingTo: user.reportingTo || null,
        label: `${user.username} (${user.role})` // Label for display in autocomplete
      }));
      
      setUsers(allUsers);
      setUserOptions(options);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback with mock users
      const mockUsers = [
        { id: '1', username: 'surveyor1', role: 'SURVEYOR', reportingTo: '101', label: 'surveyor1 (SURVEYOR)' },
        { id: '2', username: 'surveyor2', role: 'SURVEYOR', reportingTo: '101', label: 'surveyor2 (SURVEYOR)' },
        { id: '3', username: 'surveyor3', role: 'SURVEYOR', reportingTo: '102', label: 'surveyor3 (SURVEYOR)' },
        { id: '4', username: 'supervisor1', role: 'SUPERVISOR', reportingTo: null, label: 'supervisor1 (SUPERVISOR)' },
        { id: '5', username: 'supervisor2', role: 'SUPERVISOR', reportingTo: null, label: 'supervisor2 (SUPERVISOR)' }
      ];
      setUserOptions(mockUsers);
    }
  };

  // Fetch attendance data
  const fetchAttendance = async (date = new Date()) => {
    try {
      setLoading(true);
      
      // Format date for API
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      // Use the getAllAttendance endpoint
      const response = await fetch(`https://surveytoolbackend.onrender.com/api/attendance/all?month=${month}&year=${year}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Get user information for each attendance record
        const enrichedAttendance = await enrichAttendanceWithUserData(data.data);
        setAttendance(enrichedAttendance);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError(err.message || 'An error occurred while fetching attendance data');
      // Use mock data in case of error
      setAttendance(generateMockAttendanceData());
    } finally {
      setLoading(false);
    }
  };

  // Enrich attendance data with user information
  const enrichAttendanceWithUserData = async (attendanceData) => {
    if (users.length === 0) {
      // If users aren't loaded yet, fetch them first
      await fetchUsers();
    }
    
    return attendanceData.map(record => {
      const user = users.find(u => u._id === record.userId) || {};
      return {
        ...record,
        username: user.username || 'Unknown User',
        userRole: user.role || 'Unknown',
        supervisorId: user.reportingTo || null
      };
    });
  };

  // Convert attendance data to calendar events
  const convertToCalendarEvents = (attendanceData) => {
    // Filter by selected user if one is selected
    const filteredData = selectedUser 
      ? attendanceData.filter(record => record.userId === selectedUser.id)
      : attendanceData;
    
    return filteredData.map(record => {
      const startDate = new Date(record.date);
      // For all-day events, the end date must be one day after start date
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      return {
        id: record._id,
        title: `${record.username} (${record.status})`,
        start: startDate,
        end: endDate,
        allDay: true,
        status: record.status,
        username: record.username,
        checkIn: record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : 'N/A',
        checkOut: record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'N/A',
        workHours: record.workHours,
        justification: record.justification,
        justificationStatus: record.justificationStatus
      };
    });
  };

  // Handle date navigation in calendar
  const handleNavigate = (date) => {
    setCurrentMonth(date);
    // Fetch data for the new month
    fetchAttendance(date);
  };

  // Handle user selection change
  const handleUserChange = (event, newValue) => {
    setSelectedUser(newValue);
  };

  // Handle view change
  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    fetchUsers();
    fetchAttendance(currentMonth);
  };

  // Clear selected user
  const handleClearUser = () => {
    setSelectedUser(null);
  };

  // Generate mock data for testing
  const generateMockAttendanceData = () => {
    const mockData = [];
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Mock users
    const mockUsers = [
      { id: '1', username: 'surveyor1', role: 'SURVEYOR', supervisorId: '101' },
      { id: '2', username: 'surveyor2', role: 'SURVEYOR', supervisorId: '101' },
      { id: '3', username: 'surveyor3', role: 'SURVEYOR', supervisorId: '102' },
      { id: '4', username: 'supervisor1', role: 'SUPERVISOR', supervisorId: null },
      { id: '5', username: 'supervisor2', role: 'SUPERVISOR', supervisorId: null }
    ];
    
    // Generate random attendance records for each user for the current month
    mockUsers.forEach(user => {
      for (let day = new Date(startOfMonth); day <= endOfMonth; day.setDate(day.getDate() + 1)) {
        // Skip weekends
        if (day.getDay() === 0 || day.getDay() === 6) continue;
        
        // 80% chance of being present, 10% late, 10% absent
        const rand = Math.random();
        const status = rand < 0.8 ? 'present' : rand < 0.9 ? 'late' : 'absent';
        
        // Only include check-in/out times if present or late
        let checkInTime = null;
        let checkOutTime = null;
        let workHours = null;
        
        if (status !== 'absent') {
          const baseHour = status === 'present' ? 9 : 10; // Later for 'late' status
          const checkInHour = baseHour + Math.random() * 0.5; // Random variation
          const checkInDate = new Date(day);
          checkInDate.setHours(checkInHour, Math.floor(Math.random() * 60));
          checkInTime = checkInDate;
          
          const checkOutHour = 17 + Math.random() * 1; // Between 5 PM and 6 PM
          const checkOutDate = new Date(day);
          checkOutDate.setHours(checkOutHour, Math.floor(Math.random() * 60));
          checkOutTime = checkOutDate;
          
          workHours = parseFloat((checkOutHour - checkInHour).toFixed(2));
        }
        
        mockData.push({
          _id: `mock-${user.id}-${day.toISOString().split('T')[0]}`,
          userId: user.id,
          username: user.username,
          userRole: user.role,
          supervisorId: user.supervisorId,
          date: new Date(day),
          status,
          checkInTime,
          checkOutTime,
          workHours,
          justification: status === 'absent' ? 'Personal emergency' : '',
          justificationStatus: status === 'absent' ? 'pending' : 'not_required'
        });
      }
    });
    
    return mockData;
  };

  // Month/Year selection
  const handleMonthYearMenuOpen = (event) => {
    setMonthYearAnchorEl(event.currentTarget);
  };

  const handleMonthYearMenuClose = () => {
    setMonthYearAnchorEl(null);
  };

  const handleDatePickerChange = (newDate) => {
    setCurrentMonth(newDate);
    fetchAttendance(newDate);
    setDatePickerOpen(false);
  };
  
  const handleMonthNavigation = (direction) => {
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (direction === 'next') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentMonth(newDate);
    fetchAttendance(newDate);
  };

  // Generate month name for display
  const getCurrentMonthDisplay = () => {
    return format(currentMonth, 'MMMM yyyy');
  };

  return (
    <div className="attendance-container">
      <Paper elevation={3} className="attendance-paper">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1">
            Attendance Dashboard
          </Typography>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* Month Navigation */}
        <Box mb={3} display="flex" justifyContent="center" alignItems="center" className="month-navigation">
          <Tooltip title="Previous Month">
            <IconButton onClick={() => handleMonthNavigation('prev')} color="primary">
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div className="month-year-selector">
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => setDatePickerOpen(true)} 
                endIcon={<CalendarMonthIcon />}
                sx={{ minWidth: '200px' }}
              >
                {getCurrentMonthDisplay()}
              </Button>
              
              <DatePicker
                views={['year', 'month']}
                label="Year and Month"
                minDate={new Date(currentYear - 5, 0, 1)}
                maxDate={new Date(currentYear + 1, 11, 31)}
                value={currentMonth}
                onChange={handleDatePickerChange}
                open={datePickerOpen}
                onClose={() => setDatePickerOpen(false)}
                slotProps={{
                  textField: { 
                    style: { display: 'none' } 
                  }
                }}
              />
            </div>
          </LocalizationProvider>
          
          <Tooltip title="Next Month">
            <IconButton onClick={() => handleMonthNavigation('next')} color="primary">
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* Attendance Overview Stats */}
        {!loading && !error && (
          <Box mb={4}>
            <AttendanceStats attendanceData={attendance} />
          </Box>
        )}
        
        {/* User Search Autocomplete */}
        <Box mb={3}>
          <Autocomplete
            id="user-search"
            options={userOptions}
            getOptionLabel={(option) => option.label}
            value={selectedUser}
            onChange={handleUserChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search by name"
                variant="outlined"
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <SearchIcon color="action" style={{ marginRight: 8 }} />
                      {params.InputProps.startAdornment}
                    </>
                  )
                }}
              />
            )}
          />
        </Box>
        
        {/* View Selector Tabs */}
        <Box mb={2} display="flex" justifyContent="center">
          <Tabs
            value={view}
            onChange={handleViewChange}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab 
              value="calendar" 
              label="Calendar View" 
              icon={<CalendarMonthIcon />}
              iconPosition="start"
            />
            <Tab 
              value="table" 
              label="Table View" 
              icon={<TableViewIcon />}
              iconPosition="start"
            />
            <Tab 
              value="history" 
              label="History View" 
              icon={<HistoryIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>
        
        {/* Active Filter Display */}
        <Box mb={2} display="flex" flexWrap="wrap" gap={1}>
          {selectedUser && (
            <Chip 
              label={`User: ${selectedUser.username}`} 
              onDelete={handleClearUser}
              color="primary"
              variant="outlined"
            />
          )}
          <Chip 
            label={`Month: ${getCurrentMonthDisplay()}`} 
            color="primary"
            variant="outlined"
            icon={<CalendarMonthIcon />}
          />
        </Box>
        
        {loading ? (
          <div className="loading-container">
            <CircularProgress />
            <Typography>Loading attendance data...</Typography>
          </div>
        ) : error ? (
          <div className="error-container">
            <Typography color="error">{error}</Typography>
          </div>
        ) : (
          <>
            {view === 'calendar' ? (
              <div className="calendar-container">
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 650 }}
                  views={['month']}
                  defaultView="month"
                  date={currentMonth}
                  onNavigate={handleNavigate}
                  components={{
                    event: EventComponent,
                    toolbar: CustomToolbar
                  }}
                  eventPropGetter={(event) => {
                    // Basic styling for different status types
                    let backgroundColor = '#4caf50'; // Default green for present
                    
                    if (event.status === 'late') {
                      backgroundColor = '#ff9800'; // Orange for late
                    } else if (event.status === 'absent') {
                      backgroundColor = '#f44336'; // Red for absent
                    }
                    
                    return {
                      style: {
                        backgroundColor,
                        border: 'none'
                      }
                    };
                  }}
                />
              </div>
            ) : view === 'table' ? (
              <div className="table-container">
                <Typography variant="h6" component="h2" align="center" gutterBottom>
                  Attendance Records
                </Typography>
                <AttendanceTable 
                  attendanceData={attendance} 
                  selectedUser={selectedUser}
                />
              </div>
            ) : (
              <div className="history-container">
                <Typography variant="h6" component="h2" align="center" gutterBottom>
                  Attendance History
                </Typography>
                <AttendanceHistory 
                  attendanceData={attendance} 
                  selectedUser={selectedUser}
                  currentMonth={currentMonth}
                />
              </div>
            )}
          </>
        )}
      </Paper>
    </div>
  );
};

// Add custom toolbar component to hide default buttons
const CustomToolbar = () => null; // Empty toolbar component to hide all default buttons

export default AttendancePage; 