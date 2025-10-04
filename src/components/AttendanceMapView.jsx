import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Autocomplete, TextField } from '@mui/material';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {ATTENDANCE_URL, AUTH_URL} from "../API/api-keys.jsx";
import { useAuth } from '../context/AuthContext';

// Fix the default icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
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

        console.log('Fetching attendance data...');

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

        console.log('Attendance data received:', attendanceResponse.data);

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

        console.log('Filtered users with location:', usersWithLocation.length);

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

        console.log('User data received:', { count: allUsers?.length || 0 });

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

  // Render map only when we have data and not loading
  const renderMap = () => {
    if (!filteredAttendances.length) {
      return (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          bgcolor: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: '4px'
        }}>
          <Typography variant="body1">No location data available for today</Typography>
        </Box>
      );
    }

    const center = getCenter();
    console.log('Map center:', center);
    console.log('Attendances to show:', filteredAttendances.length);

    const supervisorsCount = filteredAttendances.filter(a => getUserDetails(a.userId).role === 'SUPERVISOR').length;
    const surveyorsCount = filteredAttendances.length - supervisorsCount;

    const popupSectionStyle = {
      marginTop: '8px',
      padding: '6px 8px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      background: '#fafafa'
    };

    const addrTextStyle = {
      whiteSpace: 'normal',
      lineHeight: 1.3,
      marginTop: '4px'
    };

    const smallTextStyle = {
      color: '#666',
      fontSize: '12px',
      marginTop: '4px'
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

        {/* Search Control */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          width: '300px',
        }}>
          <Paper elevation={3} sx={{ p: 1 }}>
            <Autocomplete
              size="small"
              options={searchOptions}
              getOptionLabel={(option) => option.label}
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
                <TextField {...params} label="Search user on map" variant="outlined" />
              )}
            />
          </Paper>
        </div>

        {/* Legend */}
        <div className="info legend" style={{
          position: 'absolute',
          bottom: '20px',
          right: '10px',
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          boxShadow: '0 0 5px rgba(0,0,0,0.2)'
        }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Staff Types</div>
          <div style={{ marginBottom: '5px' }}>
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#ff5722',
              marginRight: '5px',
              border: '1px solid white'
            }}></span>
            <span>Supervisor ({supervisorsCount})</span>
          </div>
          <div>
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#2196f3',
              marginRight: '5px',
              border: '1px solid white'
            }}></span>
            <span>Surveyor ({surveyorsCount})</span>
          </div>
        </div>

        {filteredAttendances.map((attendance, index) => {
          const user = getUserDetails(attendance.userId);
          const isSupervisor = user.role === 'SUPERVISOR';
          const markerColor = isSupervisor ? '#ff5722' : '#2196f3'; // Orange for supervisors, blue for surveyors
          const isSelected = selectedUserId === attendance.userId;

          return (
            <CircleMarker
              key={`${attendance.userId}-${index}`}
              center={[attendance.location.latitude, attendance.location.longitude]}
              radius={isSelected ? 10 : 8}
              pathOptions={{
                fillColor: markerColor,
                fillOpacity: isSelected ? 1 : 0.8,
                color: isSelected ? '#000' : '#fff',
                weight: isSelected ? 2 : 1
              }}
              interactive={!isViewer}
              eventHandlers={isViewer ? {} : {
                click: () => setSelectedUserId(attendance.userId),
              }}
            >
              {!isViewer && (
              <Popup>
                <div style={{ padding: '6px 6px 8px 6px', fontSize: '14px', maxWidth: '280px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                    {user.username || 'Unknown'}
                  </div>
                  <hr style={{ margin: '6px 0', border: '0', borderTop: '1px solid #eee' }} />
                  <div style={{ marginBottom: '6px' }}><strong>Role:</strong> {user.role || 'Unknown'}</div>
                  <div style={{ marginBottom: '4px' }}><strong>Status:</strong> {attendance.status}</div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Check-in time:</strong> {
                      attendance.sessions && attendance.sessions.length > 0
                        ? new Date(attendance.sessions[attendance.sessions.length - 1].checkInTime).toLocaleTimeString()
                        : 'N/A'
                    }
                  </div>
                  <div>
                    <strong>Check-out time:</strong> {
                      attendance.sessions && attendance.sessions.length > 0 && attendance.sessions[attendance.sessions.length - 1].checkOutTime
                        ? new Date(attendance.sessions[attendance.sessions.length - 1].checkOutTime).toLocaleTimeString()
                        : 'Not checked out yet'
                    }
                  </div>

                  {/* Check-in section */}
                  <div style={popupSectionStyle}>
                    <div style={{ fontWeight: 600 }}>Check-in</div>
                    <div style={addrTextStyle}>{formatLocationText(attendance.location)}</div>
                    {attendance?.location?.latitude !== undefined && attendance?.location?.longitude !== undefined && (
                      <div style={smallTextStyle}>
                        Lat: {attendance.location.latitude}, Lng: {attendance.location.longitude}
                      </div>
                    )}
                  </div>

                  {/* Check-out section */}
                  <div style={popupSectionStyle}>
                    <div style={{ fontWeight: 600 }}>Check-out</div>
                    {attendance.checkoutLocation ? (
                      <>
                        <div style={addrTextStyle}>{formatLocationText(attendance.checkoutLocation)}</div>
                        {attendance.checkoutLocation.latitude !== undefined && attendance.checkoutLocation.longitude !== undefined && (
                          <div style={smallTextStyle}>
                            Lat: {attendance.checkoutLocation.latitude}, Lng: {attendance.checkoutLocation.longitude}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={smallTextStyle}>Not checked out yet</div>
                    )}
                  </div>
                </div>
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">{error}</Alert>
    );
  }

  return (
    <Box sx={{ height: '70vh', position: 'relative' }}>
      {renderMap()}
    </Box>
  );
};

export default AttendanceMapView;
