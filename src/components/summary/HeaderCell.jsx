import React, { useState } from "react";
import {
  Box,
  TableCell,
  IconButton,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Search } from "@mui/icons-material";

const HeaderCell = ({ label, onSearch, searchValue }) => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <TableCell
      sx={{ minWidth: 180, maxWidth: 250, p: 0, position: "relative" }}
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
