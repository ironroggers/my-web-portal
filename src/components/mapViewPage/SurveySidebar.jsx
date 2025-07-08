import React, { useState, useEffect } from "react";
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
  ListItemIcon,
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
  Paper,
  DialogTitle,
  Button,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DescriptionIcon from "@mui/icons-material/Description";
import TerrainIcon from "@mui/icons-material/Terrain";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PublicIcon from "@mui/icons-material/Public";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FileIcon from "@mui/icons-material/FileCopy";
import BusinessIcon from "@mui/icons-material/Business";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import "./SurveySidebar.css";
import { useJsApiLoader } from "@react-google-maps/api";
const GOOGLE_MAPS_API_KEY = "AIzaSyC2pds2TL5_lGUM-7Y1CFiGq8Wrn0oULr0";

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

const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateDMY = (dateString) => {
  const date = new Date(dateString);
  return `${date.getDate()}/${
    date.getMonth() + 1
  }/${date.getFullYear()} ${formatTime(dateString)}`;
};

const formatCoordinate = (coordinate, precision = 6) => {
  if (coordinate === null || coordinate === undefined || coordinate === '') {
    return "N/A";
  }
  
  const num = typeof coordinate === "string" ? parseFloat(coordinate) : coordinate;
  return !isNaN(num) && typeof num === "number" ? num.toFixed(precision) : "N/A";
};

const useReverseGeocode = (latitude, longitude) => {
  const [locationName, setLocationName] = useState("");

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  useEffect(() => {
    if (
      !isLoaded ||
      latitude == null ||
      longitude == null ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    const latLng = {
      lat: typeof latitude === "string" ? parseFloat(latitude) : latitude,
      lng: typeof longitude === "string" ? parseFloat(longitude) : longitude,
    };

    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        setLocationName(results[0].formatted_address);
      } else {
        console.error("Geocoding failed:", status);
        setLocationName("");
      }
    });
  }, [isLoaded, latitude, longitude]);

  return locationName;
};

