import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Paper,
  Alert,
  Breadcrumbs,
  Link,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Badge,
  Tooltip,
  CardMedia,
  Collapse
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  Public as PublicIcon,
  Terrain as TerrainIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  GpsFixed as GPSIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Image as ImageIcon,
  OndemandVideo as VideoIcon,
  InsertDriveFile as FileIcon,
  Description as DescriptionIcon,
  Numbers as NumbersIcon,
  List as ListIcon,
  Folder as FolderIcon,
  OpenInNew as OpenInNewIcon,
  GetApp as DownloadIcon,
  PhoneAndroid as PhoneAndroidIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import surveyService from '../services/surveyService';
import './LocationDetailsPage.css';

const LocationDetailsPage = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [location, setLocation] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [filteredSurveys, setFilteredSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSurveys, setExpandedSurveys] = useState({});
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasMediaFilter, setHasMediaFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  useEffect(() => {
    fetchLocationData();
  }, [locationId]);

  useEffect(() => {
    applyFilters();
  }, [surveys, searchTerm, typeFilter, statusFilter, hasMediaFilter, dateFilter]);

  const fetchLocationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await surveyService.getSurveysByLocation(locationId);
      
      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error('No surveys found for this location');
      }

      const locationSurveys = response.data;
      setSurveys(locationSurveys);

      // Extract location information from first survey
      const firstSurvey = locationSurveys[0];
      let locationInfo = {
        id: locationId,
        stateName: firstSurvey.stateName || 'Unknown State',
        stateCode: firstSurvey.stateCode || '',
        districtName: firstSurvey.districtName || 'Unknown District', 
        districtCode: firstSurvey.districtCode || '',
        blockName: firstSurvey.blockName || '',
        blockCode: firstSurvey.blockCode || ''
      };

      if (firstSurvey.locationId && typeof firstSurvey.locationId === 'object') {
        locationInfo = { ...locationInfo, ...firstSurvey.locationId };
      }

      setLocation(locationInfo);

    } catch (err) {
      console.error('Error fetching location data:', err);
      setError(err.message || 'Failed to fetch location data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...surveys];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(survey =>
        (survey.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (survey.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (survey.fields || []).some(field => 
          (field.key || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (field.value || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(survey => survey.surveyType === typeFilter);
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(survey => survey.status === parseInt(statusFilter));
    }

    // Has media filter
    if (hasMediaFilter) {
      filtered = filtered.filter(survey => {
        const hasMedia = (survey.mediaFiles && survey.mediaFiles.length > 0) ||
                         (survey.fields || []).some(field => field.mediaFiles && field.mediaFiles.length > 0);
        return hasMediaFilter === 'yes' ? hasMedia : !hasMedia;
      });
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      let filterDate;
      switch (dateFilter) {
        case 'today':
          filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          filterDate = null;
      }
      if (filterDate) {
        filtered = filtered.filter(survey => 
          new Date(survey.createdOn || survey.created_on) >= filterDate
        );
      }
    }

    setFilteredSurveys(filtered);
    setPage(0);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setHasMediaFilter('');
    setDateFilter('');
  };

  const toggleSurveyExpansion = (surveyId) => {
    setExpandedSurveys(prev => ({
      ...prev,
      [surveyId]: !prev[surveyId]
    }));
  };

  const getSurveyTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'block': return 'primary';
      case 'gp': return 'secondary';
      case 'ofc': return 'success';
      default: return 'default';
    }
  };

  const getSurveyStatusLabel = (status) => {
    switch (status) {
      case 1: return 'Released';
      case 2: return 'Assigned';
      case 3: return 'Active';
      case 4: return 'Submitted';
      case 5: return 'Accepted';
      case 6: return 'Reverted';
      default: return 'Unknown';
    }
  };

  const getSurveyStatusColor = (status) => {
    switch (status) {
      case 1: return 'success';
      case 2: return 'warning';
      case 3: return 'info';
      case 4: return 'primary';
      case 5: return 'secondary';
      default: return 'default';
    }
  };

  const getFieldTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'text': return <DescriptionIcon fontSize="small" />;
      case 'number': return <NumbersIcon fontSize="small" />;
      case 'dropdown': return <ListIcon fontSize="small" />;
      case 'media': return <PhotoLibraryIcon fontSize="small" />;
      default: return <FolderIcon fontSize="small" />;
    }
  };

  const getMediaIcon = (fileType) => {
    const type = fileType?.toLowerCase();
    if (type === 'image' || type === 'jpg' || type === 'jpeg' || type === 'png' || type === 'gif' || type === 'bmp') {
      return <ImageIcon color="primary" />;
    }
    if (type === 'video' || type === 'mp4' || type === 'avi' || type === 'mov' || type === 'wmv' || type === 'flv' || type === 'webm') {
      return <VideoIcon color="secondary" />;
    }
    return <FileIcon color="action" />;
  };

  const formatCoordinate = (coordinate) => {
    if (coordinate === null || coordinate === undefined || coordinate === '') return 'N/A';
    const num = typeof coordinate === 'string' ? parseFloat(coordinate) : coordinate;
    return isNaN(num) ? 'N/A' : num.toFixed(6);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUniqueValues = (key) => {
    const values = surveys.map(survey => survey[key]).filter(Boolean);
    return [...new Set(values)];
  };

  const getLocationStats = () => {
    return {
      totalSurveys: surveys.length,
      completedSurveys: surveys.filter(s => s.status === 5).length,
      totalFields: surveys.reduce((acc, s) => acc + (s.fields?.length || 0), 0),
      totalMedia: surveys.reduce((acc, s) => 
        acc + (s.mediaFiles?.length || 0) + 
        (s.fields?.reduce((facc, f) => facc + (f.mediaFiles?.length || 0), 0) || 0), 0
      )
    };
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>Loading location details...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} variant="contained">
          Go Back
        </Button>
      </Container>
    );
  }

  const stats = getLocationStats();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 2 }}>
        <Breadcrumbs sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { color: 'white' } }}>
          <Link underline="hover" color="inherit" onClick={() => navigate('/map')} sx={{ cursor: 'pointer' }}>
            Map View
          </Link>
          <Typography color="inherit">Location Details</Typography>
        </Breadcrumbs>
        
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handleBack} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                📍 {location?.districtName}, {location?.stateName}
              </Typography>
              {location?.blockName && (
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Block: {location.blockName}
                </Typography>
              )}
            </Box>
          </Box>
          
          <Box display="flex" gap={2}>
            <Paper sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <Typography variant="caption" color="white" display="block">Total Surveys</Typography>
              <Typography variant="h6" color="white" fontWeight="bold">{stats.totalSurveys}</Typography>
            </Paper>
            <Paper sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <Typography variant="caption" color="white" display="block">Total Fields</Typography>
              <Typography variant="h6" color="white" fontWeight="bold">{stats.totalFields}</Typography>
            </Paper>
            <Paper sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <Typography variant="caption" color="white" display="block">Media Files</Typography>
              <Typography variant="h6" color="white" fontWeight="bold">{stats.totalMedia}</Typography>
            </Paper>
          </Box>
        </Box>
      </Paper>

      {/* Main Content Card */}
      <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* Location Info Header */}
        <CardContent sx={{ background: 'linear-gradient(45deg, #f8f9fa 0%, #e9ecef 100%)', borderBottom: '1px solid #dee2e6' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <LocationOnIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    {location?.districtName}, {location?.stateName}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1}>
                    <Chip 
                      icon={<PublicIcon />} 
                      label={location?.stateName} 
                      size="small" 
                      variant="outlined" 
                      color="primary"
                    />
                    <Chip 
                      icon={<TerrainIcon />} 
                      label={location?.districtName} 
                      size="small" 
                      variant="outlined" 
                      color="secondary"
                    />
                    {location?.blockName && (
                      <Chip 
                        icon={<BusinessIcon />} 
                        label={location?.blockName} 
                        size="small" 
                        variant="outlined" 
                        color="success"
                      />
                    )}
                  </Stack>
                </Box>
              </Box>
            </Grid>
            
            <Grid xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid xs={6} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                    <Typography variant="h5" color="primary.main" fontWeight="bold">{stats.totalSurveys}</Typography>
                    <Typography variant="caption">Surveys</Typography>
                  </Paper>
                </Grid>
                <Grid xs={6} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                    <Typography variant="h5" color="success.main" fontWeight="bold">{stats.completedSurveys}</Typography>
                    <Typography variant="caption">Completed</Typography>
                  </Paper>
                </Grid>
                <Grid xs={6} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                    <Typography variant="h5" color="warning.main" fontWeight="bold">{stats.totalFields}</Typography>
                    <Typography variant="caption">Fields</Typography>
                  </Paper>
                </Grid>
                <Grid xs={6} sm={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                    <Typography variant="h5" color="info.main" fontWeight="bold">{stats.totalMedia}</Typography>
                    <Typography variant="caption">Media</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>

        {/* Dynamic Filters */}
        <CardContent sx={{ bgcolor: 'grey.50', borderBottom: '1px solid #dee2e6' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon color="primary" />
              Survey Filters
            </Typography>
            <Button startIcon={<ClearIcon />} onClick={clearFilters} variant="outlined" size="small">
              Clear All
            </Button>
          </Box>

          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              placeholder="Search surveys, fields, values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              size="small"
              sx={{ width: 280 }}
            />
            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel>Survey Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Survey Type"
              >
                <MenuItem value="">All Types</MenuItem>
                {getUniqueValues('surveyType').map(type => (
                  <MenuItem key={type} value={type}>{type?.toUpperCase()}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                {getUniqueValues('status').map(status => (
                  <MenuItem key={status} value={status}>{getSurveyStatusLabel(status)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: 120 }}>
              <InputLabel>Has Media</InputLabel>
              <Select
                value={hasMediaFilter}
                onChange={(e) => setHasMediaFilter(e.target.value)}
                label="Has Media"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="yes">With Media</MenuItem>
                <MenuItem value="no">Without Media</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: 130 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                label="Date Range"
              >
                <MenuItem value="">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
            </FormControl>
            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchLocationData}
              variant="outlined"
              size="small"
              sx={{ width: 100 }}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>

        {/* Survey Results */}
        <CardContent>
          {filteredSurveys.length === 0 ? (
            <Alert severity="info" sx={{ my: 3 }}>
              {searchTerm || typeFilter || statusFilter || hasMediaFilter || dateFilter ? 
                'No surveys match your current filters. Try adjusting your search criteria.' : 
                'No surveys found for this location.'
              }
            </Alert>
          ) : (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" color="primary">
                  📋 Showing {filteredSurveys.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length} of {filteredSurveys.length} surveys
                </Typography>
                {filteredSurveys.length !== surveys.length && (
                  <Chip 
                    label={`Filtered from ${surveys.length} total`} 
                    color="primary" 
                    variant="outlined" 
                    size="small"
                  />
                )}
              </Box>
              
              <Stack spacing={2}>
                {filteredSurveys
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((survey) => (
                    <Accordion 
                      key={survey._id}
                      expanded={expandedSurveys[survey._id] || false}
                      onChange={() => toggleSurveyExpansion(survey._id)}
                      sx={{ 
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        '&:before': { display: 'none' },
                        boxShadow: expandedSurveys[survey._id] ? 3 : 1
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ 
                          bgcolor: expandedSurveys[survey._id] ? 'primary.50' : 'grey.50',
                          '&:hover': { bgcolor: 'primary.100' },
                          borderRadius: 2
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: getSurveyTypeColor(survey.surveyType) === 'primary' ? 'primary.main' : 'secondary.main' }}>
                              <AssignmentIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {survey.name || survey.title || `Survey ${surveys.indexOf(survey) + 1}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {survey.description?.substring(0, 100)}{survey.description?.length > 100 ? '...' : ''}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
                            <Chip
                              label={survey.surveyType?.toUpperCase() || 'UNKNOWN'}
                              color={getSurveyTypeColor(survey.surveyType)}
                              size="small"
                            />
                            <Chip
                              label={getSurveyStatusLabel(survey.status)}
                              color={getSurveyStatusColor(survey.status)}
                              size="small"
                            />
                            <Chip
                              icon={<PhotoLibraryIcon />}
                              label={`${(survey.mediaFiles?.length || 0) + (survey.fields?.reduce((acc, f) => acc + (f.mediaFiles?.length || 0), 0) || 0)} Media`}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails sx={{ bgcolor: 'white' }}>
                        <Grid container spacing={3}>
                          {/* Survey Info */}
                          <Grid xs={12} md={4}>
                            <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                                📋 Survey Information
                              </Typography>
                              <List dense>
                                <ListItem sx={{ px: 0 }}>
                                  <ListItemIcon><CalendarTodayIcon fontSize="small" /></ListItemIcon>
                                  <ListItemText 
                                    primary="Created" 
                                    secondary={formatDate(survey.createdOn || survey.created_on)} 
                                  />
                                </ListItem>
                                {survey.contactPerson && (
                                  <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText 
                                      primary="Contact" 
                                      secondary={survey.contactPerson.sdeName || 'N/A'} 
                                    />
                                  </ListItem>
                                )}
                                {survey.latitude && survey.longitude && (
                                  <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon><GPSIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText 
                                      primary="Coordinates" 
                                      secondary={`${formatCoordinate(survey.latitude)}, ${formatCoordinate(survey.longitude)}`} 
                                    />
                                  </ListItem>
                                )}
                              </List>
                            </Paper>
                          </Grid>

                          {/* Survey Fields */}
                          <Grid xs={12} md={8}>
                            <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                              🔧 Survey Fields ({survey.fields?.length || 0})
                            </Typography>
                            
                            {survey.fields && survey.fields.length > 0 ? (
                              <Stack spacing={2}>
                                {survey.fields.map((field, fieldIndex) => (
                                  <Paper key={fieldIndex} elevation={1} sx={{ p: 2, border: '1px solid #e0e0e0' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        {getFieldTypeIcon(field.fieldType)}
                                        <Typography variant="subtitle2" fontWeight="bold">
                                          {field.key}
                                        </Typography>
                                      </Box>
                                      <Stack direction="row" spacing={1}>
                                        <Chip 
                                          label={`#${field.sequence || fieldIndex + 1}`} 
                                          size="small" 
                                          variant="outlined"
                                        />
                                        {field.fieldType && (
                                          <Chip 
                                            label={field.fieldType} 
                                            size="small" 
                                            color="info"
                                            variant="outlined"
                                          />
                                        )}
                                      </Stack>
                                    </Box>
                                    
                                    <Typography variant="body2" sx={{ mb: 2, bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                                      <strong>Value:</strong> {field.value || 'No value provided'}
                                    </Typography>
                                    
                                    {field.dropdownOptions && field.dropdownOptions.length > 0 && (
                                      <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                          Dropdown Options:
                                        </Typography>
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                          {field.dropdownOptions.map((option, optIndex) => (
                                            <Chip 
                                              key={optIndex} 
                                              label={option} 
                                              size="small" 
                                              variant={option === field.value ? "filled" : "outlined"}
                                              color={option === field.value ? "primary" : "default"}
                                            />
                                          ))}
                                        </Stack>
                                      </Box>
                                    )}
                                    
                                    {field.mediaFiles && field.mediaFiles.length > 0 && (
                                      <Box>
                                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                          📎 Field Media ({field.mediaFiles.length}):
                                        </Typography>
                                        <Grid container spacing={1} sx={{ mt: 1 }}>
                                          {field.mediaFiles.map((media, mediaIndex) => (
                                            <Grid xs={6} sm={4} md={3} key={mediaIndex}>
                                              <Paper 
                                                elevation={2}
                                                sx={{ 
                                                  p: 1,
                                                  textAlign: 'center',
                                                  cursor: 'pointer',
                                                  transition: 'all 0.2s ease',
                                                  '&:hover': { 
                                                    boxShadow: 4,
                                                    transform: 'translateY(-2px)'
                                                  }
                                                }}
                                                onClick={() => {
                                                  setSelectedMedia(media);
                                                  setMediaDialogOpen(true);
                                                }}
                                              >
                                                {media.url && (media.fileType === 'IMAGE' || media.fileType === 'image') ? (
                                                  <CardMedia
                                                    component="img"
                                                    height="60"
                                                    image={media.url}
                                                    alt={media.description || 'Field media'}
                                                    sx={{ 
                                                      objectFit: 'cover', 
                                                      borderRadius: 1, 
                                                      mb: 1 
                                                    }}
                                                  />
                                                ) : media.url && (media.fileType === 'VIDEO' || media.fileType === 'video' || 
                                                        media.fileType === 'mp4' || media.fileType === 'avi' || media.fileType === 'mov') ? (
                                                  <Box position="relative">
                                                    <video
                                                      width="100%"
                                                      height="120"
                                                      style={{ 
                                                        objectFit: 'cover', 
                                                        borderRadius: 4,
                                                        marginBottom: 8
                                                      }}
                                                      muted
                                                      preload="metadata"
                                                    >
                                                      <source src={`${media.url}#t=1`} type={`video/${media.fileType?.toLowerCase()}`} />
                                                    </video>
                                                    <Box 
                                                      position="absolute" 
                                                      top="50%" 
                                                      left="50%" 
                                                      sx={{ 
                                                        transform: 'translate(-50%, -50%)',
                                                        bgcolor: 'rgba(0,0,0,0.6)',
                                                        borderRadius: '50%',
                                                        p: 1
                                                      }}
                                                    >
                                                      <VideoIcon sx={{ color: 'white', fontSize: 20 }} />
                                                    </Box>
                                                    {(media.latitude && media.longitude) && (
                                                      <Chip
                                                        icon={<GPSIcon />}
                                                        label="GPS"
                                                        size="small"
                                                        color="success"
                                                        sx={{
                                                          position: 'absolute',
                                                          top: 4,
                                                          right: 4,
                                                          height: 20,
                                                          fontSize: '0.7rem'
                                                        }}
                                                      />
                                                    )}
                                                  </Box>
                                                ) : (
                                                  <Box 
                                                    sx={{ 
                                                      height: 60, 
                                                      display: 'flex', 
                                                      alignItems: 'center', 
                                                      justifyContent: 'center',
                                                      bgcolor: 'grey.100',
                                                      borderRadius: 1,
                                                      mb: 1
                                                    }}
                                                  >
                                                    {getMediaIcon(media.fileType)}
                                                  </Box>
                                                )}
                                                <Typography variant="caption" display="block" fontWeight="bold">
                                                  {media.fileType || 'File'}
                                                </Typography>
                                                {media.description && (
                                                  <Typography variant="caption" color="text.secondary" display="block">
                                                    {media.description.length > 20 ? 
                                                      `${media.description.substring(0, 20)}...` : 
                                                      media.description
                                                    }
                                                  </Typography>
                                                )}
                                                {media.url && (
                                                  <Tooltip title="Click to view details">
                                                    <IconButton size="small" sx={{ mt: 0.5 }}>
                                                      <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                )}
                                              </Paper>
                                            </Grid>
                                          ))}
                                        </Grid>
                                      </Box>
                                    )}
                                  </Paper>
                                ))}
                              </Stack>
                            ) : (
                              <Alert severity="info">No fields found for this survey.</Alert>
                            )}
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
              </Stack>

              {/* Pagination */}
              <Box display="flex" justifyContent="center" mt={3}>
                <TablePagination
                  component="div"
                  count={filteredSurveys.length}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[3, 6, 12, 24]}
                  labelRowsPerPage="Surveys per page:"
                  sx={{
                    '& .MuiTablePagination-toolbar': {
                      bgcolor: 'grey.50',
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Media Dialog */}
      <Dialog open={mediaDialogOpen} onClose={() => setMediaDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">📷 Media Details & Geotagged Information</Typography>
          <IconButton onClick={() => setMediaDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedMedia && (
            <Grid container spacing={3}>
              {/* Media Preview */}
              <Grid xs={12} md={8}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  {selectedMedia.url && (selectedMedia.fileType === 'IMAGE' || selectedMedia.fileType === 'image') ? (
                    <CardMedia
                      component="img"
                      image={selectedMedia.url}
                      alt={selectedMedia.description || 'Media'}
                      sx={{ 
                        width: '100%',
                        maxHeight: 500,
                        objectFit: 'contain',
                        borderRadius: 2,
                        mb: 2
                      }}
                    />
                  ) : selectedMedia.url && (selectedMedia.fileType === 'VIDEO' || selectedMedia.fileType === 'video' || 
                          selectedMedia.fileType === 'mp4' || selectedMedia.fileType === 'avi' || selectedMedia.fileType === 'mov') ? (
                    <Box sx={{ mb: 2 }}>
                      <Box position="relative" sx={{ mb: 2 }}>
                        <video
                          controls
                          style={{
                            width: '100%',
                            height: '400px',
                            borderRadius: 8,
                            backgroundColor: '#f5f5f5'
                          }}
                        >
                          <source src={selectedMedia.url} type={`video/${selectedMedia.fileType?.toLowerCase()}`} />
                          Your browser does not support the video tag.
                        </video>
                        {/* GPS Overlay on Video */}
                        {(selectedMedia.latitude && selectedMedia.longitude) && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              bgcolor: 'rgba(0,0,0,0.8)',
                              borderRadius: 2,
                              px: 2,
                              py: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <GPSIcon sx={{ color: '#4caf50', fontSize: 18 }} />
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {formatCoordinate(selectedMedia.latitude)}, {formatCoordinate(selectedMedia.longitude)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      
                      {/* Video Description */}
                      <Typography variant="body1" sx={{ mb: 1, color: 'text.primary' }}>
                        {selectedMedia.description || `video captured on ${formatDate(selectedMedia.timestamp || selectedMedia.createdOn || selectedMedia.created_on)}`}
                      </Typography>
                      
                      {/* File Type Info */}
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {selectedMedia.fileType?.toUpperCase() || 'VIDEO'} • {selectedMedia.deviceInfo || 'N/A'}
                      </Typography>
                      
                      {/* Action Buttons */}
                      <Stack direction="row" spacing={2}>
                        {selectedMedia.url && (
                          <Button
                            startIcon={<OpenInNewIcon />}
                            onClick={() => window.open(selectedMedia.url, '_blank')}
                            variant="outlined"
                            sx={{ px: 3 }}
                          >
                            Open
                          </Button>
                        )}
                        {(selectedMedia.latitude && selectedMedia.longitude) && (
                          <Button
                            startIcon={<LocationOnIcon />}
                            variant="contained"
                            color="success"
                            onClick={() => {
                              const lat = selectedMedia.latitude;
                              const lng = selectedMedia.longitude;
                              if (lat && lng) {
                                window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                              }
                            }}
                            sx={{ px: 3 }}
                          >
                            Maps
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  ) : (
                    <Box>
                      <Box 
                        sx={{ 
                          height: 300, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: 'grey.100',
                          borderRadius: 2,
                          mb: 2
                        }}
                      >
                        {getMediaIcon(selectedMedia.fileType)}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          {selectedMedia.fileType || 'File'}
                        </Typography>
                      </Box>
                      
                      {/* File info and actions */}
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {selectedMedia.description || 'No description'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {selectedMedia.fileType} • {formatDate(selectedMedia.createdOn || selectedMedia.created_on)}
                      </Typography>
                      
                      <Stack direction="row" spacing={2}>
                        {selectedMedia.url && (
                          <Button
                            startIcon={<OpenInNewIcon />}
                            onClick={() => window.open(selectedMedia.url, '_blank')}
                            variant="outlined"
                          >
                            Open
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Compact Side Panel */}
              <Grid xs={12} md={4}>
                <Stack spacing={2}>
                  {/* GPS Location Card */}
                  {(selectedMedia.latitude && selectedMedia.longitude) && (
                    <Paper 
                      elevation={1} 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'white',
                        border: '2px solid #4caf50',
                        borderRadius: 3
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <GPSIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                        <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#4caf50' }}>
                          GPS Location
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                        {formatCoordinate(selectedMedia.latitude)}, {formatCoordinate(selectedMedia.longitude)}
                      </Typography>
                      {selectedMedia.accuracy && (
                        <Typography variant="body2" color="text.secondary">
                          Accuracy: ±{selectedMedia.accuracy}m
                        </Typography>
                      )}
                      {selectedMedia.altitude && (
                        <Typography variant="body2" color="text.secondary">
                          Altitude: {selectedMedia.altitude}m
                        </Typography>
                      )}
                    </Paper>
                  )}

                  {/* Capture Details Card */}
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'white', borderRadius: 3 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <PhoneAndroidIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight="600" color="primary">
                        Capture Details
                      </Typography>
                    </Box>
                    <Stack spacing={1.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <FileIcon fontSize="small" color="action" />
                        <Typography variant="body2">{selectedMedia.fileType?.toUpperCase() || 'Unknown'}</Typography>
                      </Box>
                      {selectedMedia.deviceInfo && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <PhoneAndroidIcon fontSize="small" color="action" />
                          <Typography variant="body2">{selectedMedia.deviceInfo}</Typography>
                        </Box>
                      )}
                      {selectedMedia.timestamp && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <AccessTimeIcon fontSize="small" color="action" />
                          <Typography variant="body2">{formatDate(selectedMedia.timestamp)}</Typography>
                        </Box>
                      )}
                      <Box display="flex" alignItems="center" gap={1}>
                        <CalendarTodayIcon fontSize="small" color="action" />
                        <Typography variant="body2">{formatDate(selectedMedia.createdOn || selectedMedia.created_on)}</Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  {/* Technical Data - Collapsible */}
                  {(selectedMedia.metadata || selectedMedia.exifData) && (
                    <Accordion sx={{ borderRadius: 3, '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">🔧 Technical Data</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Paper elevation={0} sx={{ p: 1, bgcolor: 'grey.100', maxHeight: 200, overflow: 'auto' }}>
                          <Typography variant="body2" component="pre" sx={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(selectedMedia.metadata || selectedMedia.exifData, null, 2)}
                          </Typography>
                        </Paper>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* No GPS Alert */}
                  {!(selectedMedia.latitude && selectedMedia.longitude) && (
                    <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                      <Typography variant="caption">
                        No GPS coordinates available for this media file.
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default LocationDetailsPage; 