import React, { useCallback, useState } from "react";
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import SectionCard from "../common/SectionCard";
import executionService from "../../services/executionService.jsx";
import { fmtDateTime, fmtDistance } from "../../utils/executionFormat";
import PitMergeDialog from "./PitMergeDialog";
import { reportError, showToast } from "./toast";
import { useLoader } from "./useLoader";

const Row = ({ title, meta, action }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" } }}>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {meta}
      </Typography>
    </Box>
    {action}
  </Box>
);

const UndoDialog = ({ onClose, onUndo }) => {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setTouched(true);
    if (!reason.trim()) return;
    try {
      setBusy(true);
      await onUndo(reason.trim());
    } catch {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Undo merge
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Every pit of this merge goes back to where it was captured.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={touched && !reason.trim()}
          helperText={touched && !reason.trim() ? "Say why the merge is undone." : " "}
          disabled={busy}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" color="error" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null} onClick={send} disabled={busy}>
          Undo merge
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/** Pits of other subsections close to this one's, to merge, and its merges, to undo */
const NearbyPitsCard = ({ sub, blockId, pitLabels, onChanged }) => {
  const load = useCallback(() => executionService.getPitGaps(blockId, sub._id), [blockId, sub._id]);
  const { data, reload } = useLoader(load);
  const [gap, setGap] = useState(null);
  const [undoing, setUndoing] = useState(null);

  const gaps = data?.gaps || [];
  const merges = ["start", "end"].map((side) => ({ side, merge: sub[side]?.pit?.merge })).filter((m) => m.merge?.id);
  if (!gaps.length && !merges.length) return null;

  const changed = () => {
    reload();
    onChanged();
  };

  const undo = async (reason) => {
    try {
      await executionService.undoPitMerge(blockId, undoing, reason);
      showToast("Merge undone", "info");
      setUndoing(null);
      changed();
    } catch (e) {
      reportError(e);
      throw e;
    }
  };

  return (
    <SectionCard title="Nearby pits" subtitle="Close the gaps between pits captured separately" icon={<MergeTypeIcon />} contentSx={{ py: 1 }}>
      {gaps.map((g) => {
        const other = String(g.a.subSection) === String(sub._id) ? g.b : g.a;
        const mine = other === g.a ? g.b : g.a;
        return (
          <Row
            key={`${other.subSection}:${other.side}:${mine.side}`}
            title={`${other.name} · ${other.pitLabel}`}
            meta={`${fmtDistance(g.distanceM)} from this ${mine.pitLabel.toLowerCase()}`}
            action={
              <Button size="small" variant="outlined" onClick={() => setGap(g)}>
                Compare and merge
              </Button>
            }
          />
        );
      })}
      {merges.map(({ side, merge }) => (
        <Row
          key={side}
          title={`${pitLabels[side]} merged`}
          meta={[`Location of ${merge.keptFrom}`, fmtDateTime(merge.at), merge.by?.name].filter(Boolean).join(" · ")}
          action={
            <Button size="small" color="error" onClick={() => setUndoing(merge.id)}>
              Undo
            </Button>
          }
        />
      ))}
      <PitMergeDialog
        gap={gap}
        blockId={blockId}
        onClose={() => setGap(null)}
        onMerged={() => {
          setGap(null);
          changed();
        }}
      />
      {undoing && <UndoDialog onClose={() => setUndoing(null)} onUndo={undo} />}
    </SectionCard>
  );
};

export default NearbyPitsCard;
