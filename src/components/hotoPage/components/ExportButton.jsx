import { Button, Menu, MenuItem, Box, Typography } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useState } from "react";
import { exportHotoUtil } from "../../../utils/exportHotoUtil.jsx";

// Default export items (can be overridden via props)
const DEFAULT_OPTIONS = [
  { key: "block", label: "Export Block To Excel", color: "primary" },
  { key: "gp", label: "Export GP To Excel", color: "primary" },
  { key: "ofc", label: "Export OFC To Excel", color: "primary" },
];

const ExportButton = ({ hotos }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleExport = (key) => {
    exportHotoUtil(hotos, key);
    handleClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        color="success"
        startIcon={<FileDownloadIcon />}
        onClick={handleClick}
        sx={{ borderRadius: "8px", fontWeight: 500, flex: 1 }}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderRadius: "8px",
            mt: 1,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          },
        }}
      >
        {DEFAULT_OPTIONS.map(({ key, label, color }) => (
          <MenuItem
            key={key}
            onClick={() => handleExport(key)}
            sx={{ py: 1.5, px: 3 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <FileDownloadIcon color={color || "primary"} />
              <Typography>{label}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ExportButton;
