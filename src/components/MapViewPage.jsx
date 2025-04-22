import React, { useState, useEffect, useRef } from 'react';
import { 
  Paper, 
  Typography, 
  CircularProgress, 
  Box, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Checkbox,
  ListItemText,
  OutlinedInput
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, LayersControl, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './MapViewPage.css';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import ClearIcon from '@mui/icons-material/Clear';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Define custom marker icons for different types
const locationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const surveyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const MapViewPage = () => {
  // Data state
  const [approvedLocations, setApprovedLocations] = useState([]);
  const [linkedSurveys, setLinkedSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // User data state
  const [supervisors, setSupervisors] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  
  // Filter state
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedSurveyors, setSelectedSurveyors] = useState([]);
  const [filterApplied, setFilterApplied] = useState(false);
  const [filteredSurveyors, setFilteredSurveyors] = useState([]);
  
  // UI state
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [center, setCenter] = useState([0, 0]);
  const mapRef = useRef(null);

  // Effect to fetch data on component mount
  useEffect(() => {
    fetchApprovedLocationsAndSurveys();
    fetchUserData();
  }, []);

  // Effect to filter data when filter options change
  useEffect(() => {
    if (filterApplied) {
      applyFilters();
    }
  }, [filterApplied]);
  
  // Effect to update filtered surveyors when supervisor is selected
  useEffect(() => {
    if (selectedSupervisor) {
      // Filter surveyors under the selected supervisor
      const filteredSurvs = surveyors.filter(surv => 
        surv.reportingTo === selectedSupervisor
      );
      setFilteredSurveyors(filteredSurvs);
      
      // Clear selected surveyors if none of them report to the selected supervisor
      if (selectedSurveyors.length > 0) {
        const validSurveyors = selectedSurveyors.filter(id => 
          filteredSurvs.some(s => s.id === id)
        );
        
        if (validSurveyors.length !== selectedSurveyors.length) {
          setSelectedSurveyors(validSurveyors);
        }
      }
    } else {
      // If no supervisor selected, all surveyors are available
      setFilteredSurveyors(surveyors);
    }
  }, [selectedSupervisor, surveyors, selectedSurveyors]);

  // Fetch locations and linked surveys
  const fetchApprovedLocationsAndSurveys = async () => {
    try {
      setLoading(true);
      
      // 1. First, fetch locations with status APPROVED
      const locationResponse = await fetch('https://location-service-mig8.onrender.com/api/locations?status=APPROVED');
      
      if (!locationResponse.ok) {
        throw new Error(`Failed to fetch approved locations: ${locationResponse.statusText}`);
      }

      const locationData = await locationResponse.json();
      
      if (!locationData.success || !Array.isArray(locationData.data)) {
        throw new Error('Invalid data format received from location API');
      }
      
      const approvedLocations = locationData.data;
      setApprovedLocations(approvedLocations);
      
      // Center the map on the first location with valid coordinates
      if (approvedLocations.length > 0) {
        const firstLocationWithCoords = approvedLocations.find(location => 
          location.centerPoint && location.centerPoint.coordinates
        );
        
        if (firstLocationWithCoords) {
          setCenter([
            firstLocationWithCoords.centerPoint.coordinates[1],
            firstLocationWithCoords.centerPoint.coordinates[0]
          ]);
        }
      }
      
      // 2. Now fetch surveys that reference these approved locations
      const linkedSurveysData = [];
      
      for (const location of approvedLocations) {
        try {
          // Query the survey API to find surveys with this locationId
          const surveyResponse = await fetch(`https://survey-service-nxvj.onrender.com/api/surveys?location=${location._id}`);
          
          if (surveyResponse.ok) {
            const surveyData = await surveyResponse.json();
            
            if (surveyData.success && Array.isArray(surveyData.data)) {
              // Add location data to each survey and add to our array
              const surveysWithLocation = surveyData.data.map(survey => ({
                ...survey,
                locationData: location // Include the full location data
              }));
              
              linkedSurveysData.push(...surveysWithLocation);
            }
          }
        } catch (surveyError) {
          console.error(`Error fetching surveys for location ${location._id}:`, surveyError);
        }
      }
      
      setLinkedSurveys(linkedSurveysData);
      setMapReady(true);
      
    } catch (err) {
      console.error('Error in fetch operations:', err);
      setError(err.message || 'An error occurred while fetching data');
      // Use mock data as fallback
      setMapReady(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user data for filters from Auth API
  const fetchUserData = async () => {
    try {
      setLoadingUsers(true);
      setUserError('');
      
      // Fetch all users from the Auth API
      const response = await fetch('https://auth-api-xz1q.onrender.com/api/auth/users');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      
      const userData = await response.json();
      
      if (!userData.success || !Array.isArray(userData.data)) {
        throw new Error('Invalid data format received from Auth API');
      }
      
      // Process and categorize users by role
      const allUsers = userData.data;
      
      // Filter and format supervisors (users with SUPERVISOR role)
      const supervisorUsers = allUsers
        .filter(user => user.role === 'SUPERVISOR')
        .map(user => ({
          id: user._id,
          name: user.username,
          email: user.email,
          role: user.role,
          reportingTo: user.reportingTo || null,
          displayName: `${user.username} (Supervisor)`
        }));
      
      // Filter and format surveyors
      const surveyorUsers = allUsers
        .filter(user => user.role === 'SURVEYOR')
        .map(user => ({
          id: user._id,
          name: user.username,
          email: user.email,
          role: user.role,
          reportingTo: user.reportingTo || null, // ID of the supervisor they report to
          displayName: `${user.username} (Surveyor)`
        }));
      
      setSupervisors(supervisorUsers);
      setSurveyors(surveyorUsers);
      setFilteredSurveyors(surveyorUsers);
      
    } catch (error) {
      console.error('Error fetching user data from Auth API:', error);
      setUserError(error.message || 'Failed to load user data');
      
      // Fallback: Set empty arrays to avoid breaking the UI
      setSupervisors([]);
      setSurveyors([]);
      setFilteredSurveyors([]);
      
    } finally {
      setLoadingUsers(false);
    }
  };

  // Apply selected filters
  const applyFilters = () => {
    setFilterApplied(true);
    
    // Log more detailed information for debugging
    console.log('Applying filters:', {
      supervisor: selectedSupervisor ? supervisors.find(s => s.id === selectedSupervisor)?.displayName : 'None',
      surveyors: selectedSurveyors.length > 0 
        ? `${selectedSurveyors.length} surveyors selected` 
        : 'None',
      selectedSurveyorIds: selectedSurveyors
    });
    
    // Clear console for easier debugging
    console.log('-------------  FILTER RESULTS  -------------');
    
    // Get and log the filtered results 
    const locations = getFilteredLocations();
    const surveys = getFilteredSurveys();
    
    console.log(`Results: ${locations.length} locations, ${surveys.length} surveys`);
    
    // Fit map to filtered data bounds
    setTimeout(() => {
      if (mapRef.current) {
        const map = mapRef.current;
        const bounds = L.latLngBounds();
        let hasValidPoints = false;
        
        // Add location points to bounds
        locations.forEach(location => {
          const centerCoordinates = getPointCoordinates(location.centerPoint);
          if (centerCoordinates) {
            bounds.extend(centerCoordinates);
            hasValidPoints = true;
          }
        });
        
        // Add survey points to bounds
        surveys.forEach(survey => {
          if (survey.terrainData && survey.terrainData.centerPoint) {
            const surveyCoordinates = getPointCoordinates(survey.terrainData.centerPoint);
            if (surveyCoordinates) {
              bounds.extend(surveyCoordinates);
              hasValidPoints = true;
            }
          }
        });
        
        if (hasValidPoints) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }, 100);
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedSupervisor('');
    setSelectedSurveyors([]);
    setFilteredSurveyors(surveyors);
    setFilterApplied(false);
    // Reset would re-fetch the original data
    fetchApprovedLocationsAndSurveys();
  };

  // Handle surveyor multi-select change
  const handleSurveyorChange = (event) => {
    const { value } = event.target;
    // Convert to array if we get a string
    const selectedValues = typeof value === 'string' ? value.split(',') : value;
    
    // Handle "Select All" option
    if (selectedValues.includes('all') && selectedValues.length > 1) {
      // If 'all' is among other values, we want to select all
      setSelectedSurveyors(filteredSurveyors.map(s => s.id));
      return;
    } else if (selectedValues.includes('all')) {
      // Just 'all' is selected - toggle between all and none
      const allSelected = filteredSurveyors.every(s => selectedSurveyors.includes(s.id));
      setSelectedSurveyors(allSelected ? [] : filteredSurveyors.map(s => s.id));
      return;
    }
    
    setSelectedSurveyors(selectedValues);
  };

  // Mock data for fallback or testing
  const mockLocations = [
    { 
      _id: 'loc1',
      title: 'Downtown Area',
      status: 'APPROVED',
      centerPoint: { 
        type: 'Point', 
        coordinates: [-0.09, 51.505] 
      },
      geofence: {
        type: 'Polygon',
        coordinates: [[
          [-0.095, 51.510],
          [-0.085, 51.510],
          [-0.085, 51.500],
          [-0.095, 51.500],
          [-0.095, 51.510]
        ]]
      },
      radius: 500,
      assignedTo: '60d5ecb8a2d3a001b14c8f11',
      createdBy: '60d5ecb8a2d3a001b14c8f12'
    },
    { 
      _id: 'loc2',
      title: 'Suburban District',
      status: 'APPROVED',
      centerPoint: { 
        type: 'Point', 
        coordinates: [-0.1, 51.51] 
      },
      geofence: {
        type: 'Polygon',
        coordinates: [[
          [-0.105, 51.515],
          [-0.095, 51.515],
          [-0.095, 51.505],
          [-0.105, 51.505],
          [-0.105, 51.515]
        ]]
      },
      radius: 300,
      assignedTo: '60d5ecb8a2d3a001b14c8f13',
      createdBy: '60d5ecb8a2d3a001b14c8f14'
    }
  ];
  
  const mockSurveys = [
    { 
      _id: 'surv1', 
      title: 'City Center Survey', 
      location: 'loc1',
      locationData: mockLocations[0],
      description: 'Urban assessment of downtown infrastructure',
      terrainData: {
        terrainType: 'URBAN',
        elevation: 20,
        centerPoint: {
          type: 'Point',
          coordinates: [-0.092, 51.507]
        },
        existingInfrastructure: ['POLES', 'DUCTS']
      },
      assignedTo: '60d5ecb8a2d3a001b14c8f15',
      assignedBy: '60d5ecb8a2d3a001b14c8f11',
      status: 3
    },
    { 
      _id: 'surv2', 
      title: 'Suburban Area Survey', 
      location: 'loc2',
      locationData: mockLocations[1],
      description: 'Residential district evaluation',
      terrainData: {
        terrainType: 'RURAL',
        elevation: 35,
        centerPoint: {
          type: 'Point',
          coordinates: [-0.098, 51.508]
        },
        existingInfrastructure: ['MANHOLES']
      },
      assignedTo: '60d5ecb8a2d3a001b14c8f16',
      assignedBy: '60d5ecb8a2d3a001b14c8f13',
      status: 4
    }
  ];

  // Filtered data for display - hierarchical filtering logic
  const getFilteredLocations = () => {
    if (!filterApplied) {
      return approvedLocations.length > 0 ? approvedLocations : mockLocations;
    }
    
    // Debug what's being filtered
    console.log("Filtering locations with:", {
      selectedSupervisor,
      selectedSurveyors,
      surveyorsCount: surveyors.length,
      locationsCount: approvedLocations.length,
      surveysCount: linkedSurveys.length
    });
    
    return (approvedLocations.length > 0 ? approvedLocations : mockLocations).filter(location => {
      // Case 1: If supervisor is selected
      if (selectedSupervisor) {
        // If location is directly assigned to the supervisor, include it
        if (location.assignedTo === selectedSupervisor) {
          return true;
        }
        
        // Otherwise, look for surveys in this location
        const locationSurveys = (linkedSurveys.length > 0 ? linkedSurveys : mockSurveys)
          .filter(survey => survey.location === location._id);
        
        if (locationSurveys.length === 0) {
          return false; // No surveys for this location
        }
          
        // If specific surveyors under this supervisor are selected
        if (selectedSurveyors.length > 0) {
          return locationSurveys.some(survey => 
            selectedSurveyors.includes(survey.assignedTo) &&
            surveyors.some(surv => 
              surv.id === survey.assignedTo && 
              surv.reportingTo === selectedSupervisor
            )
          );
        }
        
        // If only supervisor is selected (no specific surveyors), include locations 
        // with surveys assigned to any surveyor under this supervisor
        return locationSurveys.some(survey => 
          survey.assignedBy === selectedSupervisor ||
          surveyors.some(surv => 
            surv.id === survey.assignedTo && 
            surv.reportingTo === selectedSupervisor
          )
        );
      }
      
      // Case 2: Only specific surveyors are selected (no supervisor filter)
      if (selectedSurveyors.length > 0) {
        // Find if any of the selected surveyors have surveys in this location
        return (linkedSurveys.length > 0 ? linkedSurveys : mockSurveys).some(survey => 
          survey.location === location._id && selectedSurveyors.includes(survey.assignedTo)
        );
      }
      
      // Case 3: No filters applied
      return true;
    });
  };
  
  const getFilteredSurveys = () => {
    if (!filterApplied) {
      return linkedSurveys.length > 0 ? linkedSurveys : mockSurveys;
    }
    
    // Debug log for filtering
    console.log("Filtering surveys with:", {
      selectedSupervisor,
      selectedSurveyors,
      surveysTotal: (linkedSurveys.length > 0 ? linkedSurveys.length : mockSurveys.length)
    });
    
    return (linkedSurveys.length > 0 ? linkedSurveys : mockSurveys).filter(survey => {
      // Case 1: Supervisor is selected
      if (selectedSupervisor) {
        // Check if specific surveyors are selected
        if (selectedSurveyors.length > 0) {
          // Show only surveys by selected surveyors who report to this supervisor
          const isAssignedToSelectedSurveyor = selectedSurveyors.includes(survey.assignedTo);
          
          // Verify the surveyor reports to the selected supervisor
          const surveyorReportsToSupervisor = surveyors.some(surv => 
            surv.id === survey.assignedTo && surv.reportingTo === selectedSupervisor
          );
          
          return isAssignedToSelectedSurveyor && surveyorReportsToSupervisor;
        }
        
        // No specific surveyors selected, so show all surveys:
        // 1. Assigned by this supervisor directly
        if (survey.assignedBy === selectedSupervisor) {
          return true;
        }
        
        // 2. Assigned to any surveyor reporting to this supervisor
        return surveyors.some(surv => 
          surv.id === survey.assignedTo && surv.reportingTo === selectedSupervisor
        );
      }
      
      // Case 2: Only specific surveyors selected (no supervisor)
      if (selectedSurveyors.length > 0) {
        return selectedSurveyors.includes(survey.assignedTo);
      }
      
      // Case 3: No filters applied
      return true;
    });
  };

  const displayLocations = getFilteredLocations();
  const displaySurveys = getFilteredSurveys();

  // Helper function to get point coordinates from GeoJSON
  const getPointCoordinates = (pointObject) => {
    if (pointObject && pointObject.coordinates) {
      // GeoJSON format: [longitude, latitude]
      return [pointObject.coordinates[1], pointObject.coordinates[0]];
    }
    return null;
  };

  // Helper function to transform polygon coordinates for Leaflet
  const transformPolygonCoordinates = (polygonCoordinates) => {
    if (!polygonCoordinates || !polygonCoordinates[0] || !Array.isArray(polygonCoordinates[0])) {
      return null;
    }
    
    // Convert from GeoJSON format [[[lon, lat], [lon, lat]]] to Leaflet format [[lat, lon], [lat, lon]]
    return polygonCoordinates[0].map(point => [point[1], point[0]]);
  };

  // Find user name from ID
  const getUserNameById = (userId, role) => {
    if (!userId) return 'Unknown';
    
    const userList = role === 'SURVEYOR' ? surveyors : supervisors;
    const user = userList.find(u => u.id === userId);
    return user ? user.displayName : `${role} (${userId.slice(-4)})`;
  };

  // Toggle filter panel expanded state
  const toggleFilterPanel = () => {
    setFilterPanelExpanded(!filterPanelExpanded);
  };

  return (
    <div className="map-view-container">
      <Paper elevation={3} className="map-view-paper">
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MapIcon fontSize="large" color="primary" />
          Map View & Location Hierarchy
        </Typography>
        
        {/* Enhanced Filter Panel */}
        <Paper elevation={1} className="filter-panel">
          <div className="filter-panel-header">
            <div className="filter-title">
              <FilterAltIcon color="primary" />
              <Typography variant="h6">Hierarchical Filters</Typography>
            </div>
            <IconButton onClick={toggleFilterPanel} size="small">
              {filterPanelExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </div>
          
          {userError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {userError} - Filter options may be limited.
            </Alert>
          )}

          {filterPanelExpanded && (
            <div className="filter-hierarchy">
              {/* Supervisor Level */}
              <div className="filter-level">
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={1}>
                    <Badge 
                      badgeContent={supervisors.length} 
                      color="primary" 
                      max={99} 
                      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                    >
                      <SupervisorAccountIcon color="primary" fontSize="large" />
                    </Badge>
                  </Grid>
                  <Grid item xs={8} md={9}>
                    <FormControl fullWidth size="small" disabled={loadingUsers}>
                      <InputLabel id="supervisor-label">Select Supervisor</InputLabel>
                      <Select
                        labelId="supervisor-label"
                        id="supervisor-select"
                        value={selectedSupervisor}
                        label="Select Supervisor"
                        onChange={(e) => setSelectedSupervisor(e.target.value)}
                        startAdornment={loadingUsers && <CircularProgress size={20} sx={{ mr: 1 }} />}
                      >
                        <MenuItem value="">
                          <em>All Supervisors</em>
                        </MenuItem>
                        {supervisors.map(supervisor => (
                          <MenuItem key={supervisor.id} value={supervisor.id}>
                            {supervisor.displayName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3} md={2} sx={{ textAlign: 'right' }}>
                    {selectedSupervisor && (
                      <Tooltip title="Clear Supervisor Selection">
                        <IconButton 
                          size="small" 
                          onClick={() => setSelectedSupervisor('')}
                          color="default"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Grid>
                </Grid>
              </div>
              
              {/* Connector */}
              <div className="hierarchy-connector"></div>
              
              {/* Surveyor Level - With Multiselect */}
              <div className="filter-level">
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={1}>
                    <Badge 
                      badgeContent={filteredSurveyors.length} 
                      color="primary" 
                      max={99} 
                      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                    >
                      <PersonIcon color={selectedSupervisor ? "primary" : "action"} fontSize="large" />
                    </Badge>
                  </Grid>
                  <Grid item xs={8} md={9}>
                    <FormControl 
                      fullWidth 
                      size="small" 
                      disabled={loadingUsers}
                    >
                      <InputLabel id="surveyor-label">Select Surveyors</InputLabel>
                      <Select
                        labelId="surveyor-label"
                        id="surveyor-select"
                        multiple
                        value={selectedSurveyors}
                        onChange={handleSurveyorChange}
                        input={<OutlinedInput label="Select Surveyors" />}
                        renderValue={(selected) => {
                          if (selected.length === 0) {
                            return <em>No surveyors selected</em>;
                          }
                          
                          if (selected.length === filteredSurveyors.length && filteredSurveyors.length > 0) {
                            return <em>All surveyors selected</em>;
                          }
                          
                          return (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => {
                                const surveyor = surveyors.find(s => s.id === value);
                                return (
                                  <Chip 
                                    key={value} 
                                    label={surveyor ? surveyor.name : value} 
                                    size="small"
                                  />
                                );
                              })}
                            </Box>
                          );
                        }}
                        MenuProps={MenuProps}
                        startAdornment={loadingUsers && <CircularProgress size={20} sx={{ mr: 1 }} />}
                      >
                        {/* Select All Option */}
                        <MenuItem value="all" sx={{ fontWeight: 'bold' }}>
                          <Checkbox 
                            checked={filteredSurveyors.length > 0 && 
                                    selectedSurveyors.length === filteredSurveyors.length}
                            indeterminate={selectedSurveyors.length > 0 && 
                                           selectedSurveyors.length < filteredSurveyors.length}
                          />
                          <ListItemText primary="Select All Surveyors" />
                        </MenuItem>
                        
                        {filteredSurveyors.length > 0 && <Divider />}
                        
                        {filteredSurveyors.map(surveyor => (
                          <MenuItem key={surveyor.id} value={surveyor.id}>
                            <Checkbox checked={selectedSurveyors.indexOf(surveyor.id) > -1} />
                            <ListItemText primary={surveyor.displayName} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3} md={2} sx={{ textAlign: 'right' }}>
                    {selectedSurveyors.length > 0 && (
                      <Tooltip title="Clear Surveyor Selection">
                        <IconButton 
                          size="small" 
                          onClick={() => setSelectedSurveyors([])}
                          color="default"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Grid>
                </Grid>
              </div>
              
              {/* Action Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={applyFilters}
                  disabled={(!selectedSupervisor && selectedSurveyors.length === 0) || loadingUsers}
                  startIcon={<SearchIcon />}
                >
                  Apply Filters
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={resetFilters}
                  disabled={!filterApplied || loadingUsers}
                  startIcon={<RefreshIcon />}
                >
                  Reset All
                </Button>
              </Box>
              
              {/* Active Filters Display */}
              {filterApplied && (
                <div className="active-filters">
                  <Typography variant="subtitle2" sx={{ mr: 2 }}>
                    Active Filters:
                  </Typography>
                  {selectedSupervisor && (
                    <div className="filter-badge">
                      <SupervisorAccountIcon fontSize="small" />
                      <span>{supervisors.find(s => s.id === selectedSupervisor)?.displayName || 'Supervisor'}</span>
                      <IconButton size="small" onClick={() => setSelectedSupervisor('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </div>
                  )}
                  {selectedSurveyors.length > 0 && (
                    <div className="filter-badge">
                      <PersonIcon fontSize="small" />
                      <span>
                        {selectedSurveyors.length === filteredSurveyors.length && filteredSurveyors.length > 0
                          ? 'All Surveyors'
                          : `${selectedSurveyors.length} Surveyor${selectedSurveyors.length > 1 ? 's' : ''}`
                        }
                        {selectedSupervisor && ' (under selected Supervisor)'}
                      </span>
                      <IconButton size="small" onClick={() => setSelectedSurveyors([])}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </div>
                  )}
                  
                  {/* Display count of filtered items */}
                  <Box sx={{ mt: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Filtering {displayLocations.length} location{displayLocations.length !== 1 ? 's' : ''} and {displaySurveys.length} survey{displaySurveys.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </div>
              )}
            </div>
          )}
        </Paper>
        
        {loading ? (
          <div className="loading-container">
            <CircularProgress />
            <Typography>Loading location and survey data...</Typography>
          </div>
        ) : error ? (
          <div className="error-container">
            <Alert severity="error">{error}</Alert>
            {(displayLocations === mockLocations || displaySurveys === mockSurveys) && (
              <Box mt={2}>
                <Alert severity="info">Showing mock data as fallback</Alert>
              </Box>
            )}
          </div>
        ) : (
          <>
            {displayLocations.length === 0 ? (
              <Alert severity="info">No approved locations found with the selected filters</Alert>
            ) : (
              <>
                <div className="map-stats">
                  <div>
                    <Typography variant="subtitle1">
                      Displaying <span className="filter-count">{displayLocations.length}</span> locations and <span className="filter-count">{displaySurveys.length}</span> surveys
                    </Typography>
                  </div>
                  {filterApplied && (
                    <Chip 
                      label="Filtered View" 
                      color="primary" 
                      variant="outlined" 
                      size="small"
                      icon={<FilterAltIcon />}
                    />
                  )}
                </div>
                
                {mapReady && (
                  <Box className="map-container" position="relative">
                    <MapContainer 
                      center={center} 
                      zoom={11} 
                      style={{ height: "100%", width: "100%" }}
                      whenCreated={mapInstance => {
                        mapRef.current = mapInstance;
                      }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <LayersControl position="topright">
                        <LayersControl.Overlay checked name="Approved Locations">
                          <LayerGroup>
                            {/* Display Approved Locations with Geofence Polygons */}
                            {displayLocations.map((location) => {
                              const centerCoordinates = getPointCoordinates(location.centerPoint);
                              if (!centerCoordinates) return null;
                              
                              // Get polygon coordinates for geofence
                              const polygonCoordinates = location.geofence ? 
                                transformPolygonCoordinates(location.geofence.coordinates) : null;
                              
                              return (
                                <React.Fragment key={`loc-${location._id}`}>
                                  {/* Location Center Point Marker */}
                                  <Marker 
                                    position={centerCoordinates}
                                    icon={locationIcon}
                                  >
                                    <Popup>
                                      <div>
                                        <h3>{location.title || 'Approved Location'}</h3>
                                        <p><strong>Status:</strong> {location.status}</p>
                                        <p><strong>ID:</strong> {location._id}</p>
                                        {location.assignedTo && (
                                          <p><strong>Assigned To:</strong> {getUserNameById(location.assignedTo, 'SUPERVISOR')}</p>
                                        )}
                                        {location.comments && (
                                          <p><strong>Comments:</strong> {location.comments}</p>
                                        )}
                                      </div>
                                    </Popup>
                                  </Marker>
                                  
                                  {/* Geofence Polygon */}
                                  {polygonCoordinates && (
                                    <Polygon 
                                      positions={polygonCoordinates}
                                      pathOptions={{ 
                                        fillColor: 'green', 
                                        color: 'green', 
                                        fillOpacity: 0.2,
                                        weight: 2
                                      }}
                                    />
                                  )}
                                  
                                  {/* Fallback Circle if no polygon available */}
                                  {!polygonCoordinates && location.radius && (
                                    <Circle 
                                      center={centerCoordinates}
                                      radius={location.radius}
                                      pathOptions={{ 
                                        fillColor: 'green', 
                                        color: 'green', 
                                        fillOpacity: 0.2,
                                        dashArray: '5, 5',
                                        weight: 2
                                      }}
                                    />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </LayerGroup>
                        </LayersControl.Overlay>

                        <LayersControl.Overlay checked name="Survey Points">
                          <LayerGroup>
                            {/* Display Survey Points */}
                            {displaySurveys.map((survey) => {
                              // Use terrainData.centerPoint for survey coordinates
                              if (!survey.terrainData || !survey.terrainData.centerPoint) return null;
                              
                              const surveyCoordinates = getPointCoordinates(survey.terrainData.centerPoint);
                              if (!surveyCoordinates) return null;
                              
                              return (
                                <Marker 
                                  key={`survey-${survey._id}`}
                                  position={surveyCoordinates}
                                  icon={surveyIcon}
                                >
                                  <Popup>
                                    <div>
                                      <h3>{survey.title}</h3>
                                      <p><strong>Location ID:</strong> {survey.location}</p>
                                      {survey.assignedTo && (
                                        <p><strong>Surveyor:</strong> {getUserNameById(survey.assignedTo, 'SURVEYOR')}</p>
                                      )}
                                      {survey.status && (
                                        <p><strong>Status:</strong> {survey.status}</p>
                                      )}
                                      {survey.terrainData && survey.terrainData.terrainType && (
                                        <p><strong>Terrain:</strong> {survey.terrainData.terrainType}</p>
                                      )}
                                    </div>
                                  </Popup>
                                </Marker>
                              );
                            })}
                          </LayerGroup>
                        </LayersControl.Overlay>
                      </LayersControl>
                      
                      {/* Map Legend */}
                      <div className="map-legend">
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Legend</Typography>
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: 'green' }}></div>
                          <span>Approved Locations</span>
                        </div>
                        <div className="legend-item">
                          <div className="legend-color" style={{ backgroundColor: 'blue' }}></div>
                          <span>Survey Points</span>
                        </div>
                      </div>
                    </MapContainer>
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </Paper>
    </div>
  );
};

export default MapViewPage; 