import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Autocomplete, TextField, Divider } from '@mui/material';
import { format } from 'date-fns';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {ATTENDANCE_URL, AUTH_URL} from "../API/api-keys.jsx";
import { useAuth } from '../context/AuthContext';
import { staffRoleColors } from '../theme/theme';

// Fix the default icon issue in Leaflet (app-wide; the Locations map's KML pins use it)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Get base URLs from environment variables
const ATTENDANCE_API_URL =ATTENDANCE_URL+'/api';
const AUTH_API_URL =  AUTH_URL+'/api';

// Helper map controllers
const MapFitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, positions && positions.length, JSON.stringify(positions)]);
  return null;
};

const MapFlyTo = ({ position, zoom = 16 }) => {
  const map = useMap();
  useEffect(() => {
    if (position && Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      map.flyTo(position, zoom, { duration: 0.75 });
    }
  }, [map, position && position[0], position && position[1], zoom]);
  return null;
};

const AttendanceMapView = ({ projectFilter = 'ALL' }) => {
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { user } = useAuth();
  const isViewer = user && user.role === 'VIEWER';

  // Default center position (can be adjusted based on your requirements)
  const defaultCenter = [0, 0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get today's date with time set to beginning and end of day
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        // Get all attendance records for today with status 'present'
        const attendanceResponse = await axios.get(`${ATTENDANCE_API_URL}/attendance/all`, {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            status: 'present'
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }).catch(error => {
          console.error('Attendance API Error:', error);
          throw new Error(`Attendance API Error: ${error.message}`);
        });

        // Filter only records with valid numeric location data (including zeros)
        const raw = attendanceResponse.data.data || [];
        const usersWithLocation = raw
          .filter(record => {
            const hasLocation = record && record.location && record.location.latitude !== undefined && record.location.longitude !== undefined;
            if (!hasLocation) return false;
            const lat = Number(record.location.latitude);
            const lng = Number(record.location.longitude);
            return Number.isFinite(lat) && Number.isFinite(lng);
          })
          .map(record => ({
            ...record,
            location: {
              ...record.location,
              latitude: Number(record.location.latitude),
              longitude: Number(record.location.longitude)
            }
          }));

        // Fetch user data from auth API to get roles (attempt to fetch ALL users, bypassing any pagination)
        const authHeaders = { Authorization: `Bearer ${localStorage.getItem('token')}` };

        const fetchAllUsers = async () => {
          // Try a big limit first
          const bigLimit = 10000;
          try {
            const resp = await axios.get(`${AUTH_API_URL}/auth/users`, {
              params: { limit: bigLimit },
              headers: authHeaders,
            });
            const arr = resp?.data?.data || [];
            if (Array.isArray(arr)) return arr;
          } catch (e) {
            // Ignore and fallback to paged approach
          }

          // Fallback: iterate pages with a reasonable page size
          const pageSize = 1000;
          const aggregated = [];
          let page = 1;
          while (true) {
            const resp = await axios.get(`${AUTH_API_URL}/auth/users`, {
              params: { page, limit: pageSize },
              headers: authHeaders,
            });
            const chunk = resp?.data?.data || [];
            if (!Array.isArray(chunk) || chunk.length === 0) break;
            aggregated.push(...chunk);
            if (chunk.length < pageSize) break;
            page += 1;
          }
          return aggregated;
        };

        const allUsers = await fetchAllUsers();

        setAttendances(usersWithLocation);
        setUsers(allUsers || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to load attendance data: ${err.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get user details by userId
  const getUserDetails = (userId) => {
    return users.find(user => user._id === userId) || {};
  };

  // Apply project filter to attendances using user.project
  const filteredAttendances = useMemo(() => {
    if (projectFilter === 'ALL') return attendances;
    const userIdsInProject = new Set(
      users.filter(u => (u.project || '') === projectFilter).map(u => u._id)
    );
    return attendances.filter(a => userIdsInProject.has(a.userId));
  }, [attendances, users, projectFilter]);

  // Derived data for map
  const positions = useMemo(() => (
    filteredAttendances.map(a => [a.location.latitude, a.location.longitude])
  ), [filteredAttendances]);

  const selectedAttendance = useMemo(() => (
    filteredAttendances.find(a => a.userId === selectedUserId) || null
  ), [filteredAttendances, selectedUserId]);

  const searchOptions = useMemo(() => {
    const uniqueByUser = new Map();
    filteredAttendances.forEach(a => {
      if (!uniqueByUser.has(a.userId)) {
        const user = getUserDetails(a.userId);
        uniqueByUser.set(a.userId, {
          userId: a.userId,
          label: user.username || user.email || a.userId,
          latitude: a.location.latitude,
          longitude: a.location.longitude,
        });
      }
    });
    return Array.from(uniqueByUser.values());
  }, [filteredAttendances, users]);

  // Find center of map based on all locations
  const getCenter = () => {
    if (filteredAttendances.length > 0) {
      const totalLat = filteredAttendances.reduce((sum, a) => sum + a.location.latitude, 0);
      const totalLng = filteredAttendances.reduce((sum, a) => sum + a.location.longitude, 0);
      return [totalLat / filteredAttendances.length, totalLng / filteredAttendances.length];
    }
    return defaultCenter;
  };

  const formatLocationText = (loc) => {
    if (!loc) return '-';
    if (loc.address) return loc.address;
    if (typeof loc.latitude !== 'undefined' && typeof loc.longitude !== 'undefined') {
      return `${loc.latitude}, ${loc.longitude}`;
    }
    if (Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
      return `${loc.coordinates[1]}, ${loc.coordinates[0]}`;
    }
    return '-';
  };

  const formatRole = (role) => (role ? role.charAt(0) + role.slice(1).toLowerCase() : 'Unknown role');

  const formatTime = (value) => (value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);

  const PopupLocation = ({ title, location, emptyText }) => (
    <Box sx={{ mt: 1, p: 1, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}>
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>{title}</Typography>
      {location ? (
        <>
          <Typography variant="caption" component="div" sx={{ lineHeight: 1.4, mt: 0.25 }}>
            {formatLocationText(location)}
          </Typography>
          {location.latitude !== undefined && location.longitude !== undefined && (
            <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {location.latitude}, {location.longitude}
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mt: 0.25 }}>{emptyText}</Typography>
      )}
    </Box>
  );

  const LegendDot = ({ color }) => (
    <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)', flexShrink: 0 }} />
  );

  // Render map only when we have data and not loading
  const renderMap = () => {
    if (!filteredAttendances.length) {
      return (
        <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', bgcolor: 'background.default', textAlign: 'center', p: 3 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>No check-ins with a location today</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Staff appear here once they check in from the mobile app.
            </Typography>
          </Box>
        </Box>
      );
    }

    const center = getCenter();

    const supervisorsCount = filteredAttendances.filter(a => getUserDetails(a.userId).role === 'SUPERVISOR').length;
    const surveyorsCount = filteredAttendances.length - supervisorsCount;

    return (
      <MapContainer
        key="attendance-map"
        center={center}
        zoom={filteredAttendances.length > 1 ? 10 : 14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={!isViewer}
        doubleClickZoom={!isViewer}
        dragging={!isViewer}
        zoomControl={!isViewer}
        keyboard={!isViewer}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fit bounds on data load/update */}
        <MapFitBounds positions={positions} />
        {/* Fly to when user is selected */}
        {!isViewer && selectedAttendance && (
          <MapFlyTo position={[selectedAttendance.location.latitude, selectedAttendance.location.longitude]} />
        )}

        {/* Summary and legend */}
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            zIndex: 1000,
            px: 2,
            py: 1.5,
            minWidth: 200,
            // Phones: bottom-left, leaving the top edge to the search box
            top: { xs: 'auto', sm: 12 },
            bottom: { xs: 28, sm: 'auto' },
            left: { xs: 12, sm: isViewer ? 12 : 56 },
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Checked in today · {format(new Date(), 'd MMM yyyy')}
          </Typography>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 }}>
            {filteredAttendances.length}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            {[
              { label: 'Supervisors', count: supervisorsCount, color: staffRoleColors.SUPERVISOR },
              { label: 'Surveyors & others', count: surveyorsCount, color: staffRoleColors.SURVEYOR },
            ].map((item) => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LegendDot color={item.color} />
                <Typography variant="body2" sx={{ flex: 1 }}>{item.label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.count}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Search Control */}
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            left: { xs: isViewer ? 12 : 56, sm: 'auto' },
            zIndex: 1000,
            width: { xs: 'auto', sm: 300 },
            p: 1,
          }}
        >
          <Autocomplete
            size="small"
            options={searchOptions}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.userId === value.userId}
            value={(() => {
              if (!selectedUserId) return null;
              const user = filteredAttendances.find(a => a.userId === selectedUserId);
              if (!user) return null;
              const details = getUserDetails(selectedUserId);
              return {
                userId: selectedUserId,
                label: details.username || details.email || selectedUserId,
                latitude: user.location.latitude,
                longitude: user.location.longitude,
              };
            })()}
            onChange={(event, newValue) => {
              if (newValue) {
                setSelectedUserId(newValue.userId);
              } else {
                setSelectedUserId(null);
              }
            }}
            renderInput={(params) => (
              <TextField {...params} placeholder="Find a staff member" inputProps={{ ...params.inputProps, 'aria-label': 'Find a staff member on the map' }} />
            )}
          />
        </Paper>

        {filteredAttendances.map((attendance, index) => {
          const user = getUserDetails(attendance.userId);
          const isSupervisor = user.role === 'SUPERVISOR';
          const markerColor = isSupervisor ? staffRoleColors.SUPERVISOR : staffRoleColors.SURVEYOR;
          const isSelected = selectedUserId === attendance.userId;
          const lastSession = attendance.sessions && attendance.sessions.length > 0
            ? attendance.sessions[attendance.sessions.length - 1]
            : null;

          return (
            <CircleMarker
              key={`${attendance.userId}-${index}`}
              center={[attendance.location.latitude, attendance.location.longitude]}
              radius={isSelected ? 10 : 7}
              pathOptions={{
                fillColor: markerColor,
                fillOpacity: isSelected ? 1 : 0.85,
                color: isSelected ? '#111827' : '#fff',
                weight: 2
              }}
              interactive={!isViewer}
              eventHandlers={isViewer ? {} : {
                click: () => setSelectedUserId(attendance.userId),
              }}
            >
              {!isViewer && (
              <Popup>
                {/* Leaflet gives popup paragraphs a large margin; Typography handles spacing here */}
                <Box sx={{ width: 260, '& p.MuiTypography-root': { m: 0 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LegendDot color={markerColor} />
                    <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{user.username || 'Unknown'}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', ml: 2.25 }}>
                    {formatRole(user.role)} · {attendance.status}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.25 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Check-in</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatTime(lastSession?.checkInTime) || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Check-out</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatTime(lastSession?.checkOutTime) || 'Not yet'}</Typography>
                    </Box>
                  </Box>
                  <PopupLocation title="Check-in location" location={attendance.location} />
                  <PopupLocation title="Check-out location" location={attendance.checkoutLocation} emptyText="Not checked out yet" />
                </Box>
              </Popup>
              )}
            </CircleMarker>
          );
        })}
      </MapContainer>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={28} />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>Loading today's check-ins…</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2.5 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      {renderMap()}
    </Box>
  );
};

export default AttendanceMapView;
