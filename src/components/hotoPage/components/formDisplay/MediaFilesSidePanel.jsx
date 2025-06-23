import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Divider,
  Paper,
  Grid,
  Stack,
  Button,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ImageIcon from "@mui/icons-material/Image";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PublicIcon from "@mui/icons-material/Public";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DescriptionIcon from "@mui/icons-material/Description";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { formatKey, formatValue } from "./utils";
import { useState } from "react";

// Helper function to format coordinates with precision
const formatCoordinate = (coordinate, precision = 6) => {
  if (coordinate === null || coordinate === undefined || coordinate === '') {
    return "N/A";
  }
  
  const num = typeof coordinate === "string" ? parseFloat(coordinate) : coordinate;
  return !isNaN(num) && typeof num === "number" ? num.toFixed(precision) : "N/A";
};

// Helper function to format dates
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper function to get file type icon
const getFileTypeIcon = (fileType) => {
  switch (fileType?.toUpperCase()) {
    case "IMAGE":
      return <ImageIcon sx={{ fontSize: 40, color: "primary.main" }} />;
    case "VIDEO":
      return <OndemandVideoIcon sx={{ fontSize: 40, color: "primary.main" }} />;
    default:
      return (
        <InsertDriveFileIcon sx={{ fontSize: 40, color: "primary.main" }} />
      );
  }
};

