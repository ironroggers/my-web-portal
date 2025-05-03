import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

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
const ATTENDANCE_API_URL = import.meta.env.VITE_ATTENDANCE_API_URL || 'https://attendance.annuprojects.com/api';
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'https://api.annuprojects.com/api';

const AttendanceMapView = () => {
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  
  // Default center position (can be adjusted based on your requirements)
  const defaultCenter = [0, 0];
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get today's date in ISO format
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get all attendance records for today with status 'present'
        const attendanceResponse = await axios.get(`${ATTENDANCE_API_URL}/api/attendance/all`, {
          params: {
            startDate: today.toISOString(),
            endDate: today.toISOString(),
            status: 'present'
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        // Filter only records with location data
        const usersWithLocation = attendanceResponse.data.data.filter(
          record => record.location && record.location.latitude && record.location.longitude
        );
        
        // Fetch user data from auth API to get roles
        const userResponse = await axios.get(`${AUTH_API_URL}/api/auth/users`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        setAttendances(usersWithLocation);
        setUsers(userResponse.data.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load attendance data: ' + err);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Get user details by userId
  const getUserDetails = (userId) => {
    return users.find(user => user._id === userId) || {};
  };
  
  // Calculate map bounds if we have locations
  const getBounds = () => {
    if (attendances.length > 0) {
      const positions = attendances.map(a => [a.location.latitude, a.location.longitude]);
      return L.latLngBounds(positions);
    }
    return null;
  };
  
  // Find center of map based on all locations
  const getCenter = () => {
    if (attendances.length > 0) {
      const totalLat = attendances.reduce((sum, a) => sum + a.location.latitude, 0);
      const totalLng = attendances.reduce((sum, a) => sum + a.location.longitude, 0);
      return [totalLat / attendances.length, totalLng / attendances.length];
    }
    return defaultCenter;
  };

  return (
    <div>
      <Typography variant="h6" component="h2">
        Attendance Map View
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Showing locations of supervisors and surveyors present today
      </Typography>
      
      <Box 
        sx={{ 
          height: '500px', 
          width: '100%',
          borderRadius: 1, 
          mt: 2,
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : attendances.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', bgcolor: '#f5f5f5' }}>
            <Typography variant="body1">No location data available for today</Typography>
          </Box>
        ) : (
          <MapContainer 
            center={getCenter()} 
            zoom={attendances.length > 1 ? 10 : 14} 
            bounds={getBounds()}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
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
              <div style={{ marginBottom: '5px' }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#ff5722',
                  marginRight: '5px' 
                }}></span>
                <span>Supervisor</span>
              </div>
              <div>
                <span style={{ 
                  display: 'inline-block', 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#2196f3',
                  marginRight: '5px' 
                }}></span>
                <span>Surveyor</span>
              </div>
            </div>
            
            {attendances.map((attendance, index) => {
              const user = getUserDetails(attendance.userId);
              const isSupervisor = user.role === 'SUPERVISOR';
              const markerColor = isSupervisor ? '#ff5722' : '#2196f3'; // Orange for supervisors, blue for surveyors
              
              return (
                <CircleMarker 
                  key={`${attendance.userId}-${index}`}
                  center={[attendance.location.latitude, attendance.location.longitude]}
                  radius={10}
                  pathOptions={{ 
                    fillColor: markerColor,
                    fillOpacity: 0.8,
                    color: '#fff',
                    weight: 1
                  }}
                >
                  <Popup>
                    <div>
                      <strong>Name:</strong> {user.username || 'Unknown'}<br />
                      <strong>Role:</strong> {user.role || 'Unknown'}<br />
                      {attendance.location.address && (
                        <>
                          <strong>Address:</strong> {attendance.location.address}<br />
                        </>
                      )}
                      <strong>Status:</strong> {attendance.status}<br />
                      <strong>Check-in time:</strong> {
                        attendance.sessions.length > 0 
                          ? new Date(attendance.sessions[attendance.sessions.length - 1].checkInTime).toLocaleTimeString() 
                          : 'N/A'
                      }
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </Box>
    </div>
  );
};

export default AttendanceMapView; 