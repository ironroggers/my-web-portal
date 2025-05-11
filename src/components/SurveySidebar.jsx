import React, { useState } from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  Divider, 
  CircularProgress, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  Chip, 
  Grid, 
  Card, 
  CardContent, 
  Stack,
  Dialog,
  DialogContent,
  CardMedia,
  CardActionArea,
  Tooltip,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DescriptionIcon from '@mui/icons-material/Description';
import TerrainIcon from '@mui/icons-material/Terrain';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PublicIcon from '@mui/icons-material/Public';
import './SurveySidebar.css';

// Helper function to format dates
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function to format time only
const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function to format date in DD/MM/YYYY format
const formatDateDMY = (dateString) => {
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${formatTime(dateString)}`;
};

// Helper function to format coordinates with precision
const formatCoordinate = (coordinate, precision = 6) => {
  return typeof coordinate === 'number' ? coordinate.toFixed(precision) : 'N/A';
};

// Helper function to get location name from survey
const getLocationName = (survey) => {
  if (survey && survey.location && survey.location.district) {
    return `${survey.location.district}, ${survey.location.state || 'India'}`;
  }
  
  return "Jaipur Division, Rajasthan, India";
};

// Helper function to get detailed address from survey
const getDetailedAddress = (survey) => {
  if (survey && survey.location) {
    const loc = survey.location;
    const parts = [
      loc.block,
      loc.district,
      loc.road ? `${loc.road} Rd` : null
    ].filter(Boolean);
    
    if (parts.length > 0) {
      return parts.join(', ');
    }
  }
  
  return "Dausa, Jirota Mod, Bayana - Jaipur Rd, Jirota";
};

// Helper function to get icon for file type
const getFileTypeIcon = (fileType) => {
  switch (fileType) {
    case 'IMAGE':
      return <ImageIcon className="media-icon" />;
    case 'VIDEO':
      return <OndemandVideoIcon className="media-icon" />;
    case 'DOCUMENT':
      return <InsertDriveFileIcon className="media-icon" />;
    default:
      return <InsertDriveFileIcon className="media-icon" />;
  }
};

// Helper component for compact geotag overlay in thumbnails
const CompactGeotagOverlay = ({ mediaFile }) => {
  if (!mediaFile || !mediaFile.latitude || !mediaFile.longitude) {
    return null;
  }

  const locationName = mediaFile.place || getLocationName(mediaFile);
  const { latitude, longitude } = mediaFile;
  
  return (
    <Box className="media-geotag-overlay" sx={{ padding: '4px 8px' }}>
      <Typography variant="caption" sx={{ lineHeight: 1.2, fontSize: '0.7rem', fontWeight: '500' }}>
        {locationName}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
          {formatCoordinate(latitude, 6)}°, {formatCoordinate(longitude, 6)}°
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
            ±{mediaFile.accuracy}m
          </Typography>
          <PublicIcon sx={{ fontSize: '0.8rem', opacity: 0.8 }} />
        </Box>
      </Box>
    </Box>
  );
};

// Helper component for detailed geotag information overlay in fullscreen view
const MediaGeotagOverlay = ({ mediaFile }) => {
  if (!mediaFile || !mediaFile.latitude || !mediaFile.longitude) {
    return null;
  }

  const locationName = mediaFile.place || getLocationName(mediaFile);
  const { latitude, longitude, deviceName, accuracy } = mediaFile;
  const captureTime = mediaFile.uploaded_at;
  
  // Generate Google Maps static image URL if an API key is available
  const mapEnabled = true; // Set to false to disable map thumbnail
  const apiKey = ''; // For production: set your Google Maps API key here
  const mapImageUrl = mapEnabled && 
    `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=14&size=100x100&markers=color:red%7C${latitude},${longitude}${apiKey ? `&key=${apiKey}` : ''}`;

  return (
    <Box className="media-geotag-overlay">
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        {mapEnabled && mapImageUrl && (
          <Box 
            className="geotag-map-thumbnail"
            sx={{ 
              backgroundImage: `url(${mapImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: { xs: 'none', sm: 'block' }
            }}
          />
        )}
        <Box className="media-geotag-details" sx={{ ml: mapEnabled && mapImageUrl ? { sm: 2 } : 0 }}>
          <Typography className="geotag-location-title">
            {locationName}
          </Typography>
          <Typography className="geotag-coordinates">
            Long {formatCoordinate(longitude, 6)}°
          </Typography>
          <Typography className="geotag-coordinates">
            Lat {formatCoordinate(latitude, 6)}°
          </Typography>
          <Typography className="geotag-coordinates">
            Accuracy: ±{accuracy}m
          </Typography>
          <Typography className="geotag-timestamp">
            {formatDateDMY(captureTime)}
          </Typography>
          <Typography className="geotag-device">
            Device: {deviceName}
          </Typography>
        </Box>
      </Box>
      <Box className="geotag-gps-badge">
        <PublicIcon fontSize="small" /> GPS Map Camera
      </Box>
    </Box>
  );
};

