import React, { useState, useCallback } from "react";
import {
  Box,
  TableCell,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Close, Search } from "@mui/icons-material";

/**
 * Column header with an inline filter box and, when `onResize` is given,
 * a drag handle on its right edge.
 */
const HeaderCell = ({ label, onSearch, searchValue, width, onResize }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const isFiltered = Boolean(searchValue);

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      setIsResizing(true);
      setStartX(e.clientX);
      setStartWidth(width);
    },
    [width]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing) return;
      const diff = e.clientX - startX;
      const newWidth = startWidth + diff;
      onResize(newWidth);
    },
    [isResizing, startX, startWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add global mouse event listeners when resizing
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    // Sticky header cells are already positioned, so the overlay and handle anchor to them.
    <TableCell
      sx={{
        width: width || 200,
        p: 0,
        userSelect: isResizing ? "none" : "auto",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: 40, pl: 1.5, pr: 1 }}>
        <Box
          title={label}
          sx={{
            flex: 1,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Box>
        <Tooltip title={isFiltered ? `Filtered: "${searchValue}"` : `Filter ${label}`}>
          <IconButton
            size="small"
            onClick={() => setShowSearch(true)}
            aria-label={`Filter ${label}`}
            sx={{
              flexShrink: 0,
              p: 0.5,
              color: isFiltered ? "primary.main" : "text.disabled",
              bgcolor: (theme) => (isFiltered ? alpha(theme.palette.primary.main, 0.1) : "transparent"),
            }}
          >
            <Search sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Resize Handle */}
      {onResize && (
        <Box
          onMouseDown={handleMouseDown}
          aria-hidden
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 8,
            cursor: "col-resize",
            zIndex: 1,
            "&::after": {
              content: '""',
              position: "absolute",
              top: 8,
              bottom: 8,
              right: 2,
              width: 2,
              borderRadius: 1,
              bgcolor: isResizing ? "primary.main" : "transparent",
            },
            "&:hover::after": { bgcolor: "primary.light" },
          }}
        />
      )}

      {showSearch && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            px: 0.75,
            bgcolor: "background.paper",
          }}
        >
          <TextField
            size="small"
            fullWidth
            value={searchValue}
            onChange={(e) => onSearch(label, e.target.value)}
            placeholder={`Filter ${label}`}
            autoFocus
            onBlur={() => !searchValue && setShowSearch(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowSearch(false);
            }}
            slotProps={{
              input: {
                sx: { fontSize: "0.8125rem", height: 30, pr: 0.5 },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Close filter" onClick={() => setShowSearch(false)}>
                      <Close sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      )}
    </TableCell>
  );
};

export default HeaderCell;
