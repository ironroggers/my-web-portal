import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import FormField from "./FormField";
import { useRef } from "react";
import EXIF from "exif-js";

const MediaForm = ({ media, onChange, onDelete, index }) => {
  const fileInputRef = useRef(null);
  const timeoutRef = useRef(null);

  const getImageMetadata = (file) => {
    return new Promise((resolve) => {
      EXIF.getData(file, function () {
        const exifData = EXIF.getAllTags(this);
        if (exifData && exifData.GPSLatitude && exifData.GPSLongitude) {
          // Convert GPS coordinates to decimal format
          const latitude =
            exifData.GPSLatitude[0] +
            exifData.GPSLatitude[1] / 60 +
            exifData.GPSLatitude[2] / 3600;
          const longitude =
            exifData.GPSLongitude[0] +
            exifData.GPSLongitude[1] / 60 +
            exifData.GPSLongitude[2] / 3600;

          // Apply negative sign for South and West
          const finalLatitude =
            exifData.GPSLatitudeRef === "S" ? -latitude : latitude;
          const finalLongitude =
            exifData.GPSLongitudeRef === "W" ? -longitude : longitude;

          resolve({
            latitude: finalLatitude.toString(),
            longitude: finalLongitude.toString(),
            place: exifData.GPSAreaInformation || "",
          });
        } else {
          resolve(null);
        }
      });
    });
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
    if (!file) return;

    // Create object URL for preview
    const url = URL.createObjectURL(file);

    // Get file type from file
    const fileType = file.type;

    // Get location from file metadata first
    let latitude = "";
    let longitude = "";
    let place = "";

    if (file.type.startsWith("image/")) {
      const metadata = await getImageMetadata(file);
      if (metadata) {
        ({ latitude, longitude, place } = metadata);
      }
    }

    // If no metadata location, try getting current location
    if (!latitude || !longitude) {
      try {
        const position = await getCurrentPosition();
        latitude = position.coords.latitude.toString();
        longitude = position.coords.longitude.toString();
        place = await getPlaceFromCoordinates(latitude, longitude);
      } catch (error) {
        console.log("Location not available");
      }
    }

    // Get device info
    const deviceName = navigator.userAgent;
    const accuracy = ""; // This would come from geolocation if needed

    onChange(index, {
      ...media,
      url,
      fileType,
      latitude,
      longitude,
      deviceName,
      accuracy,
      place,
      source: "web",
      file, // Store the actual file object for later upload
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        flexWrap: "wrap",
        width: "100%",
        my: 1,
        alignItems: "center",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1,
        mb: 1,
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept="image/*,video/*"
      />
      <Button
        variant="outlined"
        onClick={() => fileInputRef.current?.click()}
        sx={{ minWidth: "200px" }}
      >
        {media.url ? "Change File" : "Choose File"}
      </Button>
      {media.url && (
        <Button
          variant="outlined"
          color="error"
          onClick={() => onDelete(index)}
          sx={{
            outline: "none",
            "&:hover": {
              backgroundColor: "error.main",
              color: "white",
            },
            "&:focus": {
              outline: "none",
            },
          }}
        >
          Delete Media
        </Button>
      )}

      {media.url && (
        <>
          <FormField label="File Type" value={media.fileType || ""} disabled />
          <FormField
            label="Description"
            value={media.description || ""}
            onChange={(e) =>
              onChange(index, { ...media, description: e.target.value })
            }
          />
          <FormField
            label="Latitude"
            value={media.latitude || ""}
            onChange={async (e) => {
              const newLat = e.target.value;
              let newPlace = "loading...";
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              timeoutRef.current = setTimeout(async () => {
                newPlace = await getPlaceFromCoordinates(
                  newLat,
                  media.longitude
                );
                onChange(index, {
                  ...media,
                  place: newPlace,
                });
              }, 1000);
              onChange(index, {
                ...media,
                latitude: newLat,
                place: newPlace,
              });
            }}
          />
          <FormField
            label="Longitude"
            value={media.longitude || ""}
            onChange={async (e) => {
              const newLong = e.target.value;
              let newPlace = "loading...";
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              timeoutRef.current = setTimeout(async () => {
                newPlace = await getPlaceFromCoordinates(
                  media.latitude,
                  newLong
                );
                onChange(index, {
                  ...media,
                  place: newPlace,
                });
              }, 1000);
              onChange(index, {
                ...media,
                longitude: newLong,
                place: newPlace,
              });
            }}
          />
          <FormField
            label="Device Name"
            value={media.deviceName || ""}
            disabled
          />
          <FormField label="Place" value={media.place || ""} disabled />
          <FormControl fullWidth size="small" disabled>
            <InputLabel>Source</InputLabel>
            <Select value={media.source || "web"} label="Source">
              <MenuItem value="mobile">Mobile</MenuItem>
              <MenuItem value="web">Web</MenuItem>
            </Select>
          </FormControl>
        </>
      )}
    </Box>
  );
};

export default MediaForm;
