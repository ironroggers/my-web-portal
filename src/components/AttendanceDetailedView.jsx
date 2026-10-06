import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Chip,
  Alert,
  Avatar,
  Tooltip,
  useTheme,
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Skeleton,
  TextField,
  InputAdornment,
  TablePagination,
  useMediaQuery
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import axios from 'axios';
import moment from 'moment';
import {ATTENDANCE_URL, AUTH_URL} from "../API/api-keys.jsx";
import * as XLSX from 'xlsx';
import Meter from './common/Meter';
import StatusPill from './common/StatusPill';
import { staffRoleColors } from '../theme/theme';

// Display label and pill tone for each attendance status
const STATUS_META = {
  present: { label: 'Present', tone: 'success' },
  late: { label: 'Late', tone: 'warning' },
  absent: { label: 'Absent', tone: 'error' },
  overtime: { label: 'Overtime', tone: 'info' },
  holiday: { label: 'Holiday', tone: 'default' },
};

const getStatusMeta = (status) =>
  STATUS_META[status] ?? { label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown', tone: 'default' };

const ROLE_LABELS = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  SURVEYOR: 'Surveyor',
  'EXECUTION ENGINEER': 'Execution Engineer',
  VIEWER: 'Viewer',
};

const TABLE_COLUMNS = 9;

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || '?';

const CountCell = ({ value, emphasise }) => (
  <TableCell
    align="center"
    sx={{
      fontVariantNumeric: 'tabular-nums',
      fontWeight: value > 0 ? 600 : 400,
      color: value > 0 ? (emphasise ? 'error.dark' : 'text.primary') : 'text.disabled',
    }}
  >
    {value}
  </TableCell>
);

// Define API URLs - using environment variables if available
const ATTENDANCE_API_URL = ATTENDANCE_URL+'/api';
const AUTH_API_URL = AUTH_URL+'/api';

