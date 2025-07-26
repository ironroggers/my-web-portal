import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert, 
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Fab
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SpeedIcon from '@mui/icons-material/Speed';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import 'leaflet/dist/leaflet.css';
import './FRTTracking.css';
import L from 'leaflet';
import {
  fetchVehiclePositions,
  getVehicleStatistics,
  formatSpeed,
  formatDeviceTime,
  getBatteryLevel,
  getDistanceToday,
  getStatusColor
} from '../services/frtTrackingService';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map invalidation when container size changes
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
};

// Custom vehicle icon based on status
const createVehicleIcon = (status, speed = 0) => {
  let color = '#666666'; // Default gray
  let carIcon = '🚗'; // Default car emoji
  let iconSize = [30, 30]; // Slightly larger for better clicking
  
  switch (status) {
    case 'RUNNING':
      color = '#4CAF50'; // Green
      carIcon = '🚙'; // SUV/moving vehicle emoji
      break;
    case 'STOPPED':
      color = '#F44336'; // Red
      carIcon = '🚗'; // Regular car emoji
      break;
    case 'IDLE':
      color = '#FF9800'; // Orange
      carIcon = '🚕'; // Taxi emoji (yellow-ish, good for idle)
      break;
    case 'NO_DATA':
      color = '#9E9E9E'; // Gray
      carIcon = '🚐'; // Van emoji (different shape for no data)
      break;
    default:
      color = '#2196F3'; // Blue
      carIcon = '🚗'; // Regular car emoji
  }

  // For running vehicles, add a motion indicator
  const motionIndicator = status === 'RUNNING' && speed > 0 ? 
    `<div class="motion-indicator" style="
      position: absolute;
      top: -3px;
      right: -3px;
      background: #4CAF50;
      color: white;
      border-radius: 50%;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: bold;
      border: 1px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    ">⚡</div>` : '';

  return L.divIcon({
    html: `
      <div style="
        position: relative;
        background-color: ${color};
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        user-select: none;
      ">
        ${carIcon}
        ${motionIndicator}
      </div>
    `,
    className: 'custom-vehicle-icon',
    iconSize: iconSize,
    iconAnchor: [15, 15], // Center the icon
    popupAnchor: [0, -15]
  });
};

const FRTTracking = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef(null);

  // Default center (Kerala, India)
  const mapCenter = [9.31, 76.45];
  const mapZoom = 8;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const vehicleData = await fetchVehiclePositions();
      setVehicles(vehicleData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching vehicle data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      // Enter fullscreen
      if (mapContainerRef.current?.requestFullscreen) {
        await mapContainerRef.current.requestFullscreen();
      } else if (mapContainerRef.current?.webkitRequestFullscreen) {
        await mapContainerRef.current.webkitRequestFullscreen();
      } else if (mapContainerRef.current?.msRequestFullscreen) {
        await mapContainerRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes (e.g., ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Get statistics using the service
  const stats = getVehicleStatistics(vehicles);

  return (
    <Box className="frt-tracking" sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        <DirectionsCarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        FRT Tracking
      </Typography>

      {/* Controls and Stats - Hide in fullscreen */}
      {!isFullscreen && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Tooltip title="Refresh vehicle data">
                  <IconButton 
                    onClick={fetchData} 
                    disabled={loading}
                    color="primary"
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Auto Refresh (30s)"
                />

                <Chip label={`Total: ${stats.total}`} variant="outlined" />
                <Chip label={`Running: ${stats.running}`} color="success" size="small" />
                <Chip label={`Stopped: ${stats.stopped}`} color="error" size="small" />
                <Chip label={`Idle: ${stats.idle}`} color="warning" size="small" />
                
                {lastUpdate && (
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Error Alert */}
      {error && !isFullscreen && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Map Container */}
      <Paper 
        ref={mapContainerRef}
        sx={{ 
          height: isFullscreen ? '100vh' : '70vh', 
          position: 'relative', 
          overflow: 'hidden',
          backgroundColor: isFullscreen ? '#000' : 'transparent'
        }}
        className={isFullscreen ? 'fullscreen-map' : ''}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 1000,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Fullscreen Toggle Button */}
        <Fab
          size="medium"
          color="primary"
          onClick={toggleFullscreen}
          className="fullscreen-toggle-btn"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </Fab>

        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <MapResizer />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {vehicles.map((vehicle) => (
            <Marker
              key={vehicle.deviceId}
              position={[vehicle.latitude, vehicle.longitude]}
              icon={createVehicleIcon(vehicle.status, vehicle.speed)}
            >
              <Popup>
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {vehicle.name}
                  </Typography>
                  
                  <Box sx={{ mb: 1 }}>
                    <Chip 
                      label={vehicle.status} 
                      color={getStatusColor(vehicle.status)}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" gutterBottom>
                    <SpeedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    Speed: {formatSpeed(vehicle.speed)}
                  </Typography>

                  <Typography variant="body2" gutterBottom>
                    <LocationOnIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    {vehicle.latitude.toFixed(6)}, {vehicle.longitude.toFixed(6)}
                  </Typography>

                  <Typography variant="body2" gutterBottom>
                    <BatteryFullIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    Battery: {getBatteryLevel(vehicle.attributes)}%
                  </Typography>

                  <Typography variant="body2" gutterBottom>
                    Distance Today: {getDistanceToday(vehicle.attributes)}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Last Update: {formatDeviceTime(vehicle.deviceTime)}
                  </Typography>
                </Box>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Paper>

      {/* Vehicle List - Hide in fullscreen */}
      {!isFullscreen && vehicles.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Vehicle List ({vehicles.length} vehicles)
          </Typography>
          
          <Grid container spacing={2}>
            {vehicles.map((vehicle) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={vehicle.deviceId}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { elevation: 4 },
                    border: selectedVehicle?.deviceId === vehicle.deviceId ? 2 : 0,
                    borderColor: 'primary.main'
                  }}
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle2" noWrap gutterBottom>
                      {vehicle.name}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip 
                        label={vehicle.status} 
                        color={getStatusColor(vehicle.status)}
                        size="small"
                      />
                      <Typography variant="caption">
                        {formatSpeed(vehicle.speed)}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatDeviceTime(vehicle.deviceTime)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default FRTTracking; 