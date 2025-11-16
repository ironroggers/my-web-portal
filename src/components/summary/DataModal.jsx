import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";
import summaryService from "../../services/summaryService";

const DataModal = ({ open, onClose, editData, sheetName, headers, onSuccess, nextRowNumber }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Helper function to determine if a field should be a yes/no dropdown
  const isYesNoField = (fieldName, value) => {
    // Check field name for common yes/no patterns
    const yesNoKeywords = ['yes', 'no', 'y/n', 'yn', 'boolean', 'flag', 'status'];
    const fieldLower = fieldName.toLowerCase();

    if (yesNoKeywords.some(keyword => fieldLower.includes(keyword))) {
      return true;
    }

    // Check if current value is yes/no like
    if (value) {
      const valueLower = value.toString().toLowerCase();
      return ['yes', 'no', 'true', 'false', '1', '0'].includes(valueLower);
    }

    return false;
  };

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
          {Object.keys(formData).map((field) => {
            const isYesNo = isYesNoField(field, formData[field]);

            if (isYesNo) {
              return (
                <FormControl key={field} size="small" fullWidth>
                  <InputLabel>{field}</InputLabel>
                  <Select
                    value={formData[field] || ""}
                    label={field}
                    onChange={(e) => handleChange(field, e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Select...</em>
                    </MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              );
            }

            return (
              <TextField
                key={field}
                label={field}
                value={formData[field] || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                size="small"
                fullWidth
              />
            );
          })}
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

