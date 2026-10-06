import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { ErrorOutline } from "@mui/icons-material";

const ErrorDialog = ({ open, onClose, message }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <ErrorOutline sx={{ color: "error.main" }} />
        Upload failed
      </DialogTitle>
      <DialogContent>
        <DialogContentText variant="body2" sx={{ whiteSpace: "pre-line" }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="primary" variant="contained">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorDialog;
