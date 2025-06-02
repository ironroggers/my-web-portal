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
  Link,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ImageIcon from "@mui/icons-material/Image";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PublicIcon from "@mui/icons-material/Public";
import { formatKey, formatValue } from "./utils";
import { useState } from "react";

// Helper function to format coordinates with precision
const formatCoordinate = (coordinate, precision = 6) => {
  return typeof coordinate === "number" ? coordinate.toFixed(precision) : "N/A";
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
        bgcolor: "rgba(0, 0, 0, 0.6)",
        color: "white",
        p: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <LocationOnIcon fontSize="small" />
        <Typography variant="caption">
          {formatCoordinate(mediaFile.latitude)}°,{" "}
          {formatCoordinate(mediaFile.longitude)}°
        </Typography>
      </Box>
      {mediaFile.accuracy && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
          <PublicIcon sx={{ fontSize: "0.8rem" }} />
          <Typography variant="caption">
            Accuracy: ±{mediaFile.accuracy}m
          </Typography>
        </Box>
      )}
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
        <DialogContent sx={{ p: 0, position: "relative" }}>
          <IconButton
            onClick={handleCloseDialog}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "white",
              bgcolor: "rgba(0, 0, 0, 0.5)",
              "&:hover": {
                bgcolor: "rgba(0, 0, 0, 0.7)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          {selectedMedia && (
            <Box sx={{ width: "100%", bgcolor: "black", position: "relative" }}>
              {selectedMedia.fileType?.toUpperCase() === "IMAGE" ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.description}
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: "90vh",
                    objectFit: "contain",
                  }}
                />
              ) : (
                selectedMedia.fileType?.toUpperCase() === "VIDEO" && (
                  <video
                    src={selectedMedia.url}
                    controls
                    style={{ width: "100%", height: "auto", maxHeight: "90vh" }}
                  />
                )
              )}
              {selectedMedia.latitude && selectedMedia.longitude && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    p: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Location: {selectedMedia.place || "Unknown Location"}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="caption">
                      {formatCoordinate(selectedMedia.latitude)}°,{" "}
                      {formatCoordinate(selectedMedia.longitude)}°
                    </Typography>
                    {selectedMedia.accuracy && (
                      <Typography variant="caption">
                        Accuracy: ±{selectedMedia.accuracy}m
                      </Typography>
                    )}
                    {selectedMedia.deviceName && (
                      <Typography variant="caption">
                        Device: {selectedMedia.deviceName}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaFilesSidePanel;