// Component for location overlay
const LocationOverlay = ({ mediaFile }) => {
  if (!mediaFile?.latitude || !mediaFile?.longitude) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.5) 60%, transparent)',
        color: "white",
        padding: "8px",
        zIndex: 2,
      }}
    >
      <Typography variant="caption" sx={{ display: 'block', fontSize: "0.7rem", fontWeight: "500", lineHeight: 1.2 }}>
        📍 {mediaFile.place || 'Unknown Location'}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: "0.65rem", fontFamily: 'monospace' }}>
          {formatCoordinate(mediaFile.latitude)}°, {formatCoordinate(mediaFile.longitude)}°
        </Typography>
        {mediaFile.accuracy && (
          <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
            ±{Math.round(parseFloat(mediaFile.accuracy))}m
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const MediaFilesSidePanel = ({ open, onClose, mediaFiles }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!mediaFiles || mediaFiles.length === 0) return null;

  const handleMediaClick = (mediaFile) => {
    if (
      (mediaFile.fileType?.toUpperCase() === "IMAGE" ||
        mediaFile.fileType?.toUpperCase() === "VIDEO") &&
      mediaFile.url
    ) {
      setSelectedMedia(mediaFile);
      setDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMedia(null);
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { width: "400px" },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Media Files</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <List sx={{ p: 0 }}>
            {mediaFiles.map((file, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Card elevation={0} sx={{ bgcolor: "background.default" }}>
                  {file.fileType?.toUpperCase() === "IMAGE" && file.url ? (
                    <CardActionArea onClick={() => handleMediaClick(file)}>
                      <Box sx={{ position: "relative" }}>
                        <CardMedia
                          component="img"
                          height="160"
                          image={file.url}
                          alt={file.description || `Image ${index + 1}`}
                          sx={{ objectFit: "cover" }}
                        />
                        <LocationOverlay mediaFile={file} />
                      </Box>
                    </CardActionArea>
                  ) : file.fileType?.toUpperCase() === "VIDEO" && file.url ? (
                    <CardActionArea onClick={() => handleMediaClick(file)}>
                      <Box
                        sx={{
                          position: "relative",
                          height: 160,
                          bgcolor: "grey.900",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <OndemandVideoIcon
                          sx={{ fontSize: 40, color: "white" }}
                        />
                        <PlayArrowIcon
                          sx={{
                            position: "absolute",
                            fontSize: 60,
                            color: "white",
                          }}
                        />
                        <LocationOverlay mediaFile={file} />
                      </Box>
                    </CardActionArea>
                  ) : null}

                  <CardContent sx={{ p: 2 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                    >
                      {getFileTypeIcon(file.fileType)}
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ mb: 0.5, fontWeight: 500 }}
                        >
                          {file.description || `File ${index + 1}`}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Type: {file.fileType || "Unknown"}
                        </Typography>
                        {file.deviceName && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Device: {file.deviceName}
                          </Typography>
                        )}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Uploaded: {formatDate(file.uploaded_at)}
                        </Typography>
                        {file.latitude && file.longitude && (
                          <Box
                            sx={{
                              mt: 1,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <LocationOnIcon fontSize="small" color="primary" />
                            <Typography variant="caption">
                              {formatCoordinate(file.latitude)}°,{" "}
                              {formatCoordinate(file.longitude)}°
                            </Typography>
                          </Box>
                        )}
                        {file.url && (
                          <Link
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mt: 1, display: "inline-block" }}
                          >
                            View Original
                          </Link>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {index < mediaFiles.length - 1 && <Divider sx={{ my: 2 }} />}
              </Box>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Full-screen media dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">📷 Media Details & Geotagged Information</Typography>
          <IconButton onClick={handleCloseDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedMedia && (
            <Grid container spacing={3}>
              {/* Media Preview */}
              <Grid xs={12} md={8}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  {selectedMedia.fileType?.toUpperCase() === "IMAGE" ? (
                    <Box>
                      <Box position="relative" sx={{ mb: 2 }}>
                        <img
                          src={selectedMedia.url}
                          alt={selectedMedia.description}
                          style={{
                            width: "100%",
                            maxHeight: "500px",
                            objectFit: "contain",
                            borderRadius: 8
                          }}
                        />
                        {/* GPS Overlay on Image */}
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
                            <LocationOnIcon sx={{ color: '#4caf50', fontSize: 18 }} />
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {formatCoordinate(selectedMedia.latitude)}, {formatCoordinate(selectedMedia.longitude)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      
                      {/* Image Description */}
                      <Typography variant="body1" sx={{ mb: 1, color: 'text.primary' }}>
                        {selectedMedia.description || `image captured on ${formatDate(selectedMedia.uploadedAt || selectedMedia.uploaded_at)}`}
                      </Typography>
                      
                      {/* File Type Info */}
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {selectedMedia.fileType?.toUpperCase() || 'IMAGE'} • {selectedMedia.deviceName || 'N/A'}
                      </Typography>
                      
                      {/* Action Buttons */}
                      <Stack direction="row" spacing={2}>
                        {selectedMedia.url && (
                          <Button
                            startIcon={<OpenInNewIcon />}
                            onClick={() => window.open(selectedMedia.url, "_blank")}
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
                                window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
                              }
                            }}
                            sx={{ px: 3 }}
                          >
                            Maps
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  ) : selectedMedia.fileType?.toUpperCase() === "VIDEO" ? (
                    <Box>
                      <Box position="relative" sx={{ mb: 2 }}>
                        <video
                          src={selectedMedia.url}
                          controls
                          style={{ 
                            width: "100%", 
                            height: "400px",
                            borderRadius: 8,
                            backgroundColor: "#f5f5f5"
                          }}
                        />
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
                            <LocationOnIcon sx={{ color: '#4caf50', fontSize: 18 }} />
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {formatCoordinate(selectedMedia.latitude)}, {formatCoordinate(selectedMedia.longitude)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      
                      {/* Video Description */}
                      <Typography variant="body1" sx={{ mb: 1, color: 'text.primary' }}>
                        {selectedMedia.description || `video captured on ${formatDate(selectedMedia.uploadedAt || selectedMedia.uploaded_at)}`}
                      </Typography>
                      
                      {/* File Type Info */}
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {selectedMedia.fileType?.toUpperCase() || 'VIDEO'} • {selectedMedia.deviceName || 'N/A'}
                      </Typography>
                      
                      {/* Action Buttons */}
                      <Stack direction="row" spacing={2}>
                        {selectedMedia.url && (
                          <Button
                            startIcon={<OpenInNewIcon />}
                            onClick={() => window.open(selectedMedia.url, "_blank")}
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
                                window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
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
                        {getFileTypeIcon(selectedMedia.fileType)}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          {selectedMedia.fileType || 'File'}
                        </Typography>
                      </Box>
                      
                      {/* File info */}
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {selectedMedia.description || 'No description'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {selectedMedia.fileType} • {formatDate(selectedMedia.uploadedAt || selectedMedia.uploaded_at)}
                      </Typography>
                      
                      <Stack direction="row" spacing={2}>
                        {selectedMedia.url && (
                          <Button
                            startIcon={<OpenInNewIcon />}
                            onClick={() => window.open(selectedMedia.url, "_blank")}
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
                        <LocationOnIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                        <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#4caf50' }}>
                          GPS Location
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                        {formatCoordinate(selectedMedia.latitude)}, {formatCoordinate(selectedMedia.longitude)}
                      </Typography>
                      {selectedMedia.accuracy && (
                        <Typography variant="body2" color="text.secondary">
                          Accuracy: ±{Math.round(parseFloat(selectedMedia.accuracy))}m
                        </Typography>
                      )}
                      {selectedMedia.place && (
                        <Typography variant="body2" color="text.secondary">
                          Location: {selectedMedia.place}
                        </Typography>
                      )}
                    </Paper>
                  )}

                  {/* Capture Details Card */}
                  <Paper elevation={1} sx={{ p: 2, bgcolor: 'white', borderRadius: 3 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <CameraAltIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight="600" color="primary">
                        Capture Details
                      </Typography>
                    </Box>
                    <Stack spacing={1.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <DescriptionIcon fontSize="small" color="action" />
                        <Typography variant="body2">{selectedMedia.fileType?.toUpperCase() || 'Unknown'}</Typography>
                      </Box>
                      {selectedMedia.deviceName && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <PhoneAndroidIcon fontSize="small" color="action" />
                          <Typography variant="body2">{selectedMedia.deviceName}</Typography>
                        </Box>
                      )}
                      <Box display="flex" alignItems="center" gap={1}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2">{formatDate(selectedMedia.uploadedAt || selectedMedia.uploaded_at)}</Typography>
                      </Box>
                    </Stack>
                  </Paper>

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
    </>
  );
};

export default MediaFilesSidePanel;
