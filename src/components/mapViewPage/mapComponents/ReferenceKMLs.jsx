import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  DeleteOutline as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
  UploadFileOutlined as UploadFileIcon,
  InsertDriveFileOutlined as FileIcon,
} from "@mui/icons-material";
import { extractKMLFromKMZ } from "../utils/kmlUtils";
import { handleKMLUpload, handleKMLDelete } from "../utils/handleKMLUpload";

const ReferenceKMLs = ({
  onKMLLoad,
  loadedKMLs,
  onKMLRemove,
  onKMLToggleVisibility,
  routeVisibility,
  setRouteVisibility,
  selectedLocations,
  refreshLocations,
  loading,
  setLoading,
  refreshKMLs,
}) => {
  const setOpen = (open) => {
    setRouteVisibility({ ...routeVisibility, addKML: open });
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".kml") || fileName.endsWith(".kmz")) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError("Please select a valid KML or KMZ file");
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const newKmls = await handleKMLUpload(
        selectedFile,
        selectedLocations[0].location._id
      );
      await refreshLocations();
      setLoading(false);
      setSelectedFile(null);
      refreshKMLs(newKmls);
    } catch (err) {
      setError(err.message || "Error processing file");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setError(null);
    setLoading(false);
  };

  const deleteKML = async (index) => {
    await handleKMLDelete(selectedLocations[0].location._id, index);
    refreshKMLs(loadedKMLs.filter((_, i) => i !== index));
    await refreshLocations();
  };

  const fileInputId = "reference-kml-file";
  const locationName = selectedLocations[0]?.location?.block;

  return (
    <Dialog open={routeVisibility.addKML} onClose={loading ? undefined : handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          KML layers
          <Typography variant="body2" component="div" sx={{ color: "text.secondary", mt: 0.25 }}>
            Reference routes drawn on the map{locationName ? ` for ${locationName}` : ""}. Upload KML or KMZ files.
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={loading} aria-label="Close" size="small" sx={{ mt: -0.5, mr: -1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            p: 1.5,
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: "background.default",
          }}
        >
          <input
            id={fileInputId}
            type="file"
            accept=".kml,.kmz"
            onChange={handleFileSelect}
            disabled={loading}
            style={{ display: "none" }}
          />
          <Button component="label" htmlFor={fileInputId} variant="outlined" size="small" startIcon={<FileIcon />} disabled={loading}>
            Choose file
          </Button>
          <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 120, color: selectedFile ? "text.primary" : "text.secondary" }}>
            {selectedFile ? selectedFile.name : "No file chosen"}
          </Typography>
          <Button
            onClick={handleUpload}
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <UploadFileIcon />}
            disabled={!selectedFile || loading}
          >
            {loading ? "Processing…" : "Upload"}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1 }}>
          Loaded layers
        </Typography>
        {loadedKMLs && loadedKMLs.length > 0 ? (
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5 }}>
            {loadedKMLs.map((kml, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  pl: 1.5,
                  pr: 0.5,
                  py: 0.5,
                  "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" },
                }}
              >
                <Typography
                  variant="body2"
                  noWrap
                  title={kml.name}
                  sx={{ flex: 1, minWidth: 0, color: kml.visible ? "text.primary" : "text.disabled" }}
                >
                  {kml.name}
                </Typography>
                <Tooltip title={kml.visible ? "Hide on map" : "Show on map"}>
                  <IconButton
                    onClick={() => onKMLToggleVisibility(index)}
                    size="small"
                    aria-label={`${kml.visible ? "Hide" : "Show"} ${kml.name}`}
                    sx={{ color: kml.visible ? "primary.main" : "text.secondary" }}
                  >
                    {kml.visible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete layer">
                  <IconButton
                    onClick={() => deleteKML(index)}
                    size="small"
                    aria-label={`Delete ${kml.name}`}
                    sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No KML layers for this location yet.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={handleClose} disabled={loading} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReferenceKMLs;
