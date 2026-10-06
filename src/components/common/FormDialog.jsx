import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";

/**
 * Shell for add/edit forms (HOTO, sections, subsections): title and subtitle,
 * scrolling form body, and a footer with the save error and actions.
 * Full screen on phones.
 */
const FormDialog = ({
  open,
  onClose,
  title,
  subtitle,
  saving = false,
  savingLabel = "Saving…",
  submitLabel,
  submitDisabled = false,
  onSubmit,
  error,
  onDismissError,
  maxWidth = "md",
  children,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={fullScreen}
      scroll="paper"
    >
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {title}
          {subtitle && (
            <Typography variant="body2" component="div" sx={{ color: "text.secondary", mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} disabled={saving} aria-label="Close" size="small" sx={{ mt: -0.5, mr: -1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        {children}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, flexWrap: "wrap", rowGap: 1.5 }}>
        {error && (
          <Alert severity="error" onClose={onDismissError} sx={{ flex: "1 1 100%", m: "0 !important" }}>
            {error}
          </Alert>
        )}
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={saving || submitDisabled}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? savingLabel : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormDialog;
