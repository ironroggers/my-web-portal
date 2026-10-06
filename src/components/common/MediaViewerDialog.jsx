import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useReverseGeocode from "../../hooks/useReverseGeocode";
import {
  formatMediaDate,
  getCoordinates,
  getMediaCapturedAt,
  getMediaKind,
  googleMapsUrl,
} from "../../utils/mediaUtils";

const DetailRow = ({ label, value }) =>
  value ? (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75 }}>
      <Typography variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: "right", overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </Box>
  ) : null;

/**
 * Full-size view of a survey photo or video with its location and capture details.
 * `subtitle` says where the file belongs (e.g. the field it was attached to).
 */
const MediaViewerDialog = ({ media, subtitle, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [showTechnical, setShowTechnical] = useState(false);
  const coordinates = getCoordinates(media);
  // Only look the address up when the record doesn't carry one
  const needsLookup = Boolean(coordinates && !media?.place);
  const geocoded = useReverseGeocode(needsLookup ? coordinates.latitude : null, needsLookup ? coordinates.longitude : null);

  if (!media) return null;

  const kind = getMediaKind(media.fileType);
  const place = media.place || geocoded;
  const accuracy = media.accuracy ? `±${Math.round(Number.parseFloat(media.accuracy))} m` : null;
  const technical = media.metadata || media.exifData;

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {media.description || (kind === "video" ? "Video" : kind === "image" ? "Photo" : "File")}
          {subtitle && (
            <Typography variant="body2" component="div" sx={{ color: "text.secondary", mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ mt: -0.5, mr: -1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ bgcolor: "grey.900", borderRadius: 1.5, overflow: "hidden", display: "grid", placeItems: "center", minHeight: 240 }}>
              {kind === "image" && media.url ? (
                <Box component="img" src={media.url} alt={media.description || "Survey photo"} sx={{ width: "100%", maxHeight: "65vh", objectFit: "contain", display: "block" }} />
              ) : kind === "video" && media.url ? (
                <Box component="video" src={media.url} controls sx={{ width: "100%", maxHeight: "65vh", display: "block" }} />
              ) : (
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 48, color: "grey.500" }} />
              )}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="overline" component="h3" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Location
            </Typography>
            {coordinates ? (
              <>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {place || "Address not available"}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
                  {coordinates.latitude}, {coordinates.longitude}
                  {accuracy && ` (${accuracy})`}
                </Typography>
                {media.altitude && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Altitude {media.altitude} m
                  </Typography>
                )}
                <Link
                  href={googleMapsUrl(coordinates.latitude, coordinates.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  sx={{ display: "inline-block", mt: 0.75, fontWeight: 600 }}
                >
                  Open in Google Maps
                </Link>
              </>
            ) : (
              <Alert severity="info" icon={false} sx={{ mt: 1 }}>
                No GPS location recorded for this file.
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="overline" component="h3" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Capture
            </Typography>
            <DetailRow label="Type" value={kind === "file" ? media.fileType : kind === "image" ? "Photo" : "Video"} />
            <DetailRow label="Captured" value={formatMediaDate(getMediaCapturedAt(media))} />
            <DetailRow label="Device" value={media.deviceName || media.deviceInfo} />
            {media.url && (
              <Button
                startIcon={<OpenInNewIcon />}
                variant="outlined"
                size="small"
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mt: 2 }}
              >
                Open original
              </Button>
            )}

            {technical && (
              <>
                <Divider sx={{ my: 2 }} />
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setShowTechnical((open) => !open)}
                  endIcon={<ExpandMoreIcon sx={{ transform: showTechnical ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />}
                  aria-expanded={showTechnical}
                  sx={{ ml: -1 }}
                >
                  Technical data
                </Button>
                <Collapse in={showTechnical}>
                  <Box
                    component="pre"
                    sx={{ m: 0, mt: 1, p: 1.5, maxHeight: 220, overflow: "auto", fontSize: "0.75rem", bgcolor: "background.default", borderRadius: 1, whiteSpace: "pre-wrap" }}
                  >
                    {JSON.stringify(technical, null, 2)}
                  </Box>
                </Collapse>
              </>
            )}
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default MediaViewerDialog;