const AttendanceDetailedView = ({ projectFilter = 'ALL' }) => {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
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
  const [exportError, setExportError] = useState(null);

  // Global export state
  const [globalExportDialogOpen, setGlobalExportDialogOpen] = useState(false);
  const [globalSelectedMonth, setGlobalSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [globalExportLoading, setGlobalExportLoading] = useState(false);
  const [globalExportError, setGlobalExportError] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset pagination whenever filters/search change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, userType, projectFilter]);

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
    // Optionally clear search when changing tabs - uncomment if desired
    // setSearchQuery('');
  };

  // Handle user selection
  const handleUserSelect = (userId) => {
    setSelectedUser(selectedUser === userId ? null : userId);
  };

  // Filter users based on project filter first
  const projectFilteredUsers = users
    .filter(user => projectFilter === 'ALL' ? true : (user.project || '') === projectFilter);

  // Calculate counts for each user type
  const allUsersCount = projectFilteredUsers.length;
  const supervisorsCount = projectFilteredUsers.filter(user => user.role === 'SUPERVISOR').length;
  const surveyorsCount = projectFilteredUsers.filter(user => user.role === 'SURVEYOR').length;

  // Filter users based on tab selection, project filter, and search query
  const filteredUsers = projectFilteredUsers
    .filter(user => {
      if (userType === 'all') return true;
      if (userType === 'supervisors') return user.role === 'SUPERVISOR';
      if (userType === 'surveyors') return user.role === 'SURVEYOR';
      return true;
    })
    .filter(user => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        (user.username || '').toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query) ||
        (user.role || '').toLowerCase().includes(query) ||
        (user.project || '').toLowerCase().includes(query)
      );
    });

  // Handle table pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Clamp in case a refetch leaves fewer users than the current page needs
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filteredUsers.length / rowsPerPage) - 1));
  const pageUsers = filteredUsers.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);

  // Get user attendance for a specific date
  const getUserAttendanceForDate = (userId, date) => {
    const formattedDate = moment(date).format('YYYY-MM-DD');
    const userAttendance = attendanceData[userId] || [];
    const attendanceRecord = userAttendance.find(record =>
      moment(record.date).format('YYYY-MM-DD') === formattedDate
    );
    
    // If no record found, check if it's Sunday (holiday)
    if (!attendanceRecord) {
      const dayOfWeek = moment(date).day(); // 0 = Sunday
      return { status: dayOfWeek === 0 ? 'holiday' : 'absent' };
    }
    
    return attendanceRecord;
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
    setExportError(null);
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
      setExportError(null);

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
        } else {
          // Check if it's Sunday (holiday)
          const dayOfWeek = day.day(); // 0 = Sunday
          if (dayOfWeek === 0) {
            status = 'Holiday';
          }
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
      setExportError('Failed to export attendance data. Please try again.');
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
    setGlobalExportError(null);
  };

  const handleGlobalMonthChange = (event) => {
    setGlobalSelectedMonth(event.target.value);
  };

  const handleGlobalExportConfirm = async () => {
    if (!globalSelectedMonth) return;

    try {
      setGlobalExportLoading(true);
      setGlobalExportError(null);

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

      // Filter users based on project filter before processing
      const usersToExport = users.filter(user => 
        projectFilter === 'ALL' ? true : (user.project || '') === projectFilter
      );

      // Process each filtered user and add to combined data
      for (const user of usersToExport) {
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
            } else {
              // Check if it's Sunday (holiday)
              const dayOfWeek = day.day(); // 0 = Sunday
              if (dayOfWeek === 0) {
                status = 'Holiday';
              }
            }

            // Add user data to combined array
            allUsersData.push({
              'Name': user.username || 'Unknown',
              'Role': user.role || 'Unknown',
              'Project': user.project || 'Unassigned',
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
        { wch: 15 }, // Project
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
      const projectSuffix = projectFilter === 'ALL' ? 'All_Projects' : projectFilter.replace(/\s+/g, '_');
      const filename = `${projectSuffix}_Attendance_${monthName}.xlsx`;

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
        filename
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      handleGlobalExportClose();
    } catch (error) {
      console.error('Error exporting global attendance:', error);
      setGlobalExportError('Failed to export attendance data. Please try again.');
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
      const attendanceRecord = userAttendanceData.find(record =>
        moment(record.date).format('YYYY-MM-DD') === formattedDate
      );
      
      // If no record found, check if it's Sunday (holiday)
      if (!attendanceRecord) {
        const dayOfWeek = moment(date).day(); // 0 = Sunday
        return { status: dayOfWeek === 0 ? 'holiday' : 'absent' };
      }
      
      return attendanceRecord;
    };

    // Calculate attendance stats (only count past dates, exclude Sundays)
    const pastDates = weekDates.filter(date => moment(date).isSameOrBefore(today));
    const workingDays = pastDates.filter(date => moment(date).day() !== 0); // Exclude Sundays
    const totalWorkingDays = workingDays.length;
    
    let presentDays = 0;
    let lateDays = 0;
    let overtimeDays = 0;
    
    pastDates.forEach(date => {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const attendance = userAttendanceData.find(a => 
        moment(a.date).format('YYYY-MM-DD') === formattedDate
      );
      
      if (attendance) {
        if (attendance.status === 'present') presentDays++;
        if (attendance.status === 'late') lateDays++;
        if (attendance.status === 'overtime') overtimeDays++;
      }
    });
    
    const absentDays = totalWorkingDays - presentDays - lateDays;

    if (detailLoading) {
      return (
        <TableRow>
          <TableCell colSpan={TABLE_COLUMNS} sx={{ bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          </TableCell>
        </TableRow>
      );
    }

    const summary = [
      { label: 'Present', value: presentDays },
      { label: 'Late', value: lateDays },
      { label: 'Absent', value: absentDays },
    ];

    return (
      <TableRow>
        <TableCell colSpan={TABLE_COLUMNS} sx={{ p: 0, bgcolor: 'background.default' }}>
          {/* Zero intrinsic width keeps the detail from resizing the table columns */}
          <Box sx={{ width: 0, minWidth: '100%' }}>
            <Box sx={{ p: 2.5, pl: { md: 9 } }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                <Typography variant="subtitle2">
                  Daily record · {user.username || 'Unknown User'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Sundays are holidays and are not counted as working days
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '1px',
                  bgcolor: 'divider',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  mb: 2,
                  maxWidth: 420,
                }}
              >
                {summary.map((item) => (
                  <Box key={item.label} sx={{ bgcolor: 'background.paper', px: 2, py: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>

              <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
                <Table size="small" sx={{ '& tbody tr:last-of-type td': { borderBottom: 0 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Check-in</TableCell>
                      <TableCell>Check-out</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell>Check-in location</TableCell>
                      <TableCell>Check-out location</TableCell>
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
                      const status = getStatusMeta(attendance.status);
                      const isToday = moment(date).isSame(today, 'day');

                      return (
                        <TableRow key={index} sx={isToday ? { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) } : undefined}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{moment(date).format('ddd, D MMM')}</Typography>
                            {isToday && <Typography variant="caption" sx={{ color: 'primary.main' }}>Today</Typography>}
                          </TableCell>
                          <TableCell>
                            {isFuture ? (
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>Upcoming</Typography>
                            ) : (
                              <StatusPill label={status.label} tone={status.tone} />
                            )}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{isFuture ? '-' : checkInTime}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{isFuture ? '-' : checkOutTime}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{isFuture ? '-' : hoursWorked}</TableCell>
                          <TableCell sx={{ maxWidth: 240 }}>
                            {!isFuture && attendance.location ? (
                              <Tooltip title={getLocationName(attendance.location)}>
                                <Typography variant="body2" noWrap>
                                  {getLocationName(attendance.location)}
                                </Typography>
                              </Tooltip>
                            ) : '-'}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 240 }}>
                            {!isFuture && attendance.checkoutLocation ? (
                              <Tooltip title={getLocationName(attendance.checkoutLocation)}>
                                <Typography variant="body2" noWrap>
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
    
    // Get all dates in the current week that are not in the future, exclude Sundays for calculation
    const pastDates = getWeekDates().filter(date => moment(date).isSameOrBefore(today));
    const workingDays = pastDates.filter(date => moment(date).day() !== 0); // Exclude Sundays
    const totalWorkingDays = workingDays.length;
    
    // Calculate attendance stats only for past dates
    let presentDays = 0;
    let lateDays = 0;
    let overtimeDays = 0;
    
    pastDates.forEach(date => {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const attendance = userAttendance.find(a => 
        moment(a.date).format('YYYY-MM-DD') === formattedDate
      );
      
      if (attendance) {
        if (attendance.status === 'present') presentDays++;
        if (attendance.status === 'late') lateDays++;
        if (attendance.status === 'overtime') overtimeDays++;
      }
    });
    
    const absentDays = totalWorkingDays - presentDays - lateDays;
    const attendancePercentage = totalWorkingDays > 0 
      ? Math.round((presentDays + lateDays) / totalWorkingDays * 100) 
      : 0;

    // Flag if any day has distance between check-in and check-out > 3 km
    const hasLongDistanceIssue = userAttendance.some(record => {
      const distanceKm = getDistanceBetweenLocationsKm(record.location, record.checkoutLocation);
      return distanceKm !== null && distanceKm > 3;
    });

    const roleColor = staffRoleColors[user.role];

    return (
      <>
        <TableRow
          hover
          onClick={() => handleUserSelect(user._id)}
          sx={{ cursor: 'pointer', '& > td': open ? { borderBottom: 0 } : {} }}
        >
          <TableCell padding="checkbox">
            <IconButton
              aria-label={open ? 'Collapse daily record' : 'Expand daily record'}
              aria-expanded={open}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleUserSelect(user._id);
              }}
            >
              {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.75rem',
                  color: 'primary.dark',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                {getInitials(user.username)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {user.username || 'Unknown'}
                </Typography>
                {user.project && (
                  <Typography variant="caption" noWrap component="div" sx={{ color: 'text.secondary' }}>
                    {user.project}
                  </Typography>
                )}
              </Box>
            </Box>
          </TableCell>
          <TableCell>
            <Chip
              size="small"
              variant="outlined"
              label={ROLE_LABELS[user.role] || user.role || 'Unknown'}
              icon={roleColor ? <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: roleColor, ml: '8px !important' }} /> : undefined}
              sx={{ bgcolor: 'background.paper', borderColor: 'divider' }}
            />
          </TableCell>
          <CountCell value={presentDays} />
          <CountCell value={lateDays} />
          <CountCell value={absentDays} emphasise />
          <TableCell sx={{ minWidth: 150 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Meter value={attendancePercentage} sx={{ flex: 1 }} aria-label={`Attendance ${attendancePercentage}%`} />
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {attendancePercentage + '%'}
              </Typography>
            </Box>
          </TableCell>
          <TableCell>
            {hasLongDistanceIssue ? (
              <Tooltip title="Check-in and check-out locations are farther than 3 km on one or more days this week">
                <span>
                  <StatusPill label="3 km+ gap" tone="error" />
                </span>
              </Tooltip>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>—</Typography>
            )}
          </TableCell>
          <TableCell align="right">
            <Tooltip title="Export monthly report">
              <IconButton
                size="small"
                aria-label={`Export attendance for ${user.username || 'user'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportClick(user);
                }}
              >
                <FileDownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </TableCell>
        </TableRow>
        {open && <AttendanceDetailRow userId={user._id} />}
      </>
    );
  };

  const monthOptions = getMonthOptions();
  const weekLabel = `${moment(weekStart).format('D MMM')} – ${moment(weekStart).add(6, 'days').format('D MMM YYYY')}`;
  const isCurrentWeek = moment(weekStart).isSame(moment(), 'week');

  const userTypeTabs = [
    { value: 'all', label: 'All staff', count: allUsersCount },
    { value: 'supervisors', label: 'Supervisors', count: supervisorsCount },
    { value: 'surveyors', label: 'Surveyors', count: surveyorsCount },
  ];

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={44} sx={{ mb: 2 }} />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} variant="text" height={44} />
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <ButtonGroup size="small" variant="outlined" aria-label="Week navigation">
          <Button onClick={goToPreviousWeek} aria-label="Previous week">
            <ChevronLeftIcon fontSize="small" />
          </Button>
          <Button disabled sx={{ '&.Mui-disabled': { color: 'text.primary', borderColor: 'divider' }, minWidth: 190 }}>
            {weekLabel}
          </Button>
          <Button onClick={goToNextWeek} disabled={isCurrentWeek} aria-label="Next week">
            <ChevronRightIcon fontSize="small" />
          </Button>
        </ButtonGroup>
        <Button size="small" onClick={goToCurrentWeek} disabled={isCurrentWeek}>
          This week
        </Button>

        <Box sx={{ flex: 1 }} />

        <TextField
          size="small"
          placeholder="Search staff"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 260 } }}
          slotProps={{
            htmlInput: { 'aria-label': 'Search staff' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')} edge="end" aria-label="Clear search">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={handleGlobalExportClick}
        >
          Export all
        </Button>
      </Box>

      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
        <Tabs
          value={userType}
          onChange={handleTabChange}
          sx={{ px: 1, borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
        >
          {userTypeTabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.label}
                  <Box
                    component="span"
                    sx={{
                      px: 0.75,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      bgcolor: userType === tab.value ? alpha(theme.palette.primary.main, 0.1) : 'action.hover',
                      color: userType === tab.value ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {tab.count}
                  </Box>
                </Box>
              }
            />
          ))}
        </Tabs>

        {filteredUsers.length === 0 ? (
          <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {searchQuery.trim() ? `No staff match "${searchQuery}"` : 'No staff found'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {searchQuery.trim() ? 'Try a different name, email, role or project.' : 'Check the project filter above.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table aria-label="weekly attendance" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="center">Present</TableCell>
                  <TableCell align="center">Late</TableCell>
                  <TableCell align="center">Absent</TableCell>
                  <TableCell>Attendance</TableCell>
                  <TableCell>Flags</TableCell>
                  <TableCell align="right">Export</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageUsers.map((user) => (
                  <UserRow key={user._id} user={user} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={currentPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage={isPhone ? 'Rows:' : 'Rows per page:'}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Box>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={exportLoading ? undefined : handleExportClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Export monthly report
          {exportingUser && (
            <Typography variant="body2" component="div" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {exportingUser.username} · {ROLE_LABELS[exportingUser.role] || exportingUser.role}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {exportError && <Alert severity="error" sx={{ mb: 2 }}>{exportError}</Alert>}
          <TextField
            select
            fullWidth
            size="small"
            label="Month"
            value={selectedMonth}
            onChange={handleMonthChange}
            sx={{ mt: 1 }}
            helperText="Downloads an Excel file with one row per day"
          >
            {monthOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={handleExportClose} disabled={exportLoading} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleExportConfirm}
            variant="contained"
            disabled={exportLoading}
            startIcon={exportLoading ? <CircularProgress size={14} color="inherit" /> : <FileDownloadOutlinedIcon />}
          >
            {exportLoading ? 'Exporting…' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Export Dialog */}
      <Dialog
        open={globalExportDialogOpen}
        onClose={globalExportLoading ? undefined : handleGlobalExportClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Export all staff
          <Typography variant="body2" component="div" sx={{ color: 'text.secondary', mt: 0.25 }}>
            {projectFilter === 'ALL'
              ? 'All users across all projects'
              : `Users in the "${projectFilter}" project only`
            }
          </Typography>
        </DialogTitle>
        <DialogContent>
          {globalExportError && <Alert severity="error" sx={{ mb: 2 }}>{globalExportError}</Alert>}
          <TextField
            select
            fullWidth
            size="small"
            label="Month"
            value={globalSelectedMonth}
            onChange={handleGlobalMonthChange}
            sx={{ mt: 1 }}
            helperText={
              filteredUsers.length > 0
                ? `Will export data for ${filteredUsers.length} user(s)${projectFilter !== 'ALL' ? ` from the "${projectFilter}" project` : ''}`
                : undefined
            }
          >
            {monthOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          {globalExportLoading && (
            <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 2 }}>
              Collecting each user's records — this can take a minute for large teams.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={handleGlobalExportClose} disabled={globalExportLoading} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleGlobalExportConfirm}
            variant="contained"
            disabled={globalExportLoading}
            startIcon={globalExportLoading ? <CircularProgress size={14} color="inherit" /> : <FileDownloadOutlinedIcon />}
          >
            {globalExportLoading ? 'Exporting…' : 'Export all'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceDetailedView;
