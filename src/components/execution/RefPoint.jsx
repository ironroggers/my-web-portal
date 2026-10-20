import React, { useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { distanceM, fmtDistance, pointOf, tapeMismatch } from "../../utils/executionFormat";
import ChipGroup from "./ChipGroup";
import GpsField from "./GpsField";
import { refDone, refMissing, validateRef } from "./executionLogic";
import { showToast } from "./toast";
import { tint } from "./execSx";

// "GPS distance ≈ 5.4 m", warning when the tape value is far off
export const GpsHint = ({ pit, refPoint }) => {
  const { config } = useExecutionConfig();
  const a = pointOf(pit);
  const b = pointOf(refPoint);
  if (!a || !b) {
    return (
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Capture GPS here to cross-check the tape distance
      </Typography>
    );
  }
  const gps = distanceM(a, b);
  const off = refPoint.tapeDistanceM !== "" && tapeMismatch(refPoint.tapeDistanceM, gps, config?.tapeMismatch);
  return (
    <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: off ? "warning.dark" : "text.secondary", fontWeight: off ? 600 : 400 }}>
      {off ? <WarningAmberIcon sx={{ fontSize: 14 }} /> : <GpsFixedIcon sx={{ fontSize: 14 }} />}
      GPS distance ≈ {fmtDistance(gps)}
      {off ? " · check the tape value" : ""}
    </Typography>
  );
};

/** Row in the pit card: "Electric pole · 5.5 m from the pit · GPS ±1.0 m" */
export const RefRow = ({ refPoint, index, onClick, bad }) => {
  const ok = refDone(refPoint);
  const missing = refMissing(refPoint);
  const meta = ok
    ? `${fmtDistance(refPoint.tapeDistanceM)} from the pit · GPS ±${Number(refPoint.accuracy ?? 0).toFixed(1)} m`
    : missing.length === 3
      ? "Not added yet"
      : `Missing ${missing.join(", ")}`;
  const content = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", py: 1.25, textAlign: "left" }}>
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 700,
          border: 1,
          ...(ok ? { bgcolor: "success.main", borderColor: "success.main", color: "#fff" } : { borderColor: "divider", color: "text.secondary" }),
        }}
      >
        {ok ? <CheckIcon sx={{ fontSize: 16 }} /> : index + 1}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {refPoint?.description || `Reference point ${index + 1}`}
        </Typography>
        <Typography variant="caption" sx={{ color: bad ? "error.main" : "text.secondary" }}>
          {meta}
        </Typography>
      </Box>
      {onClick && (
        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
          {ok ? "Edit" : missing.length === 3 ? "Add" : "Finish"}
        </Typography>
      )}
    </Box>
  );
  return onClick ? (
    <ButtonBase onClick={onClick} sx={{ width: "100%", borderTop: 1, borderColor: "divider", bgcolor: bad ? tint("error", 0.04) : "transparent" }}>
      {content}
    </ButtonBase>
  ) : (
    <Box sx={{ borderTop: 1, borderColor: "divider" }}>{content}</Box>
  );
};

/**
 * One reference point at a time (a dialog; a right-side drawer on wide screens).
 * Saving checks only this point. value / onChange: the point being edited.
 */
export const RefPointDialog = ({ open, index, value, onChange, pit, pitLabel, subName, onSave, onClose }) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("md"));
  const { config } = useExecutionConfig();
  const [errors, setErrors] = useState({});
  const r = value || {};
  const set = (key, v) => {
    onChange({ ...r, [key]: v });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = () => {
    const e = validateRef(r);
    setErrors(e);
    if (Object.keys(e).length) {
      showToast("Fill the highlighted fields", "error");
      return;
    }
    onSave(r);
    showToast(`Reference point ${index + 1} saved`);
  };

  const title = `Reference point ${index + 1} of 3`;
  const subtitle = [pitLabel, subName].filter(Boolean).join(" · ");
  const body = (
    <>
      <TextField
        fullWidth
        size="small"
        label="What is it?"
        placeholder="e.g. KSEB electric pole"
        value={r.description || ""}
        onChange={(e) => set("description", e.target.value)}
        error={Boolean(errors.description)}
        helperText={errors.description}
        sx={{ mb: 1 }}
      />
      <Box sx={{ mb: 2 }}>
        <ChipGroup options={config?.options?.referencePoint || []} value={r.description} onChange={(v) => set("description", v)} size="small" />
      </Box>
      <GpsField
        label="GPS at the object"
        value={pointOf(r) ? r : null}
        onChange={(fix) => {
          onChange({ ...r, latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy });
          setErrors((e) => ({ ...e, location: undefined }));
        }}
        error={errors.location}
      />
      <TextField
        fullWidth
        size="small"
        label="Tape distance to the pit"
        placeholder="0.0"
        value={r.tapeDistanceM ?? ""}
        onChange={(e) => set("tapeDistanceM", e.target.value)}
        error={Boolean(errors.tapeDistanceM)}
        helperText={errors.tapeDistanceM}
        slotProps={{ htmlInput: { inputMode: "decimal" }, input: { endAdornment: <InputAdornment position="end">m</InputAdornment> } }}
      />
      <Box sx={{ mt: 0.75 }}>
        <GpsHint pit={pit} refPoint={r} />
      </Box>
    </>
  );
  const actions = (
    <Button variant="contained" startIcon={<CheckIcon />} onClick={save} fullWidth={!wide}>
      Save reference point
    </Button>
  );

  if (wide) {
    return (
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420, p: 3, display: "flex", flexDirection: "column" } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {subtitle}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close" size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: "auto" }}>{body}</Box>
        <Box sx={{ pt: 2 }}>{actions}</Box>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onClose={onClose} fullScreen maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start" }}>
        <Box sx={{ flex: 1 }}>
          {title}
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{body}</DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>{actions}</DialogActions>
    </Dialog>
  );
};