const SurveySidebar = ({ open, survey, loading, onClose }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

  const handleMediaClick = (mediaFile) => {
    if ((mediaFile.fileType === 'IMAGE' || mediaFile.fileType === 'VIDEO') && mediaFile.url) {
      setSelectedMedia(mediaFile);
      setMediaDialogOpen(true);
    }
  };

  const handleCloseMediaDialog = () => {
    setMediaDialogOpen(false);
  };

  if (!open) return null;

  // Check if survey has location coordinates
  const hasCoordinates = survey && survey.latlong && survey.latlong.length >= 2;

  return (
    <>
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      className="survey-sidebar-drawer"
      PaperProps={{ className: "MuiDrawer-paper" }}
    >
      <IconButton 
        onClick={onClose} 
        className="sidebar-close-button"
        aria-label="close"
      >
        <CloseIcon />
      </IconButton>

      {loading ? (
        <Box className="survey-sidebar-loading">
          <CircularProgress />
        </Box>
      ) : !survey ? (
        <Box className="survey-sidebar-empty">
          <Typography variant="body1">No survey selected</Typography>
        </Box>
      ) : (
        <Box sx={{ padding: 1 }}>
          <Typography variant="h5" className="survey-title">
            {survey.title}
          </Typography>
          
          <Divider />
          
          {/* Description */}
          {survey.description && (
            <Box className="sidebar-section">
              <Box className="info-row">
                <DescriptionIcon className="info-icon" />
                <Typography variant="body2" color="text.secondary">
                  {survey.description}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Location Info */}
          <Box className="sidebar-section">
            <Box className="info-row">
              <LocationOnIcon className="info-icon" />
              <Typography variant="body2">
                {survey.location ? 
                  `${survey.location.district || ''}, ${survey.location.block || ''}` : 
                  hasCoordinates ? `Lat: ${survey.latlong[0]}, Long: ${survey.latlong[1]}` : 'No location data'}
              </Typography>
            </Box>
          </Box>
          
          {/* Terrain & ROW Authority */}
          <Box className="sidebar-section">
            {survey.terrainData?.type && (
              <Box className="info-row">
                <TerrainIcon className="info-icon" />
                <Typography variant="body2">
                  Terrain: {survey.terrainData.type}
                </Typography>
              </Box>
            )}
            
            {survey.rowAuthority && (
              <Box className="info-row">
                <Typography variant="body2">
                  ROW Authority: {survey.rowAuthority}
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Created and Updated */}
          <Box className="sidebar-section">
            <Box className="info-row">
              <CalendarTodayIcon className="info-icon" />
              <Typography variant="body2">
                Created: {formatDate(survey.created_on)}
              </Typography>
            </Box>
            
            {survey.updated_on && (
              <Box className="info-row">
                <CalendarTodayIcon className="info-icon" />
                <Typography variant="body2">
                  Updated: {formatDate(survey.updated_on)}
                </Typography>
              </Box>
            )}
            
            {survey.created_by && (
              <Box className="info-row">
                <PersonIcon className="info-icon" />
                <Typography variant="body2">
                  Created by: {survey.created_by.username || survey.created_by.email || ''}
                </Typography>
              </Box>
            )}
            
            {survey.updated_by && (
              <Box className="info-row">
                <PersonIcon className="info-icon" />
                <Typography variant="body2">
                  Updated by: {survey.updated_by.username || survey.updated_by.email || ''}
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Media Files */}
          {survey.mediaFiles && survey.mediaFiles.length > 0 && (
            <Box className="sidebar-section">
              <Typography variant="subtitle1" className="media-section-title">
                Media Files
              </Typography>
              
              <Grid container spacing={1} className="media-list">
                {survey.mediaFiles.map((file, index) => {
                  return (
                  <Grid item xs={12} sm={(file.fileType === 'IMAGE' || file.fileType === 'VIDEO') ? 6 : 12} key={index}>
                    <Card className="sidebar-media-card">
                      {file.fileType === 'IMAGE' && file.url ? (
                        <CardActionArea onClick={() => handleMediaClick(file)}>
                          <Box sx={{ position: 'relative' }}>
                            <CardMedia
                              component="img"
                              height="120"
                              image={file.url}
                              alt={file.description || `Image ${index + 1}`}
                              sx={{ objectFit: 'cover' }}
                            />
                            {/* Geotag indicator */}
                            {file.latitude && file.longitude && (
                              <Box className="geotag-indicator">
                                <LocationOnIcon fontSize="small" />
                              </Box>
                            )}
                            {file.latitude && file.longitude && (
                              <CompactGeotagOverlay mediaFile={file} />
                            )}
                          </Box>
                          <CardContent sx={{ p: 1, pb: '8px !important' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="body2" className="media-name" noWrap>
                                {file.description || `Image ${index + 1}`}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ZoomInIcon fontSize="small" color="primary" />
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Uploaded: {formatDate(file.uploaded_at)}
                              </Typography>
                              {file.latitude && file.longitude && (
                                <>
                                  <Typography variant="caption" className="media-coordinates">
                                    <LocationOnIcon fontSize="inherit" />
                                    {formatCoordinate(file.latitude, 6)}°, {formatCoordinate(file.longitude, 6)}°
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                    Device: {file.deviceName}
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      ) : file.fileType === 'VIDEO' && file.url ? (
                        <CardActionArea onClick={() => handleMediaClick(file)}>
                          <Box sx={{ position: 'relative' }}>
                            <CardMedia
                              component="div"
                              height="120"
                              className="video-thumbnail"
                            >
                              <OndemandVideoIcon sx={{ fontSize: 40, color: '#fff' }} />
                              <PlayArrowIcon className="video-play-overlay" />
                            </CardMedia>
                            {/* Geotag indicator for videos */}
                            {file.latitude && file.longitude && (
                              <Box className="geotag-indicator">
                                <LocationOnIcon fontSize="small" />
                              </Box>
                            )}
                            {file.latitude && file.longitude && (
                              <CompactGeotagOverlay mediaFile={file} />
                            )}
                          </Box>
                          <CardContent sx={{ p: 1, pb: '8px !important' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="body2" className="media-name" noWrap>
                                {file.description || `Video ${index + 1}`}
                              </Typography>
                              <PlayArrowIcon fontSize="small" color="primary" />
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Uploaded: {formatDate(file.uploaded_at)}
                              </Typography>
                              {file.latitude && file.longitude && (
                                <>
                                  <Typography variant="caption" className="media-coordinates">
                                    <LocationOnIcon fontSize="inherit" />
                                    {formatCoordinate(file.latitude, 6)}°, {formatCoordinate(file.longitude, 6)}°
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                    Device: {file.deviceName}
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      ) : (
                        <CardContent sx={{ p: 1 }}>
                          <Box className="media-item">
                            {getFileTypeIcon(file.fileType)}
                            <Box className="media-info">
                              <Typography variant="body2" className="media-name">
                                {file.description || `File ${index + 1}`}
                              </Typography>
                              <Typography variant="caption" className="media-date">
                                {formatDate(file.uploaded_at)}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      )}
                    </Card>
                  </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
          
          {/* Additional fields from "others" */}
          {survey.others && Object.keys(survey.others).length > 0 && (
            <Box className="sidebar-section">
              <Typography variant="subtitle1" className="media-section-title">
                Additional Information
              </Typography>
              
              <List dense>
                {Object.entries(survey.others).map(([key, value]) => (
                  <ListItem key={key} sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={key} 
                      secondary={typeof value === 'object' ? JSON.stringify(value) : String(value)} 
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {/* Status Chip */}
          <Box className="sidebar-section">
            <Stack direction="row" justifyContent="flex-end">
              <Chip 
                label={`Status: ${survey.status === 1 ? 'Active' : survey.status === 2 ? 'Completed' : 'Inactive'}`}
                color={survey.status === 1 ? 'primary' : survey.status === 2 ? 'success' : 'default'}
                className="sidebar-chip"
              />
            </Stack>
          </Box>
        </Box>
      )}
    </Drawer>

    {/* Media Dialog */}
    <Dialog
      open={mediaDialogOpen}
      onClose={handleCloseMediaDialog}
      maxWidth="lg"
      fullWidth
    >
      <DialogContent className="media-dialog-content">
        <IconButton
          onClick={handleCloseMediaDialog}
          aria-label="close"
          className="media-dialog-close"
        >
          <CloseIcon />
        </IconButton>
        
        {selectedMedia && survey && (
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Box sx={{ width: '100%', textAlign: 'center', position: 'relative' }} className="media-fullscreen-container">
              {selectedMedia.fileType === 'IMAGE' ? (
                <>
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.description || "Survey image"}
                    style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                  />
                  {hasCoordinates && (
                    <MediaGeotagOverlay mediaFile={selectedMedia} />
                  )}
                </>
              ) : selectedMedia.fileType === 'VIDEO' && (
                <>
                  <video
                    src={selectedMedia.url}
                    controls
                    autoPlay
                    style={{ maxWidth: '100%', maxHeight: '80vh' }}
                  />
                  {hasCoordinates && (
                    <MediaGeotagOverlay mediaFile={selectedMedia} />
                  )}
                </>
              )}
            </Box>
            
            <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
              {selectedMedia.description && (
                <Typography variant="subtitle1">
                  {selectedMedia.description}
                </Typography>
              )}
              
              
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default SurveySidebar; 