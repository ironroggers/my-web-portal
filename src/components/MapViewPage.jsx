import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { Box, Typography, Paper, CircularProgress, Alert, Container, Card, CardContent, Grid, Chip, Stack, Autocomplete, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Snackbar, Menu, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';

const GOOGLE_MAPS_API_KEY = 'AIzaSyC2pds2TL5_lGUM-7Y1CFiGq8Wrn0oULr0'; // Replace with your API Key

const containerStyle = {
  width: '100%',
  height: '70vh', // More responsive height
  borderRadius: '12px',
  margin: 'auto',
  marginBottom: '32px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' // Add shadow for depth
};

const defaultCenter = { lat: 9.31, lng: 76.45 }; // Kerala

// Set color palette for OFC routes to blue shades
const routeColor = '#2563eb'; // Brighter blue
const surveyRouteColor = '#f59e0b'; // More vibrant yellow

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
    type: 'GP'
  });
  const [creatingLocation, setCreatingLocation] = useState(false);
  
  // New state variables for location edit
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editLocation, setEditLocation] = useState(null);
  const [editRoutePoint, setEditRoutePoint] = useState({
    place: '',
    latitude: 0,
    longitude: 0,
    type: 'GP'
  });
  const [updatingLocation, setUpdatingLocation] = useState(false);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Export menu state
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);

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
      status: 1, // Keep status as 1 by default
      route: []
    });
  };

  // Update new location data
  const handleLocationInputChange = (e) => {
    const { name, value } = e.target;
    setNewLocation(prev => ({
      ...prev,
      [name]: value
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
    // Check if trying to add BHQ when one already exists
    if (newRoutePoint.type === 'BHQ' && 
        newLocation.route.some(point => point.type === 'BHQ')) {
      setSnackbar({
        open: true,
        message: 'Only one BHQ (Block Head Quarter) can be added per location',
        severity: 'warning'
      });
      return;
    }
    
    setNewLocation(prev => ({
      ...prev,
      route: [...prev.route, { ...newRoutePoint }]
    }));
    
    // Reset form for next point
    setNewRoutePoint({
      place: '',
      latitude: 0,
      longitude: 0,
      type: 'GP'
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
        // Always set status to 1 for new locations
        status: 1,
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
      type: 'GP'
    });
  };

  // Update edit location data
  const handleEditLocationInputChange = (e) => {
    const { name, value } = e.target;
    setEditLocation(prev => ({
      ...prev,
      [name]: value
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
    // Check if trying to add BHQ when one already exists
    if (editRoutePoint.type === 'BHQ' && 
        editLocation.route.some(point => point.type === 'BHQ')) {
      setSnackbar({
        open: true,
        message: 'Only one BHQ (Block Head Quarter) can be added per location',
        severity: 'warning'
      });
      return;
    }
    
    setEditLocation(prev => ({
      ...prev,
      route: [...prev.route, { ...editRoutePoint }]
    }));
    
    // Reset form for next point
    setEditRoutePoint({
      place: '',
      latitude: 0,
      longitude: 0,
      type: 'GP'
    });
  };

  // Remove route point from the edit array
  const handleRemoveEditRoutePoint = (index) => {
    // Don't allow removing the last point
    if (editLocation.route.length <= 1) {
      setSnackbar({
        open: true,
        message: 'Cannot remove the last point. A route must have at least one point.',
        severity: 'warning'
      });
      return;
    }
    
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

  // Handle opening export menu
  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  // Handle closing export menu
  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  // Export to Excel
  const handleExportToExcel = () => {
    if (!selectedLocation || !selectedLocation.location) return;
    
    // Create data in the format shown in the image
    const routePoints = selectedLocation.location.route || [];
    
    // Format data to match the table in the image
    const excelData = [];
    
    // Add header row (optional)
    excelData.push([
      'Sl. No.',
      'District',
      'Block',
      'Gram Panchayat',
      'From',
      'Lat',
      'Long',
      'To',
      'Lat',
      'Long',
      'Desktop Survey OFC Length (Mtr)',
      'Total Length in (Mtr)'
    ]);
    
    // Calculate total length - sum of all segment lengths
    let totalLength = 0;
    if (selectedLocation.routeInfo && selectedLocation.routeInfo.distance) {
      totalLength = Math.round(selectedLocation.routeInfo.distance);
    }
    
    // Add rows for each segment of the route
    if (routePoints.length > 1) {
      for (let i = 0; i < routePoints.length - 1; i++) {
        const fromPoint = routePoints[i];
        const toPoint = routePoints[i + 1];
        
        // Calculate distance for this segment (in meters)
        let segmentDistance = 0;
        if (selectedLocation.directions && 
            selectedLocation.directions.routes && 
            selectedLocation.directions.routes[0] && 
            selectedLocation.directions.routes[0].legs && 
            selectedLocation.directions.routes[0].legs[i]) {
          segmentDistance = Math.round(selectedLocation.directions.routes[0].legs[i].distance.value);
        }
        
        excelData.push([
          i + 1, // Sl. No.
          selectedLocation.location.district,
          selectedLocation.location.block,
          fromPoint.place, // Gram Panchayat
          fromPoint.place, // From
          Number(fromPoint.latitude).toFixed(6), // Lat of From
          Number(fromPoint.longitude).toFixed(6), // Long of From
          toPoint.place, // To
          Number(toPoint.latitude).toFixed(6), // Lat of To
          Number(toPoint.longitude).toFixed(6), // Long of To
          segmentDistance, // Desktop Survey OFC Length (Mtr)
          totalLength // Total Length in (Mtr) - same for all rows
        ]);
      }
      
      // Add last row to connect back to start (for complete loop)
      const lastPoint = routePoints[routePoints.length - 1];
      const firstPoint = routePoints[0];
      
      // Calculate distance for the final segment
      let finalSegmentDistance = 0;
      if (selectedLocation.directions && 
          selectedLocation.directions.routes && 
          selectedLocation.directions.routes[0] && 
          selectedLocation.directions.routes[0].legs && 
          selectedLocation.directions.routes[0].legs[routePoints.length - 1]) {
        finalSegmentDistance = Math.round(selectedLocation.directions.routes[0].legs[routePoints.length - 1].distance.value);
      }
      
      excelData.push([
        routePoints.length, // Sl. No.
        selectedLocation.location.district,
        selectedLocation.location.block,
        lastPoint.place, // Gram Panchayat
        lastPoint.place, // From
        Number(lastPoint.latitude).toFixed(6), // Lat of From
        Number(lastPoint.longitude).toFixed(6), // Long of From
        firstPoint.place, // To
        Number(firstPoint.latitude).toFixed(6), // Lat of To
        Number(firstPoint.longitude).toFixed(6), // Long of To
        finalSegmentDistance, // Desktop Survey OFC Length (Mtr)
        totalLength // Total Length in (Mtr) - same for all rows
      ]);
    }
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'OFC Route');
    
    // Generate filename from location info
    const fileName = `${selectedLocation.location.block}_${selectedLocation.location.district}_OFC_Route.xlsx`;
    
    // Write and download the file
    XLSX.writeFile(wb, fileName);
    
    // Close the menu
    handleExportClose();
    
    // Show success message
    setSnackbar({
      open: true,
      message: 'Excel file exported successfully!',
      severity: 'success'
    });
  };
  
  // Export to KML
  const handleExportToKML = () => {
    if (!selectedLocation || !selectedLocation.location || !selectedLocation.directions) {
      setSnackbar({
        open: true,
        message: 'Error: No route data available for export',
        severity: 'error'
      });
      return;
    }
    
    // Create KML data
    const routePoints = selectedLocation.location.route || [];
    
    // Extract route path points from directions
    let routePath = [];
    
    try {
      // Extract the detailed path from Google's directions response
      const routes = selectedLocation.directions.routes;
      
      if (routes && routes.length > 0) {
        // Get the overview path (encoded polyline)
        routes[0].legs.forEach(leg => {
          if (leg.steps) {
            leg.steps.forEach(step => {
              if (step.path) {
                // Add each path point 
                step.path.forEach(point => {
                  routePath.push({
                    lat: point.lat(),
                    lng: point.lng()
                  });
                });
              }
            });
          }
        });
      }
      
      // If we couldn't get the detailed path, use the overview polyline
      if (routePath.length === 0 && routes[0].overview_path) {
        routes[0].overview_path.forEach(point => {
          routePath.push({
            lat: point.lat(),
            lng: point.lng() 
          });
        });
      }
    } catch (error) {
      console.error("Error extracting route path:", error);
      // If extraction fails, fall back to direct lines between waypoints
      if (routePoints.length > 1) {
        routePoints.forEach(point => {
          routePath.push({
            lat: point.latitude,
            lng: point.longitude
          });
        });
        // Add first point again to close the loop
        routePath.push({
          lat: routePoints[0].latitude,
          lng: routePoints[0].longitude
        });
      }
    }
    
    // If we still don't have a path, show an error
    if (routePath.length === 0) {
      setSnackbar({
        open: true,
        message: 'Error: Could not extract route data from Google Maps',
        severity: 'error'
      });
      return;
    }
    
    // KML header
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${selectedLocation.location.block} - ${selectedLocation.location.district} OFC Route</name>
    <description>Optimized OFC Route for ${selectedLocation.location.block}, ${selectedLocation.location.district}</description>
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Style id="waypointStyle">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>`;
    
    // Add optimized route as LineString
    kml += `
    <Placemark>
      <name>OFC Route (Optimized)</name>
      <description>Google Maps optimized route</description>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <coordinates>`;
      
    // Add all coordinates from the route path
    routePath.forEach(point => {
      kml += `
        ${point.lng},${point.lat},0`;
    });
      
    kml += `
        </coordinates>
      </LineString>
    </Placemark>`;
    
    // Add waypoints (the actual stops)
    routePoints.forEach((point, index) => {
      kml += `
    <Placemark>
      <name>${point.place}</name>
      <description>Point ${index + 1}: ${point.place} (${point.type})</description>
      <styleUrl>#waypointStyle</styleUrl>
      <Point>
        <coordinates>${point.longitude},${point.latitude},0</coordinates>
      </Point>
    </Placemark>`;
    });
    
    // Close KML
    kml += `
  </Document>
</kml>`;
    
    // Create Blob
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLocation.location.block}_${selectedLocation.location.district}_OFC_Route.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Close the menu
    handleExportClose();
    
    // Show success message
    setSnackbar({
      open: true,
      message: 'KML file with optimized route exported successfully!',
      severity: 'success'
    });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" fontWeight="700" sx={{ color: '#1e293b' }}>
            OFC Route Map View
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            sx={{ 
              borderRadius: '8px',
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
            }}
          >
            Create New Location
          </Button>
        </Box>
        <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.6 }}>
          All locations' routes are shown in blue. Survey points are shown in yellow. For locations with status 5, survey points are connected with yellow routes.
        </Typography>
        
        {/* Search and controls section */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
            <Autocomplete
              options={locationOptions}
              value={selectedLocation && selectedLocation.location ? `${selectedLocation.location.block} (${selectedLocation.location.district})` : null}
              onChange={handleLocationSelect}
              renderInput={(params) => <TextField 
                {...params} 
                label="Search Location" 
                variant="outlined" 
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  sx: { borderRadius: '8px' }
                }}
              />}
              clearOnEscape
              isOptionEqualToValue={(option, value) => option === value}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(0, 0, 0, 0.12)' },
                  '&:hover fieldset': { borderColor: 'primary.main' },
                },
                '& .MuiAutocomplete-option': {
                  fontSize: '0.95rem',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                },
                '& .MuiAutocomplete-inputRoot': {
                  minHeight: '52px'
                }
              }}
              ListboxProps={{
                sx: { maxHeight: 250 }
              }}
            />
          </Box>
          {selectedLocation && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                startIcon={<EditIcon />}
                onClick={handleOpenEditDialog}
                sx={{ borderRadius: '8px', fontWeight: 500, flex: 1 }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportClick}
                sx={{ borderRadius: '8px', fontWeight: 500, flex: 1 }}
              >
                Export
              </Button>
            </Box>
          )}
        </Box>
        
        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>{error}</Alert>}
        {loading || !isLoaded ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={60} thickness={4} />
            <Typography sx={{ mt: 3, fontWeight: 500 }}>Loading map data...</Typography>
          </Box>
        ) : (
          <>
            {/* Legend */}
            <Box sx={{ 
              display: 'flex', 
              gap: 3, 
              mb: 3, 
              flexWrap: 'wrap',
              p: 2,
              bgcolor: 'rgba(0,0,0,0.02)',
              borderRadius: '8px'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 24, height: 5, bgcolor: routeColor, mr: 1, borderRadius: '4px' }} />
                <Typography variant="body2" fontWeight={500}>OFC Routes</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 18, height: 18, bgcolor: '#f44336', borderRadius: '50%', mr: 1, border: '2px solid #fff' }} />
                <Typography variant="body2" fontWeight={500}>BHQ (Block Head Quarter)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 18, height: 18, bgcolor: routeColor, borderRadius: '50%', mr: 1, border: '2px solid #fff' }} />
                <Typography variant="body2" fontWeight={500}>GP (Gram Panchayat)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 18, height: 18, bgcolor: '#f59e0b', borderRadius: '50%', mr: 1, border: '2px solid #fff' }} />
                <Typography variant="body2" fontWeight={500}>Survey Points</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 24, height: 5, bgcolor: surveyRouteColor, mr: 1, borderRadius: '4px' }} />
                <Typography variant="body2" fontWeight={500}>Survey Routes (Status 5)</Typography>
              </Box>
            </Box>

            {/* Info cards for each location or summary */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {selectedLocation ? (
                <Grid item xs={12} md={6} lg={4}>
                  <Card sx={{ 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: `1px solid ${routeColor}20`
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: routeColor }}>
                          {selectedLocation.location?.block} ({selectedLocation.location?.district})
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2, 
                        p: 1.5, 
                        bgcolor: 'rgba(0,0,0,0.03)', 
                        borderRadius: '8px' 
                      }}>
                        <Typography variant="subtitle2" sx={{ mr: 1 }}>
                          Status: {selectedLocation.location?.status}
                        </Typography>
                        {selectedLocation.location?.status === 5 && 
                          <Chip label="Survey Route Enabled" color="warning" size="small" sx={{ fontWeight: 500 }} />
                        }
                      </Box>
                      {selectedLocation.error && (
                        <Alert severity="warning" sx={{ my: 2, borderRadius: '8px' }}>{selectedLocation.error}</Alert>
                      )}
                      {selectedLocation.routeInfo && (
                        <>
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6}>
                              <Typography variant="subtitle2" color="text.secondary">Total Distance:</Typography>
                              <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {formatDistance(selectedLocation.routeInfo.distance)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="subtitle2" color="text.secondary">Est. Travel Time:</Typography>
                              <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {formatTime(selectedLocation.routeInfo.time)}
                              </Typography>
                            </Grid>
                          </Grid>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                            Survey Points: {getSurveysForLocation(selectedLocation.location?._id).length}
                          </Typography>
                          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Chip label="Optimized OFC Route" color="success" size="small" sx={{ fontWeight: 500 }} />
                            <Chip label="Complete Loop" color="primary" size="small" sx={{ fontWeight: 500 }} />
                            <Chip label={`${selectedLocation.routeInfo.legs} Segments`} color="info" size="small" sx={{ fontWeight: 500 }} />
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
                      <Card sx={{ 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                        borderRadius: '12px',
                        overflow: 'hidden' 
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2 }}>
                            Total for All Locations
                          </Typography>
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6}>
                              <Typography variant="subtitle2" color="text.secondary">Total Distance:</Typography>
                              <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {formatDistance(total.distance)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="subtitle2" color="text.secondary">Est. Travel Time:</Typography>
                              <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {formatTime(total.time)}
                              </Typography>
                            </Grid>
                          </Grid>
                          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Total Survey Points: <strong>{surveys.length}</strong>
                            </Typography>
                            <Typography variant="subtitle2" color="text.secondary">
                              Locations with Survey Routes: <strong>{surveyRoutes.length}</strong>
                            </Typography>
                          </Box>
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
                      {route.points.map((point, pidx) => {
                        // Determine if this point corresponds to a BHQ type
                        const routePoint = route.location?.route[pidx];
                        const isBHQ = routePoint && routePoint.type === 'BHQ';
                        
                        return (
                          <Marker
                            key={`marker-${idx}-${pidx}`}
                            position={point}
                            label={`${pidx + 1}`}
                            icon={{
                              path: window.google && window.google.maps ? window.google.maps.SymbolPath.CIRCLE : undefined,
                              scale: isSelected ? 11 : 7,
                              fillColor: isBHQ ? '#f44336' : routeColor, // Red color for BHQ points
                              fillOpacity: 1,
                              strokeColor: isSelected ? '#000' : '#fff',
                              strokeWeight: isSelected ? 4 : 2,
                            }}
                          />
                        );
                      })}
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
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          fontSize: '1.3rem',
          fontWeight: 600,
          py: 2
        }}>
          Create New Location
          <IconButton
            aria-label="close"
            onClick={handleCloseCreateDialog}
            sx={{
              position: 'absolute',
              right: 16,
              top: 12,
              color: 'white'
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Box sx={{ p: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="District"
                  name="district"
                  value={newLocation.district}
                  onChange={handleLocationInputChange}
                  fullWidth
                  margin="normal"
                  required
                  InputProps={{
                    sx: { borderRadius: '8px' }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Block"
                  name="block"
                  value={newLocation.block}
                  onChange={handleLocationInputChange}
                  fullWidth
                  margin="normal"
                  required
                  InputProps={{
                    sx: { borderRadius: '8px' }
                  }}
                />
              </Grid>
            </Grid>

            <Box 
              sx={{ 
                mt: 4, 
                mb: 3, 
                borderLeft: '4px solid',
                borderColor: 'secondary.main',
                pl: 2,
                py: 0.5
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Add Route Points
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add all points in the order they should appear in the route
              </Typography>
            </Box>

            {/* New route point form */}
            <Paper sx={{ p: 2, borderRadius: '12px', mb: 3, bgcolor: 'rgba(0,0,0,0.02)' }}>
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
                    InputProps={{
                      sx: { borderRadius: '8px' }
                    }}
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
                    InputProps={{
                      sx: { borderRadius: '8px' }
                    }}
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
                    InputProps={{
                      sx: { borderRadius: '8px' }
                    }}
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
                    InputProps={{
                      sx: { borderRadius: '8px' }
                    }}
                  >
                    <MenuItem value="BHQ">BHQ (Block Head Quarter)</MenuItem>
                    <MenuItem value="GP">GP (Gram Panchayat)</MenuItem>
                    <MenuItem value="others">Others</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} display="flex" justifyContent="flex-end">
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    onClick={handleAddRoutePoint}
                    disabled={!newRoutePoint.place || !newRoutePoint.type}
                    sx={{ 
                      borderRadius: '8px', 
                      px: 3,
                      fontWeight: 500,
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    Add Point
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Display route points table */}
            {newLocation.route.length > 0 && (
              <TableContainer component={Paper} sx={{ 
                mt: 3, 
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)' 
              }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'primary.light' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 500 }}>Place</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 500 }}>Latitude</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 500 }}>Longitude</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 500 }}>Type</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 500 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {newLocation.route.map((point, index) => (
                      <TableRow key={index} sx={{ 
                        '&:nth-of-type(odd)': { bgcolor: 'rgba(0,0,0,0.02)' } 
                      }}>
                        <TableCell>{point.place}</TableCell>
                        <TableCell>{point.latitude.toFixed(6)}</TableCell>
                        <TableCell>{point.longitude.toFixed(6)}</TableCell>
                        <TableCell>{point.type}</TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemoveRoutePoint(index)}
                            sx={{ '&:hover': { bgcolor: 'error.light', color: 'white' } }}
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
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={handleCloseCreateDialog}
            variant="outlined"
            sx={{ borderRadius: '8px', px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateLocation} 
            variant="contained" 
            color="primary"
            disabled={creatingLocation || !newLocation.district || !newLocation.block || newLocation.route.length === 0}
            sx={{ 
              borderRadius: '8px', 
              px: 4,
              fontWeight: 600,
              ml: 2
            }}
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
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          fontSize: '1.3rem',
          fontWeight: 600,
          py: 2
        }}>
          Edit Location
          <IconButton
            aria-label="close"
            onClick={handleCloseEditDialog}
            sx={{
              position: 'absolute',
              right: 16,
              top: 12,
              color: 'white'
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
                    <MenuItem value="BHQ">BHQ (Block Head Quarter)</MenuItem>
                    <MenuItem value="GP">GP (Gram Panchayat)</MenuItem>
                    <MenuItem value="others">Others</MenuItem>
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
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2, 
                    p: 2, 
                    bgcolor: 'info.light', 
                    borderRadius: '8px',
                    color: 'info.contrastText'
                  }}>
                    <DragIndicatorIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle2" fontWeight={500}>
                      Drag to reorder points. The first point is both the starting and ending point.
                    </Typography>
                  </Box>
                  
                  <TableContainer component={Paper} sx={{ 
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'primary.light' }}>
                        <TableRow>
                          <TableCell width="80px" sx={{ color: 'white', fontWeight: 500 }}>Order</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 500 }}>Place</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 500 }}>Latitude</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 500 }}>Longitude</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 500 }}>Type</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 500 }}>Actions</TableCell>
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
                              ...(index === 0 ? { 
                                bgcolor: 'primary.light', 
                                '& .MuiTableCell-root': {
                                  color: 'white',
                                  fontWeight: 500
                                }
                              } : {
                                '&:nth-of-type(odd)': { bgcolor: 'rgba(0,0,0,0.02)' }
                              })
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
                            <TableCell>
                              <Chip 
                                label={point.type} 
                                size="small" 
                                color={index === 0 ? "default" : "primary"}
                                variant={index === 0 ? "default" : "outlined"}
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                color={index === 0 ? "default" : "error"} 
                                onClick={() => handleRemoveEditRoutePoint(index)}
                                sx={{ 
                                  '&:hover': { 
                                    bgcolor: index === 0 ? 'rgba(255,255,255,0.2)' : 'error.light', 
                                    color: index === 0 ? 'inherit' : 'white' 
                                  } 
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity || 'info'} 
          sx={{ 
            width: '100%', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            '& .MuiAlert-icon': {
              fontSize: '1.25rem'
            },
            '& .MuiAlert-message': {
              fontSize: '0.95rem',
              fontWeight: 500
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Export menu */}
      <Menu
        anchorEl={exportAnchorEl}
        open={openExportMenu}
        onClose={handleExportClose}
        PaperProps={{
          sx: { 
            borderRadius: '8px',
            mt: 1,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }
        }}
      >
        <MenuItem onClick={handleExportToExcel} sx={{ py: 1.5, px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FileDownloadIcon color="primary" />
            <Typography>Export to Excel</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={handleExportToKML} sx={{ py: 1.5, px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FileDownloadIcon color="success" />
            <Typography>Export to KML</Typography>
          </Box>
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default MapViewPage;