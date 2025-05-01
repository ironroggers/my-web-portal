import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { Box, Typography, Paper, CircularProgress, Alert, Container, Card, CardContent, Grid, Chip, Stack, Autocomplete, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Snackbar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

const GOOGLE_MAPS_API_KEY = 'AIzaSyC2pds2TL5_lGUM-7Y1CFiGq8Wrn0oULr0'; // Replace with your API Key

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '8px',
  margin: 'auto',
  marginBottom: '32px',
};

const defaultCenter = { lat: 9.31, lng: 76.45 }; // Kerala

// Set color palette for OFC routes to blue shades
const routeColor = '#1976d2';
const surveyRouteColor = '#FFD700'; // Yellow color for survey routes

const MapViewPage = () => {
  const [locations, setLocations] = useState([]);
  const [locationRoutes, setLocationRoutes] = useState([]); // [{points, directions, routeInfo, mapCenter, error}]
  const [surveyRoutes, setSurveyRoutes] = useState([]); // [{locationId, directions}]
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapZoom, setMapZoom] = useState(11);
  
  // New state variables for location creation
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newLocation, setNewLocation] = useState({
    district: '',
    block: '',
    status: 1,
    route: []
  });
  const [newRoutePoint, setNewRoutePoint] = useState({
    place: '',
    latitude: 0,
    longitude: 0,
    type: 'waypoint'
  });
  const [creatingLocation, setCreatingLocation] = useState(false);
  
  // New state variables for location edit
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editLocation, setEditLocation] = useState(null);
  const [editRoutePoint, setEditRoutePoint] = useState({
    place: '',
    latitude: 0,
    longitude: 0,
    type: 'waypoint'
  });
  const [updatingLocation, setUpdatingLocation] = useState(false);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  useEffect(() => {
    fetchLocations();
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (locations.length > 0 && isLoaded) {
      getAllLocationRoutes(locations);
    }
  }, [locations, isLoaded]);

  useEffect(() => {
    if (isLoaded && locations.length > 0 && surveys.length > 0) {
      getSurveyRoutes();
    }
  }, [locations, surveys, isLoaded]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting to fetch locations from API...');
      const apiUrl = 'https://location-service-mig8.onrender.com/api/locations';
      
      // Add CORS headers to the request
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Include credentials if your API requires authentication
        // credentials: 'include'
      });
      
      console.log('Fetch location status:', response.status);
      
      if (!response.ok) {
        // Log the error response for debugging
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch locations: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetch locations successful, data count:', data.data?.length);
      
      if (!data.success || !Array.isArray(data.data)) {
        console.error('Invalid data format received:', data);
        throw new Error('Invalid data format received');
      }
      
      setLocations(data.data);
    } catch (err) {
      console.error('Fetch locations error:', err);
      
      // Specific handling for CORS errors
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        setError('CORS error: Unable to access the API. This might be due to cross-origin restrictions. Please ensure the API has CORS enabled.');
      } else {
        setError(err.message || 'Error fetching locations');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSurveys = async () => {
    try {
      const response = await fetch('https://survey-service-nxvj.onrender.com/api/surveys');
      if (!response.ok) throw new Error(`Failed to fetch surveys: ${response.statusText}`);
      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) throw new Error('Invalid survey data format received');
      setSurveys(data.data);
    } catch (err) {
      setError((prevError) => prevError ? `${prevError}, ${err.message}` : `Error fetching surveys: ${err.message}`);
    }
  };

  // Extract points for a single location
  const getPointsForLocation = (location) => {
    const points = [];
    if (location?.route?.length > 0) {
      location.route.forEach(point => {
        points.push({ lat: point.latitude, lng: point.longitude });
      });
    }
    // Remove duplicates
    const uniquePoints = points.filter((p, idx, arr) =>
      arr.findIndex(q => q.lat === p.lat && q.lng === p.lng) === idx
    );
    return uniquePoints;
  };

  // For all locations, get their optimized route
  const getAllLocationRoutes = async (locations) => {
    const results = await Promise.all(
      locations.map(async (location) => {
        const points = getPointsForLocation(location);
        if (!window.google || !window.google.maps || points.length < 2) {
          return {
            points,
            directions: null,
            routeInfo: null,
            mapCenter: points[0] || defaultCenter,
            error: points.length < 2 ? 'Not enough points for route' : null,
            location,
          };
        }
        const directionsService = new window.google.maps.DirectionsService();
        const origin = points[0];
        const destination = points[0]; // Loop
        const waypoints = points.slice(1).map(p => ({ location: p, stopover: true }));
        return new Promise((resolve) => {
          directionsService.route(
            {
              origin,
              destination,
              waypoints,
              travelMode: window.google.maps.TravelMode.WALKING,
              optimizeWaypoints: true,
            },
            (result, status) => {
              if (status === 'OK') {
                let totalDistance = 0;
                let totalDuration = 0;
                result.routes[0].legs.forEach(leg => {
                  totalDistance += leg.distance.value;
                  totalDuration += leg.duration.value;
                });
                resolve({
                  points,
                  directions: result,
                  routeInfo: {
                    distance: totalDistance,
                    time: totalDuration,
                    legs: result.routes[0].legs.length,
                  },
                  mapCenter: points[0],
                  error: null,
                  location,
                });
              } else {
                resolve({
                  points,
                  directions: null,
                  routeInfo: null,
                  mapCenter: points[0] || defaultCenter,
                  error: 'Failed to get optimized route from Google Maps.',
                  location,
                });
              }
            }
          );
        });
      })
    );
    setLocationRoutes(results);
  };

  // Calculate routes for survey points for locations with status 5
  const getSurveyRoutes = async () => {
    if (!window.google || !window.google.maps) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    const results = [];

    for (const location of locations) {
      // Skip if location status is not 5
      if (location.status !== 5) continue;

      // Get surveys for this location
      const locationSurveys = surveys.filter(survey => 
        survey.location && (
          (typeof survey.location === 'string' && survey.location === location._id) ||
          (typeof survey.location === 'object' && survey.location._id === location._id)
        )
      );

      // Skip if less than 2 survey points
      if (locationSurveys.length < 2) continue;

      // Create points from survey latlong
      const points = locationSurveys
        .filter(survey => Array.isArray(survey.latlong) && survey.latlong.length === 2)
        .map(survey => ({ lat: survey.latlong[0], lng: survey.latlong[1] }));

      if (points.length < 2) continue;

      // Calculate route for these points
      try {
        const origin = points[0];
        const destination = points[0]; // Create a loop
        const waypoints = points.slice(1).map(p => ({ location: p, stopover: true }));
        
        const result = await new Promise((resolve) => {
          directionsService.route(
            {
              origin,
              destination,
              waypoints,
              travelMode: window.google.maps.TravelMode.WALKING,
              optimizeWaypoints: true,
            },
            (result, status) => {
              if (status === 'OK') {
                resolve({
                  locationId: location._id,
                  directions: result,
                });
              } else {
                resolve({
                  locationId: location._id,
                  directions: null,
                  error: `Failed to get directions: ${status}`
                });
              }
            }
          );
        });
        
        results.push(result);
      } catch (err) {
        console.error(`Error calculating survey route for location ${location._id}:`, err);
      }
    }

    setSurveyRoutes(results);
  };

  // Filter surveys for a specific location
  const getSurveysForLocation = (locationId) => {
    return surveys.filter(survey => 
      survey.location && (
        (typeof survey.location === 'string' && survey.location === locationId) ||
        (typeof survey.location === 'object' && survey.location._id === locationId)
      )
    );
  };

  const formatDistance = (meters) => {
    if (meters == null) return 'Unknown';
    return meters < 1000 ? `${meters.toFixed(0)} m` : `${(meters / 1000).toFixed(2)} km`;
  };

  const formatTime = (seconds) => {
    if (seconds == null) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
  };

  // Find a center for the map (first available point, or default)
  const mapCenter = selectedLocation && selectedLocation.points && selectedLocation.points.length > 0
    ? selectedLocation.points[0]
    : locationRoutes.find(r => r.points && r.points.length > 0)?.points[0] || defaultCenter;

  // Handle location selection from dropdown
  const handleLocationSelect = (event, value) => {
    if (!value) {
      setSelectedLocation(null);
      setMapZoom(11);
      return;
    }
    const found = locationRoutes.find(
      r => r.location && `${r.location.block} (${r.location.district})` === value
    );
    setSelectedLocation(found || null);
    setMapZoom(15);
  };

  // Prepare options for Autocomplete
  const locationOptions = locationRoutes.map(
    r => r.location ? `${r.location.block} (${r.location.district})` : ''
  ).filter(Boolean);

  // Handle open/close of create dialog
  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    // Reset form data
    setNewLocation({
      district: '',
      block: '',
      status: 1,
      route: []
    });
  };

  // Update new location data
  const handleLocationInputChange = (e) => {
    const { name, value } = e.target;
    setNewLocation(prev => ({
      ...prev,
      [name]: name === 'status' ? parseInt(value, 10) : value
    }));
  };

  // Update new route point data
  const handleRoutePointChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'latitude' || name === 'longitude') {
      setNewRoutePoint(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setNewRoutePoint(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Add new route point to the route array
  const handleAddRoutePoint = () => {
    setNewLocation(prev => ({
      ...prev,
      route: [...prev.route, { ...newRoutePoint }]
    }));
    
    // Reset form for next point
    setNewRoutePoint({
      place: '',
      latitude: 0,
      longitude: 0,
      type: 'waypoint'
    });
  };

  // Remove route point from the array
  const handleRemoveRoutePoint = (index) => {
    setNewLocation(prev => ({
      ...prev,
      route: prev.route.filter((_, i) => i !== index)
    }));
  };

  // Create location by sending data to API
  const handleCreateLocation = async () => {
    try {
      setCreatingLocation(true);
      
      // Show pending state in UI
      setSnackbar({
        open: true,
        message: 'Creating location...',
        severity: 'info'
      });
      
      // Log the data being sent for debugging
      console.log('Sending location data:', JSON.stringify(newLocation));
      
      // API endpoint
      const apiEndpoint = 'https://location-service-mig8.onrender.com/api/locations';
      
      // Format data for API
      const formattedData = {
        ...newLocation,
        // Ensure coordinates are numbers, not strings
        route: newLocation.route.map(point => ({
          ...point,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude)
        }))
      };
      
      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formattedData)
          // Uncomment if needed for authentication
          // credentials: 'include'
        });
        
        if (!response) {
          throw new Error('No response received from server');
        }
        
        // Check response status
        console.log('Create location response status:', response.status);
        
        // Handle unsuccessful responses
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response from create location:', errorText);
          throw new Error(`Failed to create location. Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Create location successful:', data);
        
        // Show success message
        setSnackbar({
          open: true,
          message: 'Location created successfully!',
          severity: 'success'
        });
        
        // Close dialog
        handleCloseCreateDialog();
        
        // Refresh locations
        fetchLocations();
      } catch (err) {
        // Handle CORS issues
        if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
          throw new Error('Network error: Could not connect to the server. This could be due to CORS issues or the server being down.');
        }
        throw err;
      }
    } catch (err) {
      console.error('Error creating location:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Error creating location',
        severity: 'error'
      });
    } finally {
      setCreatingLocation(false);
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle open/close of edit dialog
  const handleOpenEditDialog = () => {
    if (!selectedLocation || !selectedLocation.location) {
      setSnackbar({
        open: true,
        message: 'Please select a location to edit',
        severity: 'warning'
      });
      return;
    }
    
    // Clone the selected location for editing
    setEditLocation({
      ...selectedLocation.location,
      route: selectedLocation.location.route ? [...selectedLocation.location.route] : []
    });
    
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditLocation(null);
    setEditRoutePoint({
      place: '',
      latitude: 0,
      longitude: 0,
      type: 'waypoint'
    });
  };

  // Update edit location data
  const handleEditLocationInputChange = (e) => {
    const { name, value } = e.target;
    setEditLocation(prev => ({
      ...prev,
      [name]: name === 'status' ? parseInt(value, 10) : value
    }));
  };

  // Update edit route point data
  const handleEditRoutePointChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'latitude' || name === 'longitude') {
      setEditRoutePoint(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setEditRoutePoint(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Add new route point to the edit route array
  const handleAddEditRoutePoint = () => {
    setEditLocation(prev => ({
      ...prev,
      route: [...prev.route, { ...editRoutePoint }]
    }));
    
    // Reset form for next point
    setEditRoutePoint({
      place: '',
      latitude: 0,
      longitude: 0,
      type: 'waypoint'
    });
  };

  // Remove route point from the edit array
  const handleRemoveEditRoutePoint = (index) => {
    setEditLocation(prev => ({
      ...prev,
      route: prev.route.filter((_, i) => i !== index)
    }));
  };

  // Update location by sending data to API
  const handleUpdateLocation = async () => {
    try {
      setUpdatingLocation(true);
      
      // Show pending state in UI
      setSnackbar({
        open: true,
        message: 'Updating location...',
        severity: 'info'
      });
      
      // Log the data being sent for debugging
      console.log('Sending updated location data:', JSON.stringify(editLocation));
      
      // API endpoint
      const apiEndpoint = `https://location-service-mig8.onrender.com/api/locations/${editLocation._id}`;
      
      // Format data for API
      const formattedData = {
        status: editLocation.status,
        // Only include route if it was modified
        route: editLocation.route.map(point => ({
          ...point,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude)
        }))
      };
      
      try {
        const response = await fetch(apiEndpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formattedData)
        });
        
        if (!response) {
          throw new Error('No response received from server');
        }
        
        // Check response status
        console.log('Update location response status:', response.status);
        
        // Handle unsuccessful responses
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response from update location:', errorText);
          throw new Error(`Failed to update location. Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Update location successful:', data);
        
        // Show success message
        setSnackbar({
          open: true,
          message: 'Location updated successfully!',
          severity: 'success'
        });
        
        // Close dialog
        handleCloseEditDialog();
        
        // Refresh locations
        fetchLocations();
      } catch (err) {
        // Handle CORS issues
        if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
          throw new Error('Network error: Could not connect to the server. This could be due to CORS issues or the server being down.');
        }
        throw err;
      }
    } catch (err) {
      console.error('Error updating location:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Error updating location',
        severity: 'error'
      });
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Handle dragging of route points in edit dialog
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (sourceIndex === targetIndex) return;
    
    setEditLocation(prev => {
      const newRoute = [...prev.route];
      const [movedItem] = newRoute.splice(sourceIndex, 1);
      newRoute.splice(targetIndex, 0, movedItem);
      return { ...prev, route: newRoute };
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            OFC Route Map View (Google Maps)
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Create New Location
          </Button>
        </Box>
        <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 2 }}>
          All locations' routes are shown in blue. Survey points are shown in yellow. For locations with status 5, survey points are connected with yellow routes.
        </Typography>
        {/* Search Dropdown */}
        <Box sx={{ mb: 3, maxWidth: 400 }}>
          <Autocomplete
            options={locationOptions}
            value={selectedLocation && selectedLocation.location ? `${selectedLocation.location.block} (${selectedLocation.location.district})` : null}
            onChange={handleLocationSelect}
            renderInput={(params) => <TextField {...params} label="Search Location" variant="outlined" />}
            clearOnEscape
            isOptionEqualToValue={(option, value) => option === value}
          />
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading || !isLoaded ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Loading map data...</Typography>
          </Box>
        ) : (
          <>
            {/* Legend */}
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Box sx={{ width: 18, height: 4, bgcolor: routeColor, mr: 1, border: '1px solid #fff' }} />
                <Typography variant="body2">OFC Routes</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Box sx={{ width: 18, height: 18, bgcolor: '#FFD700', borderRadius: '50%', mr: 1, border: '2px solid #fff' }} />
                <Typography variant="body2">Survey Points</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Box sx={{ width: 18, height: 4, bgcolor: surveyRouteColor, mr: 1, border: '1px solid #fff' }} />
                <Typography variant="body2">Survey Routes (Status 5)</Typography>
              </Box>
            </Stack>

            {/* Info cards for each location or summary */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {selectedLocation ? (
                <Grid item xs={12} md={6} lg={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: routeColor }}>
                          {selectedLocation.location?.block} ({selectedLocation.location?.district})
                        </Typography>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color="primary" 
                          startIcon={<EditIcon />}
                          onClick={handleOpenEditDialog}
                        >
                          Edit
                        </Button>
                      </Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Status: {selectedLocation.location?.status}
                        {selectedLocation.location?.status === 5 && 
                          <Chip label="Survey Route Enabled" color="warning" size="small" sx={{ ml: 1 }} />
                        }
                      </Typography>
                      {selectedLocation.error && (
                        <Alert severity="warning" sx={{ my: 1 }}>{selectedLocation.error}</Alert>
                      )}
                      {selectedLocation.routeInfo && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary">Total Distance:</Typography>
                          <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                            {formatDistance(selectedLocation.routeInfo.distance)}
                          </Typography>
                          <Typography variant="subtitle2" color="text.secondary">Estimated Travel Time:</Typography>
                          <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                            {formatTime(selectedLocation.routeInfo.time)}
                          </Typography>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                            Survey Points: {getSurveysForLocation(selectedLocation.location?._id).length}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <Chip label="Optimized OFC Route" color="success" size="small" sx={{ mr: 1 }} />
                            <Chip label="Complete Loop" color="primary" size="small" sx={{ mr: 1 }} />
                            <Chip label={`${selectedLocation.routeInfo.legs} Segments`} color="info" size="small" />
                          </Box>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                (() => {
                  // Calculate total distance and time for all locations
                  const total = locationRoutes.reduce((acc, route) => {
                    if (route.routeInfo) {
                      acc.distance += route.routeInfo.distance || 0;
                      acc.time += route.routeInfo.time || 0;
                    }
                    return acc;
                  }, { distance: 0, time: 0 });
                  return (
                    <Grid item xs={12} md={6} lg={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            Total for All Locations
                          </Typography>
                          <Typography variant="subtitle2" color="text.secondary">Total Distance:</Typography>
                          <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                            {formatDistance(total.distance)}
                          </Typography>
                          <Typography variant="subtitle2" color="text.secondary">Estimated Travel Time:</Typography>
                          <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                            {formatTime(total.time)}
                          </Typography>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                            Total Survey Points: {surveys.length}
                          </Typography>
                          <Typography variant="subtitle2" color="text.secondary">
                            Locations with Survey Routes: {surveyRoutes.length}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })()
              )}
            </Grid>
            {/* Single map for all locations */}
            <Box>
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={mapZoom}
              >
                {/* Render markers and routes for all locations */}
                {locationRoutes.map((route, idx) => {
                  const isSelected = selectedLocation && selectedLocation.location && route.location &&
                    route.location.block === selectedLocation.location.block &&
                    route.location.district === selectedLocation.location.district;
                  return (
                    <React.Fragment key={`routefrag-${idx}`}>
                      {route.points.map((point, pidx) => (
                        <Marker
                          key={`marker-${idx}-${pidx}`}
                          position={point}
                          label={`${pidx + 1}`}
                          icon={{
                            path: window.google && window.google.maps ? window.google.maps.SymbolPath.CIRCLE : undefined,
                            scale: isSelected ? 11 : 7,
                            fillColor: routeColor,
                            fillOpacity: 1,
                            strokeColor: isSelected ? '#000' : '#fff',
                            strokeWeight: isSelected ? 4 : 2,
                          }}
                        />
                      ))}
                      {route.directions && (
                        <DirectionsRenderer
                          directions={route.directions}
                          options={{
                            suppressMarkers: true,
                            polylineOptions: {
                              strokeColor: routeColor,
                              strokeWeight: isSelected ? 10 : 6,
                              strokeOpacity: isSelected ? 1 : 0.9,
                            },
                          }}
                        />
                      )}
                      
                      {/* Render survey points for this location */}
                      {route.location && getSurveysForLocation(route.location._id).map((survey, sidx) => (
                        <Marker
                          key={`survey-${idx}-${sidx}`}
                          position={{ lat: survey.latlong[0], lng: survey.latlong[1] }}
                          title={survey.title}
                          icon={{
                            path: window.google && window.google.maps ? window.google.maps.SymbolPath.CIRCLE : undefined,
                            scale: 8,
                            fillColor: '#FFD700', // Yellow color for survey points
                            fillOpacity: 1,
                            strokeColor: '#000',
                            strokeWeight: 2,
                          }}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* Render survey routes for locations with status 5 */}
                {surveyRoutes.map((route, idx) => {
                  if (!route.directions) return null;
                  const locationData = locations.find(loc => loc._id === route.locationId);
                  const isSelected = selectedLocation && selectedLocation.location && 
                    locationData && selectedLocation.location._id === locationData._id;
                  
                  return (
                    <DirectionsRenderer
                      key={`survey-route-${idx}`}
                      directions={route.directions}
                      options={{
                        suppressMarkers: true,
                        polylineOptions: {
                          strokeColor: surveyRouteColor,
                          strokeWeight: isSelected ? 6 : 4,
                          strokeOpacity: 0.8,
                          strokeDasharray: "5,5", // Create a dashed line
                        },
                      }}
                    />
                  );
                })}
              </GoogleMap>
            </Box>
          </>
        )}
      </Paper>

      {/* Create Location Dialog */}
      <Dialog 
        open={openCreateDialog} 
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          Create New Location
          <IconButton
            aria-label="close"
            onClick={handleCloseCreateDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="District"
                name="district"
                value={newLocation.district}
                onChange={handleLocationInputChange}
                fullWidth
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Block"
                name="block"
                value={newLocation.block}
                onChange={handleLocationInputChange}
                fullWidth
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Status"
                name="status"
                type="number"
                value={newLocation.status}
                onChange={handleLocationInputChange}
                fullWidth
                margin="normal"
                required
                inputProps={{ min: 1, max: 6 }}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Add Route Points
          </Typography>

          {/* New route point form */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Place Name"
                name="place"
                value={newRoutePoint.place}
                onChange={handleRoutePointChange}
                fullWidth
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Latitude"
                name="latitude"
                type="number"
                value={newRoutePoint.latitude}
                onChange={handleRoutePointChange}
                fullWidth
                margin="normal"
                required
                inputProps={{ step: 0.000001, min: -90, max: 90 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Longitude"
                name="longitude"
                type="number"
                value={newRoutePoint.longitude}
                onChange={handleRoutePointChange}
                fullWidth
                margin="normal"
                required
                inputProps={{ step: 0.000001, min: -180, max: 180 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Point Type"
                name="type"
                value={newRoutePoint.type}
                onChange={handleRoutePointChange}
                fullWidth
                margin="normal"
                required
              >
                <option value="waypoint">Waypoint</option>
                <option value="landmark">Landmark</option>
                <option value="junction">Junction</option>
                <option value="panchayat">Panchayat Office</option>
                <option value="other">Other</option>
              </TextField>
            </Grid>
            <Grid item xs={12} display="flex" justifyContent="flex-end">
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleAddRoutePoint}
                disabled={!newRoutePoint.place || !newRoutePoint.type}
              >
                Add Point
              </Button>
            </Grid>
          </Grid>

          {/* Display route points table */}
          {newLocation.route.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Place</TableCell>
                    <TableCell>Latitude</TableCell>
                    <TableCell>Longitude</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {newLocation.route.map((point, index) => (
                    <TableRow key={index}>
                      <TableCell>{point.place}</TableCell>
                      <TableCell>{point.latitude.toFixed(6)}</TableCell>
                      <TableCell>{point.longitude.toFixed(6)}</TableCell>
                      <TableCell>{point.type}</TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleRemoveRoutePoint(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateLocation} 
            variant="contained" 
            color="primary"
            disabled={creatingLocation || !newLocation.district || !newLocation.block || newLocation.route.length === 0}
          >
            {creatingLocation ? 'Creating...' : 'Create Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          Edit Location
          <IconButton
            aria-label="close"
            onClick={handleCloseEditDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editLocation && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="District"
                    name="district"
                    value={editLocation.district}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Block"
                    name="block"
                    value={editLocation.block}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Status"
                    name="status"
                    type="number"
                    value={editLocation.status}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ min: 1, max: 6 }}
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Edit Route Points
              </Typography>

              {/* New route point form */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Place Name"
                    name="place"
                    value={editRoutePoint.place}
                    onChange={handleEditRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Latitude"
                    name="latitude"
                    type="number"
                    value={editRoutePoint.latitude}
                    onChange={handleEditRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ step: 0.000001, min: -90, max: 90 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Longitude"
                    name="longitude"
                    type="number"
                    value={editRoutePoint.longitude}
                    onChange={handleEditRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ step: 0.000001, min: -180, max: 180 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    label="Point Type"
                    name="type"
                    value={editRoutePoint.type}
                    onChange={handleEditRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                  >
                    <option value="waypoint">Waypoint</option>
                    <option value="landmark">Landmark</option>
                    <option value="junction">Junction</option>
                    <option value="panchayat">Panchayat Office</option>
                    <option value="other">Other</option>
                  </TextField>
                </Grid>
                <Grid item xs={12} display="flex" justifyContent="flex-end">
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    onClick={handleAddEditRoutePoint}
                    disabled={!editRoutePoint.place || !editRoutePoint.type}
                  >
                    Add Point
                  </Button>
                </Grid>
              </Grid>

              {/* Display route points table with drag-and-drop */}
              {editLocation.route && editLocation.route.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Drag to reorder points. The first point is the starting point.
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width="60px">Order</TableCell>
                          <TableCell>Place</TableCell>
                          <TableCell>Latitude</TableCell>
                          <TableCell>Longitude</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {editLocation.route.map((point, index) => (
                          <TableRow 
                            key={index}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            sx={{ 
                              cursor: 'move',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                              ...(index === 0 ? { bgcolor: 'primary.light', color: 'primary.contrastText' } : {})
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <DragIndicatorIcon fontSize="small" sx={{ mr: 1, cursor: 'grab' }} />
                                {index + 1}
                              </Box>
                            </TableCell>
                            <TableCell>{point.place}</TableCell>
                            <TableCell>{Number(point.latitude).toFixed(6)}</TableCell>
                            <TableCell>{Number(point.longitude).toFixed(6)}</TableCell>
                            <TableCell>{point.type}</TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleRemoveEditRoutePoint(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Note: The first point (highlighted) will be both the starting and ending point of the route.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button 
            onClick={handleUpdateLocation} 
            variant="contained" 
            color="primary"
            disabled={updatingLocation || !editLocation || editLocation.route.length === 0}
          >
            {updatingLocation ? 'Updating...' : 'Update Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        severity={snackbar.severity}
      />
    </Container>
  );
};

export default MapViewPage;