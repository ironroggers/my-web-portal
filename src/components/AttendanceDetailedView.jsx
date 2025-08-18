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
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axios from 'axios';
import moment from 'moment';
import {ATTENDANCE_URL, AUTH_URL} from "../API/api-keys.jsx";
import { convertToExcelAndDownload } from '../utils/convertToExcelAndDownload.jsx';
import * as XLSX from 'xlsx';

// Define API URLs - using environment variables if available
const ATTENDANCE_API_URL = ATTENDANCE_URL+'/api';
const AUTH_API_URL = AUTH_URL+'/api';

const AttendanceDetailedView = ({ projectFilter = 'ALL' }) => {
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

  // Export-related state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [exportingUser, setExportingUser] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Global export state
  const [globalExportDialogOpen, setGlobalExportDialogOpen] = useState(false);
  const [globalSelectedMonth, setGlobalSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [globalExportLoading, setGlobalExportLoading] = useState(false);

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
        if (record.location) {
          if (record.location.coordinates && record.location.coordinates.length === 2) {
            const locKey = `${record.location.coordinates[1]},${record.location.coordinates[0]}`; // lat,lng
            if (!locationNamesRef.current[locKey]) {
              newLocations[locKey] = true;
            }
          } else if (
            record.location.latitude !== undefined &&
            record.location.longitude !== undefined
          ) {
            const lat = Number(record.location.latitude);
            const lng = Number(record.location.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              const locKey = `${lat},${lng}`;
              if (!locationNamesRef.current[locKey]) {
                newLocations[locKey] = true;
              }
            }
          }
        }

        // Store checkoutLocation coordinates for reverse geocoding
        if (record.checkoutLocation) {
          const cl = record.checkoutLocation;
          if (cl.coordinates && cl.coordinates.length === 2) {
            const locKey = `${cl.coordinates[1]},${cl.coordinates[0]}`; // lat,lng
            if (!locationNamesRef.current[locKey]) {
              newLocations[locKey] = true;
            }
          } else if (cl.latitude !== undefined && cl.longitude !== undefined) {
            const lat = Number(cl.latitude);
            const lng = Number(cl.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              const locKey = `${lat},${lng}`;
              if (!locationNamesRef.current[locKey]) {
                newLocations[locKey] = true;
              }
            }
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

  // Filter users based on tab selection and project filter
  const filteredUsers = users
    .filter(user => projectFilter === 'ALL' ? true : (user.project || '') === projectFilter)
    .filter(user => {
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

  // Get the location name/address from location object
  const getLocationName = (location) => {
    if (!location) return '-';
    // Prefer explicit address if present
    if (location.address) return location.address;

    let lat; let lng;
    if (location.coordinates && location.coordinates.length === 2) {
      // GeoJSON order [lng, lat]
      lng = Number(location.coordinates[0]);
      lat = Number(location.coordinates[1]);
    } else if (
      location.latitude !== undefined &&
      location.longitude !== undefined
    ) {
      lat = Number(location.latitude);
      lng = Number(location.longitude);
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const locKey = `${lat},${lng}`;
      return locationNames[locKey] || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    
    return 'Unknown location';
  };

  // Distance helpers to flag large gaps between check-in and check-out
  const getLatLngFromLocation = (location) => {
    if (!location) return null;
    let lat; let lng;
    if (location.coordinates && location.coordinates.length === 2) {
      lng = Number(location.coordinates[0]);
      lat = Number(location.coordinates[1]);
    } else if (
      location.latitude !== undefined &&
      location.longitude !== undefined
    ) {
      lat = Number(location.latitude);
      lng = Number(location.longitude);
    }
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return null;
  };

  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getDistanceBetweenLocationsKm = (loc1, loc2) => {
    const a = getLatLngFromLocation(loc1);
    const b = getLatLngFromLocation(loc2);
    if (!a || !b) return null;
    return calculateDistanceKm(a.lat, a.lng, b.lat, b.lng);
  };

  // Export-related functions
  const handleExportClick = (user) => {
    setExportingUser(user);
    setExportDialogOpen(true);
  };

  const handleExportClose = () => {
    setExportDialogOpen(false);
    setExportingUser(null);
    setSelectedMonth(moment().format('YYYY-MM'));
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  const fetchMonthlyAttendanceData = async (userId, month) => {
    try {
      const startDate = moment(month).startOf('month').format('YYYY-MM-DD');
      const endDate = moment(month).endOf('month').format('YYYY-MM-DD');

      const response = await axios.get(`${ATTENDANCE_API_URL}/attendance/all`, {
        params: {
          startDate,
          endDate,
          userId
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching monthly attendance:', error);
      throw error;
    }
  };

  const handleExportConfirm = async () => {
    if (!exportingUser || !selectedMonth) return;

    try {
      setExportLoading(true);

      // Fetch monthly attendance data
      const monthlyData = await fetchMonthlyAttendanceData(exportingUser._id, selectedMonth);

      // Prepare export data
      const exportData = [];
      const monthStart = moment(selectedMonth).startOf('month');
      const monthEnd = moment(selectedMonth).endOf('month');
      const today = moment().startOf('day');

      // Generate all days in the month
      const daysInMonth = [];
      for (let day = monthStart.clone(); day.isSameOrBefore(monthEnd); day.add(1, 'day')) {
        daysInMonth.push(day.clone());
      }

      // Create export rows for each day
      daysInMonth.forEach(day => {
        const formattedDate = day.format('YYYY-MM-DD');
        const dayName = day.format('dddd');
        const dateString = day.format('MMM DD, YYYY');
        const isFuture = day.isAfter(today);
        
        // Find attendance record for this day
        const attendanceRecord = monthlyData.find(record =>
          moment(record.date).format('YYYY-MM-DD') === formattedDate
        );

        let status = 'Absent';
        let checkInTime = '-';
        let checkOutTime = '-';
        let hoursWorked = '-';
        let checkInLocation = '-';
        let checkOutLocation = '-';

        if (!isFuture && attendanceRecord) {
          status = attendanceRecord.status.charAt(0).toUpperCase() + attendanceRecord.status.slice(1);
          
          if (attendanceRecord.sessions && attendanceRecord.sessions.length > 0) {
            const session = attendanceRecord.sessions[0];
            checkInTime = session.checkInTime ? moment(session.checkInTime).format('hh:mm A') : '-';
            checkOutTime = session.checkOutTime ? moment(session.checkOutTime).format('hh:mm A') : '-';
            
            if (session.checkInTime && session.checkOutTime) {
              const duration = moment.duration(moment(session.checkOutTime).diff(moment(session.checkInTime)));
              hoursWorked = duration.asHours().toFixed(2);
            }
          }

          if (attendanceRecord.location) {
            checkInLocation = getLocationName(attendanceRecord.location);
          }
          if (attendanceRecord.checkoutLocation) {
            checkOutLocation = getLocationName(attendanceRecord.checkoutLocation);
          }
        } else if (isFuture) {
          status = 'Upcoming';
        }

        exportData.push({
          'Day': dayName,
          'Date': dateString,
          'Status': status,
          'Check-in Time': checkInTime,
          'Check-out Time': checkOutTime,
          'Hours Worked': hoursWorked,
          'Check-in Location': checkInLocation,
          'Check-out Location': checkOutLocation
        });
      });

      // Generate filename
      const monthName = moment(selectedMonth).format('MMMM_YYYY');
      const username = exportingUser.username || 'Unknown_User';
      
      // Use the existing export utility but create our own filename
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // Create Blob from the buffer
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${username}_Attendance_${monthName}.xlsx`
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      handleExportClose();
    } catch (error) {
      console.error('Error exporting attendance:', error);
      alert('Failed to export attendance data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Global export functions
  const handleGlobalExportClick = () => {
    setGlobalExportDialogOpen(true);
  };

  const handleGlobalExportClose = () => {
    setGlobalExportDialogOpen(false);
    setGlobalSelectedMonth(moment().format('YYYY-MM'));
  };

  const handleGlobalMonthChange = (event) => {
    setGlobalSelectedMonth(event.target.value);
  };

  const handleGlobalExportConfirm = async () => {
    if (!globalSelectedMonth) return;

    try {
      setGlobalExportLoading(true);

      const workbook = XLSX.utils.book_new();
      const monthStart = moment(globalSelectedMonth).startOf('month');
      const monthEnd = moment(globalSelectedMonth).endOf('month');
      const today = moment().startOf('day');

      // Generate all days in the month
      const daysInMonth = [];
      for (let day = monthStart.clone(); day.isSameOrBefore(monthEnd); day.add(1, 'day')) {
        daysInMonth.push(day.clone());
      }

      // Combined data for all users
      const allUsersData = [];

      // Process each user and add to combined data
      for (const user of users) {
        try {
          // Fetch monthly attendance data for this user
          const monthlyData = await fetchMonthlyAttendanceData(user._id, globalSelectedMonth);

          // Process each day for this user
          daysInMonth.forEach(day => {
            const formattedDate = day.format('YYYY-MM-DD');
            const dayName = day.format('dddd');
            const dateString = day.format('MMM DD, YYYY');
            const isFuture = day.isAfter(today);
            
            // Find attendance record for this day
            const attendanceRecord = monthlyData.find(record =>
              moment(record.date).format('YYYY-MM-DD') === formattedDate
            );

            let status = 'Absent';
            let checkInTime = '-';
            let checkOutTime = '-';
            let hoursWorked = '-';
            let checkInLocation = '-';
            let checkOutLocation = '-';

            if (!isFuture && attendanceRecord) {
              status = attendanceRecord.status.charAt(0).toUpperCase() + attendanceRecord.status.slice(1);
              
              if (attendanceRecord.sessions && attendanceRecord.sessions.length > 0) {
                const session = attendanceRecord.sessions[0];
                checkInTime = session.checkInTime ? moment(session.checkInTime).format('hh:mm A') : '-';
                checkOutTime = session.checkOutTime ? moment(session.checkOutTime).format('hh:mm A') : '-';
                
                if (session.checkInTime && session.checkOutTime) {
                  const duration = moment.duration(moment(session.checkOutTime).diff(moment(session.checkInTime)));
                  hoursWorked = duration.asHours().toFixed(2);
                }
              }

              if (attendanceRecord.location) {
                checkInLocation = getLocationName(attendanceRecord.location);
              }
              if (attendanceRecord.checkoutLocation) {
                checkOutLocation = getLocationName(attendanceRecord.checkoutLocation);
              }
            } else if (isFuture) {
              status = 'Upcoming';
            }

            // Add user data to combined array
            allUsersData.push({
              'Name': user.username || 'Unknown',
              'Role': user.role || 'Unknown',
              'Day': dayName,
              'Date': dateString,
              'Status': status,
              'Check-in Time': checkInTime,
              'Check-out Time': checkOutTime,
              'Hours Worked': hoursWorked,
              'Check-in Location': checkInLocation,
              'Check-out Location': checkOutLocation
            });
          });
          
          // Add a small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (userError) {
          console.error(`Error processing user ${user.username}:`, userError);
          // Continue with other users even if one fails
        }
      }

      // Create single worksheet with all users' data
      const worksheet = XLSX.utils.json_to_sheet(allUsersData);
      
      // Set column widths for better readability
      worksheet['!cols'] = [
        { wch: 15 }, // Name
        { wch: 12 }, // Role
        { wch: 10 }, // Day
        { wch: 15 }, // Date
        { wch: 10 }, // Status
        { wch: 15 }, // Check-in Time
        { wch: 15 }, // Check-out Time
        { wch: 15 }, // Hours Worked
        { wch: 30 }, // Check-in Location
        { wch: 30 }  // Check-out Location
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'All Users Attendance');

      // Generate filename
      const monthName = moment(globalSelectedMonth).format('MMMM_YYYY');

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // Create Blob from the buffer
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `All_Users_Attendance_${monthName}.xlsx`
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      handleGlobalExportClose();
    } catch (error) {
      console.error('Error exporting global attendance:', error);
      alert('Failed to export attendance data. Please try again.');
    } finally {
      setGlobalExportLoading(false);
    }
  };

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const month = moment().subtract(i, 'months');
      options.push({
        value: month.format('YYYY-MM'),
        label: month.format('MMMM YYYY')
      });
    }
    return options;
  };

  // Attendance detail row component
  const AttendanceDetailRow = ({ userId }) => {
    const [userAttendanceData, setUserAttendanceData] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const user = users.find(u => u._id === userId) || {};
    const weekDates = getWeekDates();
    const today = moment().startOf('day');

    // Fetch specific user's attendance data for the current week
    useEffect(() => {
      const fetchUserWeeklyData = async () => {
        try {
          setDetailLoading(true);
          const startDate = moment(weekStart).format('YYYY-MM-DD');
          const endDate = moment(weekStart).add(6, 'days').format('YYYY-MM-DD');

          const response = await axios.get(`${ATTENDANCE_API_URL}/attendance/all`, {
            params: {
              startDate,
              endDate,
              userId
            },
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });

          setUserAttendanceData(response.data.data || []);
        } catch (error) {
          console.error('Error fetching user attendance data:', error);
          setUserAttendanceData([]);
        } finally {
          setDetailLoading(false);
        }
      };

      if (userId) {
        fetchUserWeeklyData();
      }
    }, [userId, weekStart]);

    // Get user attendance for a specific date from the fetched data
    const getUserAttendanceForDateDetail = (date) => {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      return userAttendanceData.find(record =>
        moment(record.date).format('YYYY-MM-DD') === formattedDate
      ) || { status: 'absent' };
    };

    // Calculate attendance stats (only count past dates)
    const pastDates = weekDates.filter(date => moment(date).isSameOrBefore(today));
    const totalPastDays = pastDates.length;
    
    let presentDays = 0;
    let lateDays = 0;
    
    pastDates.forEach(date => {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const attendance = userAttendanceData.find(a => 
        moment(a.date).format('YYYY-MM-DD') === formattedDate
      );
      
      if (attendance) {
        if (attendance.status === 'present') presentDays++;
        if (attendance.status === 'late') lateDays++;
      }
    });
    
    const absentDays = totalPastDays - presentDays - lateDays;

    if (detailLoading) {
      return (
        <TableRow>
          <TableCell colSpan={9}>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          </TableCell>
        </TableRow>
      );
    }

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
                    <TableCell>Check-in Location</TableCell>
                    <TableCell>Check-out Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {weekDates.map((date, index) => {
                    const isFuture = moment(date).isAfter(today);
                    const attendance = getUserAttendanceForDateDetail(date);
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
                              <Typography noWrap sx={{ maxWidth: 220 }}>
                                {getLocationName(attendance.location)}
                              </Typography>
                            </Tooltip>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {!isFuture && attendance.checkoutLocation ? (
                            <Tooltip title={getLocationName(attendance.checkoutLocation)}>
                              <Typography noWrap sx={{ maxWidth: 220 }}>
                                {getLocationName(attendance.checkoutLocation)}
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

    // Flag if any day has distance between check-in and check-out > 3 km
    const hasLongDistanceIssue = userAttendance.some(record => {
      const distanceKm = getDistanceBetweenLocationsKm(record.location, record.checkoutLocation);
      return distanceKm !== null && distanceKm > 3;
    });

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
          <TableCell align="center">
            {hasLongDistanceIssue && (
              <Tooltip title="Check-in and check-out locations are farther than 3 km on one or more days this week">
                <Chip
                  icon={<WarningAmberIcon />}
                  label="3km+"
                  color="error"
                  size="small"
                  sx={{ mr: 1 }}
                />
              </Tooltip>
            )}
            <Tooltip title="Export Attendance">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportClick(user);
                }}
                color="primary"
              >
                <FileDownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Global Export Button */}
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleGlobalExportClick}
              color="primary"
              size="small"
            >
              Export All Users
            </Button>

            {/* Week Navigation */}
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
                <TableCell align="center">Actions</TableCell>
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

      {/* Export Dialog */}
      <Dialog 
        open={exportDialogOpen} 
        onClose={handleExportClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Export Attendance Report
          {exportingUser && (
            <Typography variant="body2" color="textSecondary">
              For: {exportingUser.username} ({exportingUser.role})
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Month</InputLabel>
              <Select
                value={selectedMonth}
                onChange={handleMonthChange}
                label="Select Month"
              >
                {getMonthOptions().map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExportClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExportConfirm}
            variant="contained"
            disabled={exportLoading}
            startIcon={exportLoading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
          >
            {exportLoading ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Export Dialog */}
      <Dialog 
        open={globalExportDialogOpen} 
        onClose={handleGlobalExportClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Export All Users Attendance Report
          <Typography variant="body2" color="textSecondary">
            This will export attendance data for all users with individual sheets per user plus a summary sheet.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Month</InputLabel>
              <Select
                value={globalSelectedMonth}
                onChange={handleGlobalMonthChange}
                label="Select Month"
              >
                {getMonthOptions().map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {users.length > 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Will export data for {users.length} user(s)
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleGlobalExportClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleGlobalExportConfirm}
            variant="contained"
            disabled={globalExportLoading}
            startIcon={globalExportLoading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
          >
            {globalExportLoading ? 'Exporting...' : 'Export All Users'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceDetailedView;
