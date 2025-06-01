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

const MediaForm = ({ media, onChange, onDelete, index }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create object URL for preview
    const url = URL.createObjectURL(file);

    // Get file type from file
    const fileType = file.type;

    // Get location if available
    let latitude = "";
    let longitude = "";
    let place = "";

    try {
      const position = await getCurrentPosition();
      latitude = position.coords.latitude.toString();
      longitude = position.coords.longitude.toString();
      // You might want to use a geocoding service here to get place name
      place = "Current Location"; // Placeholder
    } catch (error) {
      console.log("Location not available");
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

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
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
          <FormField label="Latitude" value={media.latitude || ""} disabled />
          <FormField label="Longitude" value={media.longitude || ""} disabled />
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
