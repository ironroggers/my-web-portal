import { Box, Button, CircularProgress, IconButton, Tooltip, Typography } from "@mui/material";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FormField from "./FormField";
import { useRef, useState } from "react";
import * as exifr from "exifr";

const getFileName = (media) => {
  if (media.file?.name) return media.file.name;
  if (!media.url) return null;
  try {
    return decodeURIComponent(new URL(media.url).pathname.split("/").pop()) || media.url;
  } catch {
    return media.url;
  }
};

const MediaForm = ({ media, onChange, onDelete, index }) => {
  const fileInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const [reading, setReading] = useState(false);

  // Async callbacks (place lookup, file reading) must merge into the latest
  // media and call the latest onChange, or they undo edits made meanwhile
  const latest = useRef({ media, onChange });
  latest.current = { media, onChange };
  const update = (changes) => latest.current.onChange(index, { ...latest.current.media, ...changes });

  const getImageMetadata = async (file) => {
    try {
      const exifData = await exifr.parse(file, {
        pick: [
          "GPSLatitude",
          "GPSLongitude",
          "GPSLatitudeRef",
          "GPSLongitudeRef",
          "GPSAreaInformation",
        ],
      });

      if (exifData && exifData.GPSLatitude && exifData.GPSLongitude) {
        // Apply negative sign for South and West
        const finalLatitude =
          exifData.GPSLatitudeRef === "S"
            ? -exifData.GPSLatitude
            : exifData.GPSLatitude;
        const finalLongitude =
          exifData.GPSLongitudeRef === "W"
            ? -exifData.GPSLongitude
            : exifData.GPSLongitude;

        return {
          latitude: finalLatitude.toString(),
          longitude: finalLongitude.toString(),
          place: exifData.GPSAreaInformation || "",
        };
      }
      return null;
    } catch (error) {
      console.error("Error reading EXIF data:", error);
      return null;
    }
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  };

  const getPlaceFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || "";
    } catch (error) {
      console.error("Error fetching place name:", error);
      return "";
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    // Allow choosing the same file again after removing it
    event.target.value = "";
    if (!file) return;

    setReading(true);

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    const fileType = file.type;

    // Location from the file's metadata first
    let latitude = "";
    let longitude = "";
    let place = "";

    if (file.type.startsWith("image/")) {
      const metadata = await getImageMetadata(file);
      if (metadata) {
        ({ latitude, longitude, place } = metadata);
      }
    }

    // If the file has no location, fall back to this device's location
    if (!latitude || !longitude) {
      try {
        const position = await getCurrentPosition();
        latitude = position.coords.latitude.toString();
        longitude = position.coords.longitude.toString();
        place = await getPlaceFromCoordinates(latitude, longitude);
      } catch {
        // Location not available; the fields stay empty for manual entry
      }
    }

    setReading(false);
    update({
      url,
      fileType,
      latitude,
      longitude,
      deviceName: navigator.userAgent,
      accuracy: "",
      place,
      source: "web",
      file, // Uploaded when the HOTO is saved
    });
  };

  // Look the place up again a second after the coordinates stop changing
  const handleCoordinateChange = (name) => (event) => {
    const coordinates = {
      latitude: latest.current.media.latitude,
      longitude: latest.current.media.longitude,
      [name]: event.target.value,
    };
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const place = await getPlaceFromCoordinates(coordinates.latitude, coordinates.longitude);
      update({ place });
    }, 1000);
    update({ [name]: event.target.value, place: "loading..." });
  };

  const fileName = getFileName(media);
  const isImage = media.fileType?.startsWith("image/");
  const isVideo = media.fileType?.startsWith("video/");
  const number = index + 1;

  return (
    <Box sx={{ p: 1.25, border: 1, borderColor: "divider", borderRadius: 1.5, bgcolor: "background.paper" }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept="image/*,video/*"
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: 1,
            overflow: "hidden",
            bgcolor: "action.hover",
            color: "text.secondary",
          }}
        >
          {reading ? (
            <CircularProgress size={18} />
          ) : isImage && media.url ? (
            <Box component="img" src={media.url} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : isVideo ? (
            <VideocamOutlinedIcon fontSize="small" />
          ) : (
            <ImageOutlinedIcon fontSize="small" />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap title={fileName || undefined} sx={{ fontWeight: fileName ? 600 : 400, color: fileName ? "text.primary" : "text.secondary" }}>
            {reading ? "Reading file…" : fileName || "No file chosen"}
          </Typography>
          {media.url && (
            <Typography variant="caption" noWrap component="div" sx={{ color: "text.secondary" }}>
              {[media.fileType, media.source === "mobile" ? "From mobile app" : "From web"].filter(Boolean).join(" · ")}
            </Typography>
          )}
        </Box>

        <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={reading} sx={{ flexShrink: 0 }}>
          {media.url ? "Replace" : "Choose file"}
        </Button>
        <Tooltip title="Remove media">
          <IconButton
            size="small"
            onClick={() => onDelete(index)}
            aria-label={`Remove media ${number}`}
            sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {media.url && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.5, mt: 1.5 }}>
          <FormField
            label="Description"
            value={media.description || ""}
            onChange={(e) => update({ description: e.target.value })}
            span
          />
          <FormField
            label="Latitude"
            value={media.latitude || ""}
            onChange={handleCoordinateChange("latitude")}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
          <FormField
            label="Longitude"
            value={media.longitude || ""}
            onChange={handleCoordinateChange("longitude")}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
          <FormField
            label="Place"
            value={media.place === "loading..." ? "Looking up…" : media.place || ""}
            span
            slotProps={{ input: { readOnly: true } }}
            helperText="Filled in from the coordinates"
          />
        </Box>
      )}
    </Box>
  );
};

export default MediaForm;
