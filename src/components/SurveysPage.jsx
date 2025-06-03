import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  Divider,
  CardMedia,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme,
  alpha
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  Assignment as AssignmentIcon,
  PhotoCamera as PhotoCameraIcon,
  Description as DescriptionIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Business as BusinessIcon,
  Route as RouteIcon,
  Engineering as EngineeringIcon
} from '@mui/icons-material';
import surveyService from '../services/surveyService';
import './SurveysPage.css';

// Styled components
const StatsCard = styled(Card)(({ theme, variant = 'primary' }) => ({
  height: '100%',
  background: alpha(theme.palette[variant].main, 0.05),
  borderLeft: `4px solid ${theme.palette[variant].main}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const SurveyCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.3s ease',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '12px',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[12],
    borderColor: theme.palette.primary.main,
  },
  marginBottom: theme.spacing(3),
  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
}));

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`survey-tabpanel-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const SurveysPage = () => {
  const theme = useTheme();
  const [surveys, setSurveys] = useState([]);
  const [stats, setStats] = useState({
    totalSurveys: 0,
    activeSurveys: 0,
    blockSurveys: 0,
    gpSurveys: 0,
    ofcSurveys: 0,
    totalMediaFiles: 0,
    totalFields: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [tabValue, setTabValue] = useState(0);
  const [expandedSurvey, setExpandedSurvey] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    surveyType: '',
    status: '',
    stateName: '',
    districtName: '',
    blockName: ''
  });

  const navigate = useNavigate();

  // Fetch surveys
  const fetchSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyService.getSurveys({
        ...filters,
        page: page + 1,
        limit: rowsPerPage
      });

      if (response.success) {
        setSurveys(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await surveyService.getSurveyStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get survey type color
  const getSurveyTypeColor = (type) => {
    switch (type) {
      case 'block': return 'primary';
      case 'gp': return 'secondary';
      case 'ofc': return 'success';
      default: return 'default';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 1: return 'success';
      case 2: return 'warning';
      case 3: return 'info';
      default: return 'default';
    }
  };

  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 1: return 'Active';
      case 2: return 'In Progress';
      case 3: return 'Completed';
      case 0: return 'Deleted';
      default: return 'Unknown';
    }
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  // Handle survey detail view
  const handleViewSurvey = async (survey) => {
    try {
      const response = await surveyService.getSurveyById(survey._id);
      if (response.success) {
        setSelectedSurvey(response.data);
        setDetailDialogOpen(true);
      }
    } catch (err) {
      setError('Error loading survey details');
    }
  };

  // Handle expand survey card
  const handleExpandSurvey = (surveyId) => {
    setExpandedSurvey(expandedSurvey === surveyId ? null : surveyId);
  };

  // Handle location click
  const handleLocationClick = (survey) => {
    console.log('Navigating to location details for survey:', survey.name);
    
    // Try different approaches to find location ID
    let locationId = null;
    
    // Approach 1: Direct locationId object with _id
    if (survey.locationId && typeof survey.locationId === 'object' && survey.locationId._id) {
      locationId = survey.locationId._id;
    }
    // Approach 2: Direct locationId as string
    else if (survey.locationId && typeof survey.locationId === 'string') {
      locationId = survey.locationId;
    }
    // Approach 3: Use survey._id as fallback if no locationId
    else if (survey._id) {
      // For now, let's use the survey ID and handle it in LocationDetailsPage
      locationId = survey._id;
      console.log('Using survey ID as fallback for location navigation');
    }
    
    if (locationId) {
      navigate(`/location/${locationId}`);
    } else {
      alert('Location information not available for this survey');
    }
  };

  // Render survey fields
  const renderSurveyFields = (fields) => {
    if (!fields || fields.length === 0) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Survey Fields ({fields.length})
        </Typography>
        <List dense>
          {fields.slice(0, 5).map((field) => (
            <ListItem key={field._id} divider>
              <ListItemIcon>
                <AssignmentIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={field.key}
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {field.fieldType} • Sequence: {field.sequence}
                    </Typography>
                    {field.value && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        Value: {field.value}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
          {fields.length > 5 && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography variant="caption" color="text.secondary">
                    ... and {fields.length - 5} more fields
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Box>
    );
  };

  // Render media files
  const renderMediaFiles = (mediaFiles) => {
    if (!mediaFiles || mediaFiles.length === 0) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Media Files ({mediaFiles.length})
        </Typography>
        <ImageList cols={3} rowHeight={100} sx={{ mt: 1 }}>
          {mediaFiles.slice(0, 6).map((media, index) => (
            <ImageListItem key={index}>
              {media.fileType === 'IMAGE' ? (
                <img
                  src={media.url}
                  alt={media.description || 'Survey image'}
                  loading="lazy"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.200'
                  }}
                >
                  <PhotoCameraIcon />
                </Box>
              )}
              <ImageListItemBar
                title={media.fileType}
                subtitle={media.description}
                sx={{ fontSize: '0.75rem' }}
              />
            </ImageListItem>
          ))}
        </ImageList>
        {mediaFiles.length > 6 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            ... and {mediaFiles.length - 6} more files
          </Typography>
        )}
      </Box>
    );
  };

  // Statistics cards
  const statsCards = [
    { title: 'Total Surveys', value: stats.totalSurveys, icon: AssignmentIcon, color: 'primary' },
    { title: 'Active Surveys', value: stats.activeSurveys, icon: BusinessIcon, color: 'success' },
    { title: 'Block Surveys', value: stats.blockSurveys, icon: BusinessIcon, color: 'info' },
    { title: 'GP Surveys', value: stats.gpSurveys, icon: LocationOnIcon, color: 'warning' },
    { title: 'OFC Surveys', value: stats.ofcSurveys, icon: RouteIcon, color: 'secondary' },
    { title: 'Media Files', value: stats.totalMediaFiles, icon: PhotoCameraIcon, color: 'primary' }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Survey Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and view all survey data including Block, GP, and OFC surveys
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <StatsCard variant={stat.color}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <stat.icon color={stat.color} sx={{ mr: 1 }} />
                  <Typography variant="h6" component="div">
                    {stat.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </StatsCard>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Survey Type</InputLabel>
              <Select
                value={filters.surveyType}
                label="Survey Type"
                onChange={(e) => handleFilterChange('surveyType', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="block">Block</MenuItem>
                <MenuItem value="gp">GP</MenuItem>
                <MenuItem value="ofc">OFC</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="1">Active</MenuItem>
                <MenuItem value="2">In Progress</MenuItem>
                <MenuItem value="3">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="State"
              value={filters.stateName}
              onChange={(e) => handleFilterChange('stateName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="District"
              value={filters.districtName}
              onChange={(e) => handleFilterChange('districtName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchSurveys}
              sx={{ height: '56px' }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Survey Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {surveys.map((survey) => (
            <SurveyCard key={survey._id}>
              <CardContent sx={{ p: 3 }}>
                {/* Header Section */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {survey.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                      {survey.description}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
                      <Chip
                        label={survey.surveyType?.toUpperCase()}
                        size="small"
                        color={getSurveyTypeColor(survey.surveyType)}
                        sx={{ fontWeight: 'bold' }}
                      />
                      <Chip
                        label={getStatusLabel(survey.status)}
                        size="small"
                        color={getStatusColor(survey.status)}
                        sx={{ fontWeight: 'bold' }}
                      />
                      {survey.fields && (
                        <Chip
                          icon={<AssignmentIcon />}
                          label={`${survey.fields.length} fields`}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      )}
                      {survey.mediaFiles && (
                        <Chip
                          icon={<PhotoCameraIcon />}
                          label={`${survey.mediaFiles.length} files`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                    <Tooltip title="View Details">
                      <IconButton 
                        onClick={() => handleViewSurvey(survey)}
                        sx={{ 
                          backgroundColor: 'primary.light',
                          color: 'primary.main',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white'
                          }
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedSurvey === survey._id ? "Collapse" : "Expand Details"}>
                      <IconButton 
                        onClick={() => handleExpandSurvey(survey._id)}
                        sx={{ 
                          backgroundColor: 'secondary.light',
                          color: 'secondary.main',
                          '&:hover': {
                            backgroundColor: 'secondary.main',
                            color: 'white'
                          }
                        }}
                      >
                        {expandedSurvey === survey._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                {/* Information Section */}
                <Grid container spacing={3} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                        📍 Location
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationOnIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {survey.districtName}, {survey.stateName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <BusinessIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {survey.blockName}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<LocationOnIcon />}
                        onClick={() => handleLocationClick(survey)}
                        sx={{ 
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          fontWeight: 600,
                          '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white',
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        View Location Details
                      </Button>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                      👤 Survey Info
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        Created by: {survey.createdBy?.email || 'Unknown'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarTodayIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {formatDate(survey.createdOn)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    {survey.contactPerson && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                          📞 Contact Person
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {survey.contactPerson.sdeName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          📱 {survey.contactPerson.sdeMobile}
                        </Typography>
                        {survey.contactPerson.engineerName && (
                          <Typography variant="body2" color="text.secondary">
                            👷 Engineer: {survey.contactPerson.engineerName}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Grid>
                </Grid>

                {/* Expanded Content */}
                <Collapse in={expandedSurvey === survey._id}>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      {renderSurveyFields(survey.fields)}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {renderMediaFiles(survey.mediaFiles)}
                    </Grid>
                  </Grid>
                </Collapse>
              </CardContent>
            </SurveyCard>
          ))}

          {/* Pagination */}
          <TablePagination
            component="div"
            count={pagination.total}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Box>
      )}

      {/* Survey Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Survey Details
        </DialogTitle>
        <DialogContent>
          {selectedSurvey && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedSurvey.name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedSurvey.description}
              </Typography>
              
              {/* Location info */}
              {selectedSurvey.locationId && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    📍 Location Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper 
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundColor: 'grey.50'
                        }}
                      >
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>District:</strong> {selectedSurvey.locationId.district}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          <strong>Block:</strong> {selectedSurvey.locationId.block}
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<LocationOnIcon />}
                          onClick={() => handleLocationClick(selectedSurvey)}
                          sx={{ 
                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #1976D2 30%, #1A9CDB 90%)',
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          View All Surveys at this Location
                        </Button>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        <strong>Coordinates:</strong> {selectedSurvey.latitude}, {selectedSurvey.longitude}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Survey Fields */}
              {selectedSurvey.fields && selectedSurvey.fields.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Survey Fields
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Sequence</TableCell>
                          <TableCell>Field</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedSurvey.fields.map((field) => (
                          <TableRow key={field._id}>
                            <TableCell>{field.sequence}</TableCell>
                            <TableCell>{field.key}</TableCell>
                            <TableCell>
                              <Chip label={field.fieldType} size="small" />
                            </TableCell>
                            <TableCell>{field.value || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Media Files */}
              {selectedSurvey.mediaFiles && selectedSurvey.mediaFiles.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Media Files
                  </Typography>
                  <ImageList cols={4} rowHeight={164}>
                    {selectedSurvey.mediaFiles.map((media, index) => (
                      <ImageListItem key={index}>
                        {media.fileType === 'IMAGE' ? (
                          <img
                            src={media.url}
                            alt={media.description || 'Survey image'}
                            loading="lazy"
                          />
                        ) : (
                          <Box
                            sx={{
                              height: '164px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'grey.200'
                            }}
                          >
                            <PhotoCameraIcon sx={{ fontSize: 40 }} />
                          </Box>
                        )}
                        <ImageListItemBar
                          title={media.fileType}
                          subtitle={media.description}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SurveysPage; 