const getDetailedAddress = (survey) => {
  if (survey && survey.location) {
    const loc = survey.location;
    const parts = [
      loc.block,
      loc.district,
      loc.road ? `${loc.road} Rd` : null,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  return "Dausa, Jirota Mod, Bayana - Jaipur Rd, Jirota";
};

const getFileTypeIcon = (fileType) => {
  switch (fileType) {
    case "IMAGE":
      return <ImageIcon className="media-icon" />;
    case "VIDEO":
      return <OndemandVideoIcon className="media-icon" />;
    case "DOCUMENT":
      return <InsertDriveFileIcon className="media-icon" />;
    default:
      return <InsertDriveFileIcon className="media-icon" />;
  }
};

const CompactGeotagOverlay = ({ mediaFile }) => {
  if (!mediaFile || !mediaFile.latitude || !mediaFile.longitude) {
    return null;
  }

  const { latitude, longitude, accuracy } = mediaFile;
  const locationName =
    mediaFile.place || useReverseGeocode(latitude, longitude);

  return (
    <Box 
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.5) 60%, transparent)',
        color: 'white',
        padding: '8px',
        zIndex: 2,
      }}
    >
      <Typography
        variant="caption"
        sx={{ lineHeight: 1.2, fontSize: "0.7rem", fontWeight: "500", display: 'block' }}
      >
        📍 {locationName || 'Unknown Location'}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: '2px',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: "0.65rem", fontFamily: 'monospace' }}>
          {formatCoordinate(latitude, 6)}°, {formatCoordinate(longitude, 6)}°
        </Typography>
        {accuracy && (
          <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
            ±{Math.round(parseFloat(accuracy))}m
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const MediaGeotagOverlay = ({ mediaFile }) => {
  if (!mediaFile || !mediaFile.latitude || !mediaFile.longitude) {
    return null;
  }

  const { latitude, longitude, deviceName, accuracy } = mediaFile;
  const locationName =
    mediaFile.place || useReverseGeocode(latitude, longitude);
  const captureTime = mediaFile.uploaded_at;

  const mapEnabled = true;
  const apiKey = "AIzaSyC2pds2TL5_lGUM-7Y1CFiGq8Wrn0oULr0";
  const mapImageUrl =
    mapEnabled &&
    `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=14&size=100x100&markers=color:red%7C${latitude},${longitude}${
      apiKey ? `&key=${apiKey}` : ""
    }`;

  return (
    <Box 
      sx={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '12px',
        padding: '12px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        zIndex: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start" }}>
        {/* Map View */}
        {mapEnabled && mapImageUrl && (
          <Box
            sx={{
              width: '100px',
              height: '100px',
              borderRadius: '8px',
              overflow: 'hidden',
              marginRight: '12px',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              backgroundImage: `url(${mapImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {/* Custom marker */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#F44336',
                borderRadius: '12px',
                width: '24px',
                height: '24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: '#fff',
              }}
            >
              <LocationOnIcon sx={{ fontSize: '16px', color: 'white' }} />
            </Box>
          </Box>
        )}
        
        {/* Location Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography 
            sx={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              color: '#fff', 
              marginBottom: '4px',
              lineHeight: 1.2,
            }}
          >
            {locationName || 'Sector 5 Bidhannagar West\nBengal 700091 India'}
          </Typography>
          <Typography 
            sx={{ 
              fontSize: '12px', 
              fontFamily: 'monospace', 
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.3,
              marginBottom: '2px',
            }}
          >
            Latitude:    {formatCoordinate(latitude, 14)}
          </Typography>
          <Typography 
            sx={{ 
              fontSize: '12px', 
              fontFamily: 'monospace', 
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.3,
              marginBottom: '2px',
            }}
          >
            Longitude:  {formatCoordinate(longitude, 14)}
          </Typography>
          {accuracy && (
            <Typography 
              sx={{ 
                fontSize: '12px', 
                fontFamily: 'monospace', 
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.3,
                marginBottom: '2px',
              }}
            >
              Accuracy:    ±{Math.round(parseFloat(accuracy))}m
            </Typography>
          )}
          <Typography 
            sx={{ 
              fontSize: '11px', 
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: '4px',
            }}
          >
            {formatDateDMY(captureTime)}
          </Typography>
          {deviceName && (
            <Typography 
              sx={{ 
                fontSize: '11px', 
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              Device: {deviceName}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const SurveySidebar = ({ open, survey, loading, onClose }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

  const handleMediaClick = (mediaFile) => {
    setSelectedMedia(mediaFile);
    setMediaDialogOpen(true);
  };

  const handleCloseMediaDialog = () => {
    setMediaDialogOpen(false);
    setSelectedMedia(null);
  };

  if (!open) {
    return null;
  }

  useEffect(() => {
    if (survey) {
      console.log("Survey data structure:", survey);
      console.log("Media files:", survey.mediaFiles);
      console.log("Fields:", survey.fields);
      if (survey.fields && survey.fields.length > 0) {
        console.log("Sample field:", survey.fields[0]);
        // Check if field has mediaFiles array
        survey.fields.forEach((field, index) => {
          if (field.mediaFiles && field.mediaFiles.length > 0) {
            console.log(
              `Field ${index} has ${field.mediaFiles.length} media files:`,
              field.mediaFiles
            );
          }
        });
      }
    }
  }, [survey]);

  const hasCoordinates = survey && survey.latitude && survey.longitude;
  const surveyLocationName = useReverseGeocode(
    hasCoordinates ? parseFloat(survey.latitude) : null,
    hasCoordinates ? parseFloat(survey.longitude) : null
  );

  const getAllMediaFiles = (survey) => {
    const allMedia = [];

    if (survey.mediaFiles && Array.isArray(survey.mediaFiles)) {
      allMedia.push(
        ...survey.mediaFiles.map((file) => ({ ...file, source: "survey" }))
      );
    }

    if (survey.fields && Array.isArray(survey.fields)) {
      survey.fields.forEach((field, fieldIndex) => {
        if (field.mediaFiles && Array.isArray(field.mediaFiles)) {
          allMedia.push(
            ...field.mediaFiles.map((file) => ({
              ...file,
              source: "field",
              fieldKey: field.key,
              fieldIndex,
            }))
          );
        }
      });
    }

    return allMedia;
  };

  const allMediaFiles = survey ? getAllMediaFiles(survey) : [];

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        className="survey-sidebar-drawer"
        PaperProps={{
          className: "MuiDrawer-paper",
          sx: {
            width: { xs: "100%", sm: "400px", md: "450px" },
            maxWidth: "90vw",
          },
        }}
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
              {survey.name || survey.title}
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

            {/* Survey Type and Status */}
            <Box className="sidebar-section">
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={survey.surveyType?.toUpperCase() || "UNKNOWN"}
                  color={
                    survey.surveyType === "block"
                      ? "primary"
                      : survey.surveyType === "gp"
                      ? "secondary"
                      : "success"
                  }
                  size="small"
                />
                <Chip
                  label={
                    survey.status === 1
                      ? "Active"
                      : survey.status === 2
                      ? "In Progress"
                      : survey.status === 3
                      ? "Completed"
                      : "Unknown"
                  }
                  color={
                    survey.status === 1
                      ? "success"
                      : survey.status === 2
                      ? "warning"
                      : survey.status === 3
                      ? "info"
                      : "default"
                  }
                  size="small"
                />
              </Stack>
            </Box>

            {/* Location Info */}
            <Box className="sidebar-section">
              <Box className="info-row">
                <LocationOnIcon className="info-icon" />
                <Box>
                  <Typography variant="body2">
                    {surveyLocationName || "Unknown Location"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getDetailedAddress(survey)}
                  </Typography>
                  {hasCoordinates && (
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      📍 {formatCoordinate(parseFloat(survey.latitude), 6)}°,{" "}
                      {formatCoordinate(parseFloat(survey.longitude), 6)}°
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Contact Person Info */}
            {survey.contactPerson && (
              <Box className="sidebar-section">
                <Typography variant="subtitle2" gutterBottom>
                  Contact Information
                </Typography>
                <Box className="info-row">
                  <PersonIcon className="info-icon" />
                  <Box>
                    <Typography variant="body2">
                      SDE: {survey.contactPerson.sdeName || "N/A"}
                    </Typography>
                    {survey.contactPerson.sdeMobile && (
                      <Typography variant="caption" color="text.secondary">
                        Mobile: {survey.contactPerson.sdeMobile}
                      </Typography>
                    )}
                    {survey.contactPerson.engineerName && (
                      <>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          Engineer: {survey.contactPerson.engineerName}
                        </Typography>
                        {survey.contactPerson.engineerMobile && (
                          <Typography variant="caption" color="text.secondary">
                            Mobile: {survey.contactPerson.engineerMobile}
                          </Typography>
                        )}
                      </>
                    )}
                    {survey.contactPerson.address && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        Address: {survey.contactPerson.address}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            )}

            {/* Created and Updated */}
            <Box className="sidebar-section">
              <Box className="info-row">
                <CalendarTodayIcon className="info-icon" />
                <Typography variant="body2">
                  Created: {formatDate(survey.createdOn || survey.created_on)}
                </Typography>
              </Box>

              {(survey.updatedOn || survey.updated_on) && (
                <Box className="info-row">
                  <CalendarTodayIcon className="info-icon" />
                  <Typography variant="body2">
                    Updated: {formatDate(survey.updatedOn || survey.updated_on)}
                  </Typography>
                </Box>
              )}

              {survey.createdBy && (
                <Box className="info-row">
                  <PersonIcon className="info-icon" />
                  <Typography variant="body2">
                    Created by:{" "}
                    {survey.createdBy.email ||
                      survey.createdBy.name ||
                      survey.created_by?.username ||
                      survey.created_by?.email ||
                      "Unknown"}
                  </Typography>
                </Box>
              )}

              {survey.updatedBy && (
                <Box className="info-row">
                  <PersonIcon className="info-icon" />
                  <Typography variant="body2">
                    Updated by:{" "}
                    {survey.updatedBy.email ||
                      survey.updatedBy.name ||
                      survey.updated_by?.username ||
                      survey.updated_by?.email ||
                      "Unknown"}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Survey Fields */}
            {survey.fields && survey.fields.length > 0 && (
              <Box className="sidebar-section">
                <Typography variant="subtitle1" className="media-section-title">
                  Survey Fields ({survey.fields.length})
                </Typography>

                <Box
                  sx={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    border: "1px solid rgba(0, 0, 0, 0.12)",
                    borderRadius: "4px",
                    backgroundColor: "rgba(0, 0, 0, 0.02)",
                  }}
                >
                  <List dense>
                    {survey.fields.map((field, index) => (
                      <ListItem key={field._id || index} divider>
                        <ListItemIcon>
                          <AssignmentIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight="500">
                              {field.key}
                            </Typography>
                          }
                          secondary={
                            field.value ? (
                              <Typography
                                variant="body2"
                                sx={{ mt: 0.5, color: "text.primary" }}
                              >
                                {field.value}
                              </Typography>
                            ) : (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontStyle: "italic",
                                  color: "text.secondary",
                                }}
                              >
                                No value
                              </Typography>
                            )
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            )}

            {/* Media Files */}
            {allMediaFiles && allMediaFiles.length > 0 ? (
              <Box className="sidebar-section">
                <Typography variant="subtitle1" className="media-section-title">
                  Media Files ({allMediaFiles.length})
                  {survey.mediaFiles && survey.mediaFiles.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      ({survey.mediaFiles.length} survey +{" "}
                      {allMediaFiles.length - survey.mediaFiles.length} field
                      media)
                    </Typography>
                  )}
                </Typography>

                <Box
                  sx={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    border: "1px solid rgba(0, 0, 0, 0.12)",
                    borderRadius: "4px",
                    p: 1,
                  }}
                >
                  <Grid container spacing={1} className="media-list">
                    {allMediaFiles.map((file, index) => {
                      const latitude = file.latitude
                        ? parseFloat(file.latitude)
                        : null;
                      const longitude = file.longitude
                        ? parseFloat(file.longitude)
                        : null;
                      const hasGeotag =
                        latitude &&
                        longitude &&
                        !isNaN(latitude) &&
                        !isNaN(longitude);

                      return (
                        <Grid
                          item
                          xs={12}
                          sm={
                            file.fileType === "IMAGE" ||
                            file.fileType === "VIDEO"
                              ? 6
                              : 12
                          }
                          key={`${file.source}-${index}`}
                        >
                          <Card
                            className="sidebar-media-card"
                            sx={{ position: "relative" }}
                          >
                            {/* Source indicator */}
                            <Box
                              sx={{
                                position: "absolute",
                                top: 4,
                                left: 4,
                                zIndex: 2,
                                backgroundColor:
                                  file.source === "survey"
                                    ? "rgba(33, 150, 243, 0.8)"
                                    : "rgba(156, 39, 176, 0.8)",
                                borderRadius: "4px",
                                px: 0.5,
                                py: 0.25,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "white",
                                  fontSize: "0.65rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {file.source === "survey"
                                  ? "S"
                                  : `F${file.fieldIndex + 1}`}
                              </Typography>
                            </Box>

                            {hasGeotag && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  zIndex: 2,
                                  backgroundColor: "rgba(76, 175, 80, 0.8)",
                                  borderRadius: "50%",
                                  p: 0.5,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <LocationOnIcon
                                  fontSize="small"
                                  sx={{ color: "white" }}
                                />
                              </Box>
                            )}

                            {file.fileType === "IMAGE" && file.url ? (
                              <CardActionArea
                                onClick={() => handleMediaClick(file)}
                              >
                                <Box sx={{ position: "relative" }}>
                                  <CardMedia
                                    component="img"
                                    height="120"
                                    image={file.url}
                                    alt={
                                      file.description || `Image ${index + 1}`
                                    }
                                    sx={{ objectFit: "cover" }}
                                    onError={(e) => {
                                      console.log(
                                        "Image load error:",
                                        file.url
                                      );
                                      e.target.style.display = "none";
                                    }}
                                  />
                                  {hasGeotag && (
                                    <CompactGeotagOverlay
                                      mediaFile={{
                                        ...file,
                                        latitude,
                                        longitude,
                                      }}
                                    />
                                  )}
                                </Box>
                                <CardContent
                                  sx={{ p: 1, pb: "8px !important" }}
                                >
                                  <Typography
                                    variant="body2"
                                    className="media-name"
                                    noWrap
                                  >
                                    {file.description || `Image ${index + 1}`}
                                  </Typography>
                                  {file.source === "field" && (
                                    <Typography
                                      variant="caption"
                                      color="primary"
                                      sx={{ display: "block" }}
                                    >
                                      Field: {file.fieldKey}
                                    </Typography>
                                  )}
                                  {hasGeotag && (
                                    <Typography
                                      variant="caption"
                                      className="media-coordinates"
                                      sx={{ display: "block", mt: 0.5 }}
                                    >
                                      📍 {formatCoordinate(latitude, 4)}°,{" "}
                                      {formatCoordinate(longitude, 4)}°
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block" }}
                                  >
                                    {formatDate(
                                      file.uploadedAt ||
                                        file.uploaded_at ||
                                        new Date()
                                    )}
                                  </Typography>
                                </CardContent>
                              </CardActionArea>
                            ) : file.fileType === "VIDEO" && file.url ? (
                              <CardActionArea
                                onClick={() => handleMediaClick(file)}
                              >
                                <Box sx={{ position: "relative" }}>
                                  <CardMedia
                                    component="div"
                                    height="120"
                                    className="video-thumbnail"
                                  >
                                    <OndemandVideoIcon
                                      sx={{ fontSize: 40, color: "#fff" }}
                                    />
                                    <PlayArrowIcon className="video-play-overlay" />
                                  </CardMedia>
                                  {hasGeotag && (
                                    <CompactGeotagOverlay
                                      mediaFile={{
                                        ...file,
                                        latitude,
                                        longitude,
                                      }}
                                    />
                                  )}
                                </Box>
                                <CardContent
                                  sx={{ p: 1, pb: "8px !important" }}
                                >
                                  <Typography
                                    variant="body2"
                                    className="media-name"
                                    noWrap
                                  >
                                    {file.description || `Video ${index + 1}`}
                                  </Typography>
                                  {file.source === "field" && (
                                    <Typography
                                      variant="caption"
                                      color="primary"
                                      sx={{ display: "block" }}
                                    >
                                      Field: {file.fieldKey}
                                    </Typography>
                                  )}
                                  {hasGeotag && (
                                    <Typography
                                      variant="caption"
                                      className="media-coordinates"
                                      sx={{ display: "block", mt: 0.5 }}
                                    >
                                      📍 {formatCoordinate(latitude, 4)}°,{" "}
                                      {formatCoordinate(longitude, 4)}°
                                    </Typography>
                                  )}
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block" }}
                                  >
                                    {formatDate(
                                      file.uploadedAt ||
                                        file.uploaded_at ||
                                        new Date()
                                    )}
                                  </Typography>
                                </CardContent>
                              </CardActionArea>
                            ) : (
                              <CardContent sx={{ p: 1 }}>
                                <Box className="media-item">
                                  {getFileTypeIcon(file.fileType)}
                                  <Box className="media-info">
                                    <Typography
                                      variant="body2"
                                      className="media-name"
                                    >
                                      {file.description || `File ${index + 1}`}
                                    </Typography>
                                    {file.source === "field" && (
                                      <Typography
                                        variant="caption"
                                        color="primary"
                                        sx={{ display: "block" }}
                                      >
                                        Field: {file.fieldKey}
                                      </Typography>
                                    )}
                                    {hasGeotag && (
                                      <Typography
                                        variant="caption"
                                        className="media-coordinates"
                                        sx={{ display: "block", mt: 0.5 }}
                                      >
                                        📍 {formatCoordinate(latitude, 4)}°,{" "}
                                        {formatCoordinate(longitude, 4)}°
                                      </Typography>
                                    )}
                                    <Typography
                                      variant="caption"
                                      className="media-date"
                                    >
                                      {formatDate(
                                        file.uploadedAt ||
                                          file.uploaded_at ||
                                          new Date()
                                      )}
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
              </Box>
            ) : (
              <Box className="sidebar-section">
                <Typography variant="subtitle2" color="text.secondary">
                  No media files found
                </Typography>
                {survey && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Debug: Survey has{" "}
                    {survey.mediaFiles ? survey.mediaFiles.length : 0}{" "}
                    survey-level media files
                    {survey.fields && (
                      <span>
                        {" "}
                        and{" "}
                        {survey.fields.reduce(
                          (acc, field) =>
                            acc +
                            (field.mediaFiles ? field.mediaFiles.length : 0),
                          0
                        )}{" "}
                        field-level media files
                      </span>
                    )}
                  </Typography>
                )}
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
                        secondary={
                          typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)
                        }
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
                  label={`Status: ${
                    survey.status === 1
                      ? "Active"
                      : survey.status === 2
                      ? "Completed"
                      : "Inactive"
                  }`}
                  color={
                    survey.status === 1
                      ? "primary"
                      : survey.status === 2
                      ? "success"
                      : "default"
                  }
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
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">📷 Media Details & Geotagged Information</Typography>
          <IconButton onClick={handleCloseMediaDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedMedia && survey && (
            <Grid container spacing={3}>
              {/* Media Preview */}
              <Grid xs={12} md={8}>
                <Paper elevation={2} sx={{ p: 2 }}>
                  {selectedMedia.fileType === "IMAGE" ? (
                    <Box>
                      <Box position="relative" sx={{ mb: 2 }}>
                        <img
                          src={selectedMedia.url}
                          alt={selectedMedia.description || "Survey image"}
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
                            <GpsFixedIcon sx={{ color: '#4caf50', fontSize: 18 }} />
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
                        {selectedMedia.fileType?.toUpperCase() || 'IMAGE'} • {selectedMedia.source === "field" ? `Field: ${selectedMedia.fieldKey}` : 'Survey'}
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
                  ) : selectedMedia.fileType === "VIDEO" ? (
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
                            <GpsFixedIcon sx={{ color: '#4caf50', fontSize: 18 }} />
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
                        {selectedMedia.fileType?.toUpperCase() || 'VIDEO'} • {selectedMedia.source === "field" ? `Field: ${selectedMedia.fieldKey}` : 'Survey'}
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
                        <GpsFixedIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                        <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#4caf50' }}>
                          GPS Location
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                        {formatCoordinate(selectedMedia.latitude)}, {formatCoordinate(selectedMedia.longitude)}
                      </Typography>
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
                        <FileIcon fontSize="small" color="action" />
                        <Typography variant="body2">{selectedMedia.fileType?.toUpperCase() || 'Unknown'}</Typography>
                      </Box>
                      {selectedMedia.source === "field" && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <BusinessIcon fontSize="small" color="action" />
                          <Typography variant="body2">Field: {selectedMedia.fieldKey}</Typography>
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

export default SurveySidebar;
