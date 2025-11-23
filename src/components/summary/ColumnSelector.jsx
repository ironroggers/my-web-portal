import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
} from "@mui/material";

const ColumnSelector = ({ headers, selectedSheet, onVisibleHeadersChange }) => {
  const [visibleColumns, setVisibleColumns] = useState({});

  // Initialize visible columns when sheet or headers change
  useEffect(() => {
    if (headers.length > 0 && selectedSheet) {
      const savedVisibleColumns = localStorage.getItem(
        `visibleColumns_${selectedSheet}`
      );
      if (savedVisibleColumns) {
        setVisibleColumns((prev) => ({
          ...prev,
          [selectedSheet]: JSON.parse(savedVisibleColumns),
        }));
      } else {
        // Default to all columns visible
        setVisibleColumns((prev) => ({
          ...prev,
          [selectedSheet]: headers,
        }));
      }
    }
  }, [headers, selectedSheet]);

  // Calculate visible headers for current sheet
  const visibleHeaders = useMemo(() => {
    if (!selectedSheet || !visibleColumns[selectedSheet]) return headers;
    return headers.filter((header) =>
      visibleColumns[selectedSheet].includes(header)
    );
  }, [headers, visibleColumns, selectedSheet]);

  // Notify parent component whenever visible headers change
  useEffect(() => {
    if (visibleHeaders.length > 0) {
      onVisibleHeadersChange?.(visibleHeaders);
    }
  }, [visibleHeaders, onVisibleHeadersChange]);

  const handleColumnVisibilityChange = (selectedHeaders) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [selectedSheet]: selectedHeaders,
    }));
    // Save to localStorage
    localStorage.setItem(
      `visibleColumns_${selectedSheet}`,
      JSON.stringify(selectedHeaders)
    );
  };

  if (!headers || headers.length === 0) {
    return null;
  }

  const currentVisibleColumns = visibleColumns[selectedSheet] || headers;

  return (
    <Box sx={{ mb: 2 }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Visible Columns</InputLabel>
        <Select
          multiple
          value={currentVisibleColumns}
          onChange={(e) => handleColumnVisibilityChange(e.target.value)}
          input={<OutlinedInput label="Visible Columns" />}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {headers.map((header) => (
            <MenuItem key={header} value={header}>
              <Checkbox checked={currentVisibleColumns.indexOf(header) > -1} />
              <ListItemText primary={header} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default ColumnSelector;
