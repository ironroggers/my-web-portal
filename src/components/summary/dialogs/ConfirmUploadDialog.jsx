import React from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
} from "@mui/material";
import { InsertDriveFileOutlined, WarningAmberRounded } from "@mui/icons-material";

const ConfirmUploadDialog = ({ open, onClose, onConfirm, sheetName, fileName }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <WarningAmberRounded sx={{ color: "warning.main" }} />
        Replace sheet data?
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" icon={false} sx={{ mb: 2 }}>
          This action will completely overwrite all existing data in the
          selected sheet: <strong>{sheetName}</strong>
        </Alert>
        {fileName && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              px: 1.5,
              py: 1,
              border: 1,
              borderColor: "divider",
              borderRadius: 1.5,
              fontSize: "0.875rem",
              wordBreak: "break-all",
            }}
          >
            <InsertDriveFileOutlined fontSize="small" sx={{ color: "text.secondary" }} />
            {fileName}
          </Box>
        )}
        <DialogContentText variant="body2">
          Are you sure you want to continue? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Yes, overwrite data
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmUploadDialog;
