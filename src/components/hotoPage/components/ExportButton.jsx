import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TableViewOutlinedIcon from "@mui/icons-material/TableViewOutlined";
import { useState } from "react";
import { exportHotoUtil } from "../../../utils/exportHotoUtil.jsx";
import { HOTO_TYPES } from "../hotoTypes";

const ExportButton = ({ hotos }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleExport = (key) => {
    exportHotoUtil(hotos, key);
    handleClose();
  };

  const countFor = (type) => (hotos || []).filter((hoto) => hoto.hotoType === type).length;

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileDownloadOutlinedIcon />}
        endIcon={<ExpandMoreIcon />}
        onClick={handleClick}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "hoto-export-menu" : undefined}
      >
        Export
      </Button>
      <Menu
        id="hoto-export-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 240 } } }}
      >
        {/* Exporting a type with no records does nothing, so those entries are disabled */}
        {HOTO_TYPES.map(({ value, label }) => (
          <MenuItem key={value} onClick={() => handleExport(value)} disabled={countFor(value) === 0}>
            <ListItemIcon>
              <TableViewOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={`${label} HOTO to Excel`}
              secondary={`${countFor(value)} ${countFor(value) === 1 ? "record" : "records"}`}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ExportButton;
