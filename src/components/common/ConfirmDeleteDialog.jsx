import React from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

/**
 * Confirmation before deleting a record. Errors from the delete show inside the dialog.
 */
const ConfirmDeleteDialog = ({
  open,
  title,
  children,
  error,
  deleting = false,
  onCancel,
  onConfirm,
  confirmLabel = "Delete",
  busyLabel = "Deleting…",
}) => (
  <Dialog open={open} onClose={deleting ? undefined : onCancel} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText variant="body2">{children}</DialogContentText>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 1.5 }}>
      <Button onClick={onCancel} color="inherit" disabled={deleting}>
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        color="error"
        variant="contained"
        disabled={deleting}
        startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {deleting ? busyLabel : confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDeleteDialog;
