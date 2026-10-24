import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useIsAdmin } from "../../hooks/useIsAdmin";
import executionService from "../../services/executionService.jsx";
import { fmtDateTime } from "../../utils/executionFormat";

// The demo block (ADMIN only): a complete sample block to demonstrate every screen.
// Reset deletes it and everything under it and builds it again from scratch.

export const DemoChip = () => <Chip size="small" label="Demo" color="secondary" variant="outlined" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700, ml: 1 }} />;

const WHAT = [
  "Block router (the head node), 6 GPs (two without infra) and a KML of the road route",
  "Block and GP infra with described photos",
  "7 sections: one finished and restored, one waiting restoration approval, one with a rejection and flagged work, one ready for restoration, one in progress, one empty and one existing route",
  "Every type of work with entries, pits and reference points, photos and videos with the location stamp",
];

/** Confirm and run a reset; onDone(newId) after it's rebuilt */
export const ResetDemoDialog = ({ open, onClose, onDone, exists }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    try {
      setBusy(true);
      setError("");
      const result = await executionService.resetDemoBlock();
      onDone(result._id);
    } catch (e) {
      setError(e.message || "Couldn't build the demo block");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{exists ? "Reset the demo block?" : "Create the demo block?"}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {exists
            ? "Everything in the demo block, including changes made during a demo, is deleted and built again with fresh sample data. Real blocks aren't touched."
            : "Adds a complete sample block for demonstrations. Only admins can see it, on the web."}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { typography: "body2", color: "text.secondary", mb: 0.5 } }}>
          {WHAT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <RestartAltIcon />} onClick={run} disabled={busy}>
          {busy ? "Building…" : exists ? "Reset demo block" : "Create demo block"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/** Header button on the Block Profile list: open, create or reset the demo block */
export const DemoBlockButton = ({ onChanged }) => {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [demo, setDemo] = useState(undefined);
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    executionService
      .getDemoBlock()
      .then((res) => setDemo(res.block))
      .catch(() => setDemo(null));
  }, [isAdmin]);

  if (!isAdmin) return null;
  return (
    <>
      <Button variant="outlined" startIcon={<ScienceOutlinedIcon />} onClick={() => setOpen(true)}>
        Demo block
      </Button>
      <Dialog open={open && !resetting} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Demo block</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {demo
              ? `${demo.block} · last changed ${fmtDateTime(demo.updatedAt)}. Visible to admins only.`
              : "No demo block yet. Create one to demonstrate every screen with complete sample data."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
          {demo && (
            <Button
              onClick={() => {
                setOpen(false);
                navigate(`/block-profiles/${demo._id}`);
              }}
            >
              Open demo block
            </Button>
          )}
          <Button variant="contained" startIcon={<RestartAltIcon />} onClick={() => setResetting(true)}>
            {demo ? "Reset" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
      <ResetDemoDialog
        open={resetting}
        exists={Boolean(demo)}
        onClose={() => setResetting(false)}
        onDone={(id) => {
          setResetting(false);
          setOpen(false);
          setDemo({ _id: id, block: "HARIPPAD (DEMO)", updatedAt: new Date().toISOString() });
          onChanged?.();
          navigate(`/block-profiles/${id}`);
        }}
      />
    </>
  );
};
