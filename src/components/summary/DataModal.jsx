import React, { useState, useEffect } from "react";
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import summaryService from "../../services/summaryService";

const YES_NO_OPTIONS = ["Yes", "No"];

const DataModal = ({ open, onClose, editData, sheetName, headers, onSuccess, nextRowNumber }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Helper function to determine if a field should be a yes/no dropdown
  const isYesNoField = (fieldName, value) => {
    // Check field name for common yes/no words (whole words, so "SNOC" does not match "no")
    const yesNoKeywords = /\b(yes|no|y\/n|yn|boolean|flag|status)\b/i;

    if (yesNoKeywords.test(fieldName)) {
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
    setSaveError(null);
  }, [editData, headers, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveError(null);
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
      setSaveError("Failed to save data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const rowNumber = editData ? editData.rowNumber : nextRowNumber;

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 2, pr: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          {editData ? "Edit record" : "New record"}
          <Typography variant="body2" component="div" sx={{ color: "text.secondary", mt: 0.25 }}>
            {sheetName}
            {rowNumber ? ` · Row ${rowNumber}` : ""}
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={loading} aria-label="Close" size="small">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            pt: 0.5,
          }}
        >
          {Object.keys(formData).map((field) => {
            const isYesNo = isYesNoField(field, formData[field]);

            if (isYesNo) {
              const value = formData[field] ?? "";
              // Keep values that are not Yes/No (e.g. a status) selectable so they are not hidden
              const options =
                value !== "" && !YES_NO_OPTIONS.includes(value) ? [...YES_NO_OPTIONS, value] : YES_NO_OPTIONS;
              return (
                <TextField
                  key={field}
                  select
                  label={field}
                  value={value}
                  onChange={(e) => handleChange(field, e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Not set</em>
                  </MenuItem>
                  {options.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }

            return (
              <TextField
                key={field}
                label={field}
                value={formData[field] ?? ""}
                onChange={(e) => handleChange(field, e.target.value)}
                size="small"
                fullWidth
              />
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {loading ? "Saving…" : editData ? "Save changes" : "Create record"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataModal;
