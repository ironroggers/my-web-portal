import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from "@mui/material";
import summaryService from "../../services/summaryService";

const DataModal = ({ open, onClose, editData, sheetName, headers, onSuccess, nextRowNumber }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (editData) {
      // Edit mode - populate with existing data
      setFormData(editData.rowData || {});
    } else {
      // Create mode - initialize empty form with headers
      const initialData = {};
      headers?.forEach((header) => {
        initialData[header] = "";
      });
      setFormData(initialData);
    }
  }, [editData, headers, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editData) {
        // Update existing record
        await summaryService.updateRecord(editData._id, {
          rowData: formData,
        });
      } else {
        // Create new record with next row number
        await summaryService.createRecord({
          sheetName: sheetName,
          rowData: formData,
          rowNumber: nextRowNumber,
        });
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Failed to save data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editData ? "Edit Data" : "Create New Data"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {Object.keys(formData).map((field) => (
            <TextField
              key={field}
              label={field}
              value={formData[field] || ""}
              onChange={(e) => handleChange(field, e.target.value)}
              size="small"
              fullWidth
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataModal;

