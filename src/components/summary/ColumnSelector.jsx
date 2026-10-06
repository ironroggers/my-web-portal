import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { ViewColumnOutlined } from "@mui/icons-material";

const ColumnSelector = ({ headers, selectedSheet, onVisibleHeadersChange }) => {
  const [visibleColumns, setVisibleColumns] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);

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

  const visibleCount = visibleHeaders.length;
  const allVisible = visibleCount === headers.length;

  const toggleColumn = (header) => {
    const isVisible = visibleHeaders.includes(header);
    // Keep at least one data column on screen
    if (isVisible && visibleCount === 1) return;
    handleColumnVisibilityChange(
      isVisible
        ? visibleHeaders.filter((h) => h !== header)
        : headers.filter((h) => h === header || visibleHeaders.includes(h))
    );
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ViewColumnOutlined />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-controls={anchorEl ? "column-selector-menu" : undefined}
      >
        Columns{allVisible ? "" : ` (${visibleCount}/${headers.length})`}
      </Button>
      <Menu
        id="column-selector-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.5, maxHeight: 440, minWidth: 280 } } }}
      >
        <Box sx={{ px: 2, py: 0.75, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Typography variant="subtitle2">Visible columns</Typography>
          <Button size="small" onClick={() => handleColumnVisibilityChange(headers)} disabled={allVisible}>
            Show all
          </Button>
        </Box>
        <Divider />
        {headers.map((header) => {
          const checked = visibleHeaders.includes(header);
          return (
            <MenuItem
              key={header}
              dense
              onClick={() => toggleColumn(header)}
              disabled={checked && visibleCount === 1}
            >
              <Checkbox size="small" checked={checked} disableRipple sx={{ p: 0.5, mr: 1 }} />
              <ListItemText primary={header} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default ColumnSelector;
