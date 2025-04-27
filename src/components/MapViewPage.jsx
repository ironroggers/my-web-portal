import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { Box, Typography, Paper, CircularProgress, Alert, Container, Card, CardContent, Grid, Chip, Stack, Autocomplete, TextField } from '@mui/material';

const GOOGLE_MAPS_API_KEY = 'AIzaSyC2pds2TL5_lGUM-7Y1CFiGq8Wrn0oULr0'; // Replace with your API Key

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '8px',
  margin: 'auto',
  marginBottom: '32px',
};

const defaultCenter = { lat: 9.31, lng: 76.45 }; // Kerala

// Generate a color palette for up to 10 locations
const colorPalette = [
  '#1976d2', '#e53935', '#43a047', '#fbc02d', '#8e24aa', '#00897b', '#f57c00', '#6d4c41', '#c2185b', '#3949ab'
];

const MapViewPage = () => {
  const [locations, setLocations] = useState([]);
  const [locationRoutes, setLocationRoutes] = useState([]); // [{points, directions, routeInfo, mapCenter, error}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapZoom, setMapZoom] = useState(11);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (locations.length > 0 && isLoaded) {
      getAllLocationRoutes(locations);
    }
  }, [locations, isLoaded]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('https://location-service-mig8.onrender.com/api/locations');
      if (!response.ok) throw new Error(`Failed to fetch locations: ${response.statusText}`);
      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) throw new Error('Invalid data format received');
      setLocations(data.data);
    } catch (err) {
      setError(err.message || 'Error fetching locations');
    } finally {
      setLoading(false);
    }
  };

  // Extract points for a single location
  const getPointsForLocation = (location) => {
    const points = [];
    if (location?.route?.length > 0) {
      points.push({ lat: location.route[0].from_lat_long[0], lng: location.route[0].from_lat_long[1] });
      location.route.forEach(segment => {
        points.push({ lat: segment.to_lat_long[0], lng: segment.to_lat_long[1] });
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          OFC Route Map View (Google Maps)
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 2 }}>
          All locations' routes are shown together, each with a different color (optimized for walking, OFC cable planning)
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
              {locationRoutes.map((route, idx) => (
                <Box key={`legend-${idx}`} sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                  <Box sx={{ width: 18, height: 18, bgcolor: colorPalette[idx % colorPalette.length], borderRadius: '50%', mr: 1, border: '2px solid #fff' }} />
                  <Typography variant="body2">{route.location?.block} ({route.location?.district})</Typography>
                </Box>
              ))}
            </Stack>
            {/* Info cards for each location or summary */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {selectedLocation ? (
                <Grid item xs={12} md={6} lg={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: colorPalette[locationRoutes.indexOf(selectedLocation) % colorPalette.length] }}>
                        {selectedLocation.location?.block} ({selectedLocation.location?.district})
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
                            fillColor: colorPalette[idx % colorPalette.length],
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
                              strokeColor: colorPalette[idx % colorPalette.length],
                              strokeWeight: isSelected ? 10 : 6,
                              strokeOpacity: isSelected ? 1 : 0.9,
                            },
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </GoogleMap>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default MapViewPage;