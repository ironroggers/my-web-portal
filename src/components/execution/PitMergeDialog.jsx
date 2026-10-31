import React, { useState } from "react";
import { Alert, Box, Button, Card, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Radio, Typography } from "@mui/material";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import executionService from "../../services/executionService.jsx";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { countLabel, fmtAccuracy, fmtDateTime, fmtDistance, fmtLatLong } from "../../utils/executionFormat";
import { MediaStrip } from "./MediaPicker";
import { showToast } from "./toast";

const PitOption = ({ pit, selected, onSelect, limit }) => (
  <Card variant="outlined" sx={{ flex: "1 1 260px", minWidth: 0, p: 1.5, borderColor: selected ? "primary.main" : "divider" }}>
    <Box component="label" sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, cursor: "pointer" }}>
      <Radio size="small" checked={selected} onChange={onSelect} sx={{ p: 0.25 }} inputProps={{ "aria-label": `Keep the location of ${pit.name} ${pit.pitLabel}` }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 700, fontFamily: "monospace" }}>
          {pit.name}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
          {[pit.pitLabel, pit.sectionName].filter(Boolean).join(" · ")}
        </Typography>
      </Box>
    </Box>
    <Typography variant="body2" sx={{ fontFamily: "monospace", mt: 1 }}>
      {fmtLatLong(pit.latitude, pit.longitude)}
    </Typography>
    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
      {[fmtAccuracy(pit.accuracy, limit), fmtDateTime(pit.at), pit.by?.name, countLabel(pit.refs.length, "reference point")].filter(Boolean).join(" · ")}
    </Typography>
    <MediaStrip media={pit} size={48} />
  </Card>
);

/**
 * Closes a gap between two nearby pits: the reviewer compares them and picks whose location
 * to keep. gap: { distanceM, a, b } from the pit-gaps list. Used by the block map and the
 * subsection page.
 */
const PitMergeDialog = ({ gap, blockId, onClose, onMerged }) => {
  const { config } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  const [keep, setKeep] = useState("a");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!gap) return null;

  const merge = async () => {
    const ref = ({ subSection, side }) => ({ subSection, side });
    try {
      setBusy(true);
      setError("");
      await executionService.mergePits(blockId, { pits: [ref(gap.a), ref(gap.b)], keep: ref(gap[keep]) });
      showToast("Pits merged");
      onMerged();
    } catch (e) {
      setError(e.message || "Couldn't merge these pits");
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        Merge pits
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {fmtDistance(gap.distanceM)} apart. Choose the location to keep.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <PitOption pit={gap.a} selected={keep === "a"} onSelect={() => setKeep("a")} limit={limit} />
          <PitOption pit={gap.b} selected={keep === "b"} onSelect={() => setKeep("b")} limit={limit} />
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
          The other pit moves to this location. All reference points, photos and videos stay on both subsections, approvals don&apos;t change, and the merge can be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <MergeTypeIcon />} onClick={merge} disabled={busy}>
          Merge pits
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PitMergeDialog;
