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
  CardActionArea
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
                  `Lat: ${survey.latlong[0]}, Long: ${survey.latlong[1]}`}
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
                {survey.mediaFiles.map((file, index) => (
                  <Grid item xs={12} sm={(file.fileType === 'IMAGE' || file.fileType === 'VIDEO') ? 6 : 12} key={index}>
                    <Card className="sidebar-media-card">
                      {file.fileType === 'IMAGE' && file.url ? (
                        <CardActionArea onClick={() => handleMediaClick(file)}>
                          <CardMedia
                            component="img"
                            height="120"
                            image={file.url}
                            alt={file.description || `Image ${index + 1}`}
                            sx={{ objectFit: 'cover' }}
                          />
                          <CardContent sx={{ p: 1, pb: '8px !important' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="body2" className="media-name" noWrap>
                                {file.description || `Image ${index + 1}`}
                              </Typography>
                              <ZoomInIcon fontSize="small" color="primary" />
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
                          </Box>
                          <CardContent sx={{ p: 1, pb: '8px !important' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="body2" className="media-name" noWrap>
                                {file.description || `Video ${index + 1}`}
                              </Typography>
                              <PlayArrowIcon fontSize="small" color="primary" />
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
                ))}
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
        
        {selectedMedia && (
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              {selectedMedia.fileType === 'IMAGE' ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.description || "Survey image"}
                  style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                />
              ) : selectedMedia.fileType === 'VIDEO' && (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  style={{ maxWidth: '100%', maxHeight: '80vh' }}
                />
              )}
            </Box>
            
            {selectedMedia.description && (
              <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle1">
                  {selectedMedia.description}
                </Typography>
                {selectedMedia.uploaded_at && (
                  <Typography variant="caption" color="text.secondary">
                    Uploaded: {formatDate(selectedMedia.uploaded_at)}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default SurveySidebar; 