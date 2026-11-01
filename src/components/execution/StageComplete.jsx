import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import executionService from "../../services/executionService.jsx";
import { reportError, showToast } from "./toast";

/**
 * Mark stage complete and its reopen, on every stage. The dialog says what's in the way, or
 * warns. stage: an entry from GET /api/sections/:id/stages; the server refuses the same cases.
 */
export const StageCompleteButton = ({ sectionId, stage, many, completeLabel = "Mark complete", onChanged }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action, message) => {
    try {
      setBusy(true);
      await action(sectionId, stage.key);
      setOpen(false);
      showToast(message);
      onChanged();
    } catch (e) {
      setOpen(false);
      reportError(e, onChanged);
    } finally {
      setBusy(false);
    }
  };

  if (stage.complete) {
    return (
      <Button variant="outlined" disabled={busy} onClick={() => run(executionService.reopenStage, `${stage.label} reopened`)}>
        Reopen stage
      </Button>
    );
  }
  const blocked = stage.blockers.length > 0;
  return (
    <>
      <Button variant="outlined" startIcon={<CheckIcon />} onClick={() => setOpen(true)}>
        {completeLabel}
      </Button>
      <Dialog open={open} onClose={busy ? undefined : () => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Mark {stage.label} complete?</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {stage.blockers.map((b) => (
              <Alert key={b} severity="error">
                {b}
              </Alert>
            ))}
            {!blocked && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No more {many} are expected in this section. You can reopen the stage until the section goes to the Zonal Manager.
              </Typography>
            )}
            {!blocked && !stage.count && <Alert severity="warning">Nothing is recorded here. Mark it complete only if this section needs none.</Alert>}
            {!blocked &&
              stage.warnings.map((w) => (
                <Alert key={w} severity="warning">
                  {w}
                </Alert>
              ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            {blocked ? "OK" : "Cancel"}
          </Button>
          {!blocked && (
            <Button
              variant="contained"
              color="success"
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
              onClick={() => run(executionService.completeStage, `${stage.label} marked complete`)}
            >
              Mark complete
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
