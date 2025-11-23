import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
} from "@mui/material";

const ConfirmUploadDialog = ({ open, onClose, onConfirm, sheetName }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* <DialogTitle>Confirm Excel Upload</DialogTitle> */}
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This action will completely overwrite all existing data in the
          selected sheet: <strong>{sheetName}</strong>
        </Alert>
        <DialogContentText>
          Are you sure you want to continue? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Yes, Overwrite Data
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmUploadDialog;
