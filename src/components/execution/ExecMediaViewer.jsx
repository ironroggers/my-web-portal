import React from "react";
import { Box, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { fmtAccuracy, fmtDuration, fmtLatLong, fmtSize, fmtStampTime, isAboveLimit } from "../../utils/executionFormat";
import { mediaSrc, posterSrc } from "./mediaItems";

/**
 * Full-size photo or video with its stamp metadata (lat/long, accuracy, IST time,
 * place, device) and flags. onRetake / onRemove only where it can still change.
 */
const ExecMediaViewer = ({ media, onClose, onRetake, onRemove }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { config } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  if (!media) return null;
  const isVideo = media.fileType === "VIDEO";
  const kept = media.accuracyAboveLimit || (media.locationSource === "GPS" && isAboveLimit(media.accuracy, limit));
  const rows = [
    ["Place", media.place],
    ["Lat / long", fmtLatLong(media.latitude, media.longitude)],
    [
      "Accuracy",
      media.accuracy != null
        ? `${fmtAccuracy(media.accuracy)}${kept ? ` · kept above the ${limit} m limit` : ""}`
        : media.locationSource === "MANUAL"
          ? "Location typed"
          : "—",
    ],
    ["Taken", fmtStampTime(media.capturedAt || media.uploadedAt)],
    ["Device", media.deviceName],
    isVideo ? ["Length", fmtDuration(media.durationSec)] : ["Size", fmtSize(media.sizeBytes)],
  ].filter(([, v]) => v);

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1 }}>{isVideo ? "Video" : "Photo"}</Box>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
          {media.source === "UPLOAD" && <Chip size="small" label="Uploaded" />}
          {media.locationSource === "MANUAL" && <Chip size="small" label="Location typed" color="warning" variant="outlined" />}
          {media.locationSource === "EXIF" && <Chip size="small" label="Location from file" variant="outlined" />}
          {kept && <Chip size="small" label={`Above ${limit} m`} color="warning" />}
        </Stack>
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ bgcolor: "#000", borderRadius: 1, display: "flex", justifyContent: "center", mb: 2 }}>
          {isVideo ? (
            <video src={mediaSrc(media)} poster={posterSrc(media)} controls style={{ maxWidth: "100%", maxHeight: "60vh" }} />
          ) : (
            <img src={mediaSrc(media)} alt={media.place ? `Photo near ${media.place}` : "Photo"} style={{ maxWidth: "100%", maxHeight: "60vh" }} />
          )}
        </Box>
        {rows.map(([label, value]) => (
          <Box key={label} sx={{ display: "flex", gap: 2, py: 0.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", width: 96, flexShrink: 0 }}>
              {label}
            </Typography>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere", color: label === "Accuracy" && kept ? "warning.dark" : "text.primary" }}>
              {value}
            </Typography>
          </Box>
        ))}
        {(onRetake || onRemove) && (
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            {onRemove && (
              <Button variant="outlined" color="inherit" startIcon={<DeleteOutlineIcon />} onClick={onRemove}>
                Remove
              </Button>
            )}
            {onRetake && (
              <Button variant="contained" startIcon={isVideo ? <VideocamOutlinedIcon /> : <PhotoCameraOutlinedIcon />} onClick={onRetake}>
                Retake
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExecMediaViewer;
