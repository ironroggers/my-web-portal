import React, { useState, useRef, useCallback } from "react";
import {
  Box,
  TableCell,
  IconButton,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Search } from "@mui/icons-material";

const HeaderCell = ({ label, onSearch, searchValue, width, onResize }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const cellRef = useRef(null);

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
    <TableCell
      ref={cellRef}
      sx={{
        width: width || 200,
        minWidth: width || 200,
        maxWidth: width || 200,
        p: 0,
        position: "relative",
        userSelect: isResizing ? "none" : "auto",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          height: 56,
          px: 2,
        }}
      >
        <Box
          sx={{
            flex: 1,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Box>
        <IconButton
          size="small"
          onClick={() => setShowSearch(true)}
          sx={{ flexShrink: 0 }}
        >
          <Search fontSize="small" />
        </IconButton>
      </Box>

      {/* Resize Handle */}
      <Box
        sx={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "8px",
          cursor: "col-resize",
          backgroundColor: isResizing ? "primary.main" : "rgba(0, 0, 0, 0.08)",
          borderRight: isResizing ? "2px solid" : "1px solid",
          borderRightColor: isResizing ? "primary.main" : "rgba(0, 0, 0, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": {
            backgroundColor: "primary.main",
            opacity: 0.4,
            boxShadow: "0 0 4px rgba(25, 118, 210, 0.3)",
            "&::before": {
              backgroundColor: "primary.main",
            },
          },
          "&::before": {
            content: '""',
            width: "2px",
            height: "60%",
            backgroundColor: isResizing ? "white" : "rgba(0, 0, 0, 0.3)",
            borderRadius: "1px",
            transition: "background-color 0.1s ease",
          },
          zIndex: 1,
          transition: "all 0.1s ease",
        }}
        onMouseDown={handleMouseDown}
      />

      {showSearch && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 2,
            bgcolor: "background.paper",
          }}
        >
          <TextField
            size="small"
            value={searchValue}
            onChange={(e) => onSearch(label, e.target.value)}
            placeholder="Search..."
            autoFocus
            onBlur={() => !searchValue && setShowSearch(false)}
            style={{ height: "100%" }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowSearch(false)}>
                    ✕
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ width: "100%" }}
          />
        </Box>
      )}
    </TableCell>
  );
};

export default HeaderCell;
