import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { extractKMLFromKMZ } from "../utils/kmlUtils";

const ReferenceKMLs = ({
  onKMLLoad,
  loadedKMLs,
  onKMLRemove,
  onKMLToggleVisibility,
  routeVisibility,
  setRouteVisibility,
}) => {
  const setOpen = (open) => {
    setRouteVisibility({ ...routeVisibility, addKML: open });
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
    setError(null);

    try {
      const fileName = selectedFile.name.toLowerCase();

      if (fileName.endsWith(".kml")) {
        // Handle KML file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const kmlContent = e.target.result;
            onKMLLoad(selectedFile.name, kmlContent);
            setSelectedFile(null);
            setLoading(false);
          } catch (err) {
            setError("Error reading KML file");
            setLoading(false);
          }
        };
        reader.readAsText(selectedFile);
      } else if (fileName.endsWith(".kmz")) {
        // Handle KMZ file
        const kmlData = await extractKMLFromKMZ(selectedFile);
        onKMLLoad(kmlData.name, kmlData.content);
        setSelectedFile(null);
        setLoading(false);
      }
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

  return (
    <Box sx={{ p: 2 }}>
      <Dialog
        open={routeVisibility.addKML}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload KML/KMZ File</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <input
                type="file"
                accept=".kml,.kmz"
                onChange={handleFileSelect}
                style={{ marginBottom: 16 }}
                disabled={loading}
              />
              <Button
                onClick={handleUpload}
                variant="contained"
                disabled={!selectedFile || loading}
              >
                {loading ? "Processing..." : "Upload"}
              </Button>
            </div>
            {loading && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2">Processing file...</Typography>
              </Box>
            )}
            {loadedKMLs && loadedKMLs.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Loaded KML Files:
                </Typography>
                <List dense>
                  {loadedKMLs.map((kml, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={kml.name}
                        sx={{
                          opacity: kml.visible ? 1 : 0.5,
                          textDecoration: kml.visible ? "none" : "line-through",
                        }}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip
                            title={kml.visible ? "Hide KML" : "Show KML"}
                          >
                            <IconButton
                              edge="end"
                              onClick={() => onKMLToggleVisibility(index)}
                              size="small"
                              color={kml.visible ? "primary" : "default"}
                            >
                              {kml.visible ? (
                                <VisibilityIcon />
                              ) : (
                                <VisibilityOffIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete KML">
                            <IconButton
                              edge="end"
                              onClick={() => onKMLRemove(index)}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReferenceKMLs;
