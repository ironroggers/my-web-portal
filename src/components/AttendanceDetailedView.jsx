import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Collapse,
  IconButton,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  Avatar,
  Tooltip,
  useTheme
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import axios from 'axios';
import moment from 'moment';
import {ATTENDANCE_URL, AUTH_URL} from "../API/api-keys.jsx";

// Define API URLs - using environment variables if available
const ATTENDANCE_API_URL = ATTENDANCE_URL+'/api';
const AUTH_API_URL = AUTH_URL+'/api';

const AttendanceDetailedView = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userType, setUserType] = useState('all');
  const [users, setUsers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [weekStart, setWeekStart] = useState(moment().startOf('week').toDate());
  const [locationNames, setLocationNames] = useState({});
  const locationNamesRef = useRef(locationNames);

  // Update ref when locationNames changes
  useEffect(() => {
    locationNamesRef.current = locationNames;
  }, [locationNames]);

  // Fetch users and their attendance data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all users
      const userResponse = await axios.get(`${AUTH_API_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Calculate the date range (current week)
      const startDate = moment(weekStart).format('YYYY-MM-DD');
      const endDate = moment(weekStart).add(6, 'days').format('YYYY-MM-DD');

      // Fetch all attendance records for the week
      const attendanceResponse = await axios.get(`${ATTENDANCE_API_URL}/attendance/all`, {
        params: {
          startDate,
          endDate
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Process the data
      const userData = userResponse.data.data || [];

      // Group attendance by user ID
      const attendanceByUser = {};
      const newLocations = {};
      
      (attendanceResponse.data.data || []).forEach(record => {
        if (!attendanceByUser[record.userId]) {
          attendanceByUser[record.userId] = [];
        }
        attendanceByUser[record.userId].push(record);
        
        // Store location coordinates for reverse geocoding
        if (record.location && record.location.coordinates && record.location.coordinates.length === 2) {
          const locKey = `${record.location.coordinates[1]},${record.location.coordinates[0]}`;
          if (!locationNamesRef.current[locKey]) {
            newLocations[locKey] = true;
          }
        }
      });

      setUsers(userData);
      setAttendanceData(attendanceByUser);
      setLoading(false);

      // Fetch location names separately to avoid dependency issues
      fetchLocationNames(newLocations);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load attendance data: ' + err.message);
      setLoading(false);
    }
  }, [weekStart]); // Only depend on weekStart

  // Separate function for fetching location names
  const fetchLocationNames = async (locations) => {
    const locationKeys = Object.keys(locations);
    if (locationKeys.length === 0) return;
    
    const newLocationNames = {...locationNamesRef.current};
    
    for (const locKey of locationKeys) {
      try {
        const [lat, lng] = locKey.split(',');
        const geoResponse = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
          params: {
            format: 'json',
            lat,
            lon: lng,
            zoom: 18,
            addressdetails: 1
          },
          headers: {
            'User-Agent': 'AttendanceApp'
          }
        });
        
        if (geoResponse.data && geoResponse.data.display_name) {
          newLocationNames[locKey] = geoResponse.data.display_name;
        }
        
        // Add a small delay to avoid overwhelming the Nominatim API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error fetching location name:', error);
      }
    }
    
    setLocationNames(newLocationNames);
  };

  // Effect to fetch data on component mount and when week changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setUserType(newValue);
    setSelectedUser(null); // Reset selected user when changing tabs
  };

  // Handle user selection
  const handleUserSelect = (userId) => {
    setSelectedUser(selectedUser === userId ? null : userId);
  };

  // Filter users based on tab selection
  const filteredUsers = users.filter(user => {
    if (userType === 'all') return true;
    if (userType === 'supervisors') return user.role === 'SUPERVISOR';
    if (userType === 'surveyors') return user.role === 'SURVEYOR';
    return true;
  });

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'present': return theme.palette.success.main;
      case 'absent': return theme.palette.error.main;
      case 'late': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch(status) {
      case 'present': return <CheckCircleIcon fontSize="small" />;
      case 'absent': return <CancelIcon fontSize="small" />;
      case 'late': return <ScheduleIcon fontSize="small" />;
      default: return null;
    }
  };

  // Get user attendance for a specific date
  const getUserAttendanceForDate = (userId, date) => {
    const formattedDate = moment(date).format('YYYY-MM-DD');
    const userAttendance = attendanceData[userId] || [];
    return userAttendance.find(record =>
      moment(record.date).format('YYYY-MM-DD') === formattedDate
    ) || { status: 'absent' };
  };

  // Generate dates for the current week
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(moment(weekStart).add(i, 'days').toDate());
    }
    return dates;
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setWeekStart(moment(weekStart).subtract(1, 'week').toDate());
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const nextWeek = moment(weekStart).add(1, 'week');
    // Only allow navigation if next week is not in the future
    if (nextWeek.isSameOrBefore(moment(), 'week')) {
      setWeekStart(nextWeek.toDate());
    }
  };

  // Navigate to current week
  const goToCurrentWeek = () => {
    setWeekStart(moment().startOf('week').toDate());
  };

  // Get the location name from coordinates
  const getLocationName = (location) => {
    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      return '-';
    }
    
    const locKey = `${location.coordinates[1]},${location.coordinates[0]}`;
    return locationNames[locKey] || location.address || 'Unknown location';
  };

  // Attendance detail row component
  const AttendanceDetailRow = ({ userId }) => {
    const user = users.find(u => u._id === userId) || {};
    const weekDates = getWeekDates();
    const userAttendance = attendanceData[userId] || [];
    const today = moment().startOf('day');

    // Calculate attendance stats (only count past dates)
    const pastDates = weekDates.filter(date => moment(date).isSameOrBefore(today));
    const totalPastDays = pastDates.length;
    
    let presentDays = 0;
    let lateDays = 0;
    
    pastDates.forEach(date => {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const attendance = userAttendance.find(a => 
        moment(a.date).format('YYYY-MM-DD') === formattedDate
      );
      
      if (attendance) {
        if (attendance.status === 'present') presentDays++;
        if (attendance.status === 'late') lateDays++;
      }
    });
    
    const absentDays = totalPastDays - presentDays - lateDays;

    return (
      <TableRow>
        <TableCell colSpan={9}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Weekly Attendance: {user.username || 'Unknown User'}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" color="textSecondary">Present</Typography>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={presentDays}
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" color="textSecondary">Late</Typography>
                      <Chip
                        icon={<ScheduleIcon />}
                        label={lateDays}
                        color="warning"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" color="textSecondary">Absent</Typography>
                      <Chip
                        icon={<CancelIcon />}
                        label={absentDays}
                        color="error"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Check-in</TableCell>
                    <TableCell>Check-out</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {weekDates.map((date, index) => {
                    const isFuture = moment(date).isAfter(today);
                    const attendance = getUserAttendanceForDate(userId, date);
                    const checkInTime = attendance.sessions && attendance.sessions.length > 0
                      ? moment(attendance.sessions[0].checkInTime).format('hh:mm A')
                      : '-';
                    const checkOutTime = attendance.sessions && attendance.sessions.length > 0 && attendance.sessions[0].checkOutTime
                      ? moment(attendance.sessions[0].checkOutTime).format('hh:mm A')
                      : '-';
                    const hoursWorked = attendance.sessions && attendance.sessions.length > 0 && attendance.sessions[0].checkOutTime
                      ? moment.duration(moment(attendance.sessions[0].checkOutTime).diff(moment(attendance.sessions[0].checkInTime))).asHours().toFixed(2)
                      : '-';

                    return (
                      <TableRow key={index} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                        <TableCell>{moment(date).format('dddd')}</TableCell>
                        <TableCell>{moment(date).format('MMM DD, YYYY')}</TableCell>
                        <TableCell>
                          {isFuture ? (
                            <Typography variant="body2" color="textSecondary">Upcoming</Typography>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStatusIcon(attendance.status)}
                              <Typography
                                variant="body2"
                                sx={{ color: getStatusColor(attendance.status) }}
                              >
                                {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>{isFuture ? '-' : checkInTime}</TableCell>
                        <TableCell>{isFuture ? '-' : checkOutTime}</TableCell>
                        <TableCell>{isFuture ? '-' : hoursWorked}</TableCell>
                        <TableCell>
                          {!isFuture && attendance.location ? (
                            <Tooltip title={getLocationName(attendance.location)}>
                              <Typography noWrap sx={{ maxWidth: 200 }}>
                                {getLocationName(attendance.location)}
                              </Typography>
                            </Tooltip>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  // UserRow component
  const UserRow = ({ user }) => {
    const open = selectedUser === user._id;
    const userAttendance = attendanceData[user._id] || [];
    const today = moment().startOf('day');
    
    // Get all dates in the current week that are not in the future
    const pastDates = getWeekDates().filter(date => moment(date).isSameOrBefore(today));
    const totalPastDays = pastDates.length;
    
    // Calculate attendance stats only for past dates
    let presentDays = 0;
    let lateDays = 0;
    
    pastDates.forEach(date => {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const attendance = userAttendance.find(a => 
        moment(a.date).format('YYYY-MM-DD') === formattedDate
      );
      
      if (attendance) {
        if (attendance.status === 'present') presentDays++;
        if (attendance.status === 'late') lateDays++;
      }
    });
    
    const absentDays = totalPastDays - presentDays - lateDays;
    const attendancePercentage = totalPastDays > 0 
      ? Math.round((presentDays + lateDays) / totalPastDays * 100) 
      : 0;

    return (
      <>
        <TableRow
          hover
          onClick={() => handleUserSelect(user._id)}
          sx={{
            cursor: 'pointer',
            '&:hover': {
              bgcolor: theme.palette.action.hover
            },
          }}
        >
          <TableCell>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => handleUserSelect(user._id)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  bgcolor: user.role === 'SUPERVISOR' ? theme.palette.primary.main : theme.palette.secondary.main,
                  width: 32,
                  height: 32
                }}
              >
                {user.role === 'SUPERVISOR' ? <SupervisorAccountIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
              </Avatar>
              <Typography variant="body2" fontWeight={500}>
                {user.username || 'Unknown'}
              </Typography>
            </Box>
          </TableCell>
          <TableCell>
            <Chip
              label={user.role || 'Unknown'}
              size="small"
              color={user.role === 'SUPERVISOR' ? 'primary' : 'secondary'}
              variant="outlined"
            />
          </TableCell>
          <TableCell align="center">
            <Chip
              label={presentDays}
              color="success"
              size="small"
              variant="outlined"
            />
          </TableCell>
          <TableCell align="center">
            <Chip
              label={lateDays}
              color="warning"
              size="small"
              variant="outlined"
            />
          </TableCell>
          <TableCell align="center">
            <Chip
              label={absentDays}
              color="error"
              size="small"
              variant="outlined"
            />
          </TableCell>
          <TableCell align="center">
            {attendancePercentage + '%'}
          </TableCell>
        </TableRow>
        {open && <AttendanceDetailRow userId={user._id} />}
      </>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          Detailed Attendance View
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Weekly attendance records for supervisors and surveyors
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Tabs value={userType} onChange={handleTabChange}>
              <Tab value="all" label="All" />
              <Tab value="supervisors" label="Supervisors" />
              <Tab value="surveyors" label="Surveyors" />
            </Tabs>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Previous Week">
              <IconButton size="small" onClick={goToPreviousWeek}>
                <KeyboardArrowDownIcon />
              </IconButton>
            </Tooltip>

            <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
              {moment(weekStart).format('MMM DD')} - {moment(weekStart).add(6, 'days').format('MMM DD, YYYY')}
            </Typography>

            <Tooltip title="Next Week">
              <IconButton size="small" onClick={goToNextWeek}>
                <KeyboardArrowUpIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Current Week">
              <IconButton size="small" onClick={goToCurrentWeek} color="primary">
                <ScheduleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {filteredUsers.length === 0 ? (
        <Alert severity="info">No users found</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="attendance table">
            <TableHead>
              <TableRow>
                <TableCell width="50px"></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="center">Present</TableCell>
                <TableCell align="center">Late</TableCell>
                <TableCell align="center">Absent</TableCell>
                <TableCell align="center">Attendance %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <UserRow key={user._id} user={user} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AttendanceDetailedView;
