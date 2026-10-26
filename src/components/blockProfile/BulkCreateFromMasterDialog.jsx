import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import blockProfileService from "../../services/blockProfileService.jsx";
import { titleCase } from "../execution/execConstants";

/**
 * Admin: create block profiles for many blocks at once from the LGD master. Each gets its
 * state, district, codes and GPs; the router, rings and team are filled in later.
 * Blocks that already have a profile are listed but can't be picked.
 */
const BulkCreateFromMasterDialog = ({ open, onClose, onCreated }) => {
  const [districts, setDistricts] = useState([]);
  const [districtCode, setDistrictCode] = useState("");
  const [blocks, setBlocks] = useState(null);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError("");
    setPicked([]);
    blockProfileService
      .masterDistricts()
      .then((res) => setDistricts(res.items || []))
      .catch((e) => setError(e.message || "Couldn't load the master data"));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setBlocks(null);
    setPicked([]);
    blockProfileService
      .masterBlocks(districtCode || undefined)
      .then((res) => setBlocks(res.items || []))
      .catch((e) => setError(e.message || "Couldn't load the blocks"));
  }, [open, districtCode]);

  const free = useMemo(() => (blocks || []).filter((b) => !b.blockProfileId), [blocks]);
  const allPicked = free.length > 0 && picked.length === free.length;
  const toggle = (code) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  const create = async () => {
    try {
      setBusy(true);
      setError("");
      const res = await blockProfileService.createFromMaster(picked);
      setResult(res);
      if (res.created?.length) onCreated();
    } catch (e) {
      setError(e.message || "Couldn't create the block profiles");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Create blocks from LGD master
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Each block gets its names, codes and GPs. Add the router, rings and team afterwards.
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {result ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Alert severity={result.created.length ? "success" : "info"}>
              Created {result.created.length} block profile{result.created.length === 1 ? "" : "s"}
              {result.skipped.length ? `, skipped ${result.skipped.length}` : ""}.
            </Alert>
            {result.skipped.map((s) => (
              <Typography key={s.blockCode} variant="body2" sx={{ color: "text.secondary" }}>
                {titleCase(s.block || s.blockCode)} · {s.reason}
              </Typography>
            ))}
          </Box>
        ) : (
          <>
            <TextField
              select
              fullWidth
              size="small"
              label="District"
              value={districtCode}
              onChange={(e) => setDistrictCode(e.target.value)}
              sx={{ mt: 1, mb: 1.5 }}
            >
              <MenuItem value="">All districts</MenuItem>
              {districts.map((d) => (
                <MenuItem key={d.districtCode} value={d.districtCode}>
                  {titleCase(d.district)} · {d.blocks} blocks
                </MenuItem>
              ))}
            </TextField>
            {!blocks ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : !blocks.length ? (
              <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
                No blocks in the master. Load it with scripts/importLgdMaster.js on the execution service.
              </Typography>
            ) : (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={allPicked}
                      indeterminate={picked.length > 0 && !allPicked}
                      disabled={!free.length || busy}
                      onChange={() => setPicked(allPicked ? [] : free.map((b) => b.blockCode))}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      All without a profile ({free.length} of {blocks.length})
                    </Typography>
                  }
                />
                <Box sx={{ display: "flex", flexDirection: "column", maxHeight: 360, overflowY: "auto", borderTop: 1, borderColor: "divider", pt: 0.5 }}>
                  {blocks.map((b) => (
                    <FormControlLabel
                      key={b.blockCode}
                      control={
                        <Checkbox
                          size="small"
                          checked={picked.includes(b.blockCode)}
                          disabled={Boolean(b.blockProfileId) || busy}
                          onChange={() => toggle(b.blockCode)}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ color: b.blockProfileId ? "text.disabled" : "text.primary" }}>
                          {titleCase(b.block)} · LGD {b.blockCode} · {b.blockProfileId ? "has a profile" : `${b.gpCount} GPs`}
                          {!districtCode && ` · ${titleCase(b.district)}`}
                        </Typography>
                      }
                    />
                  ))}
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          {result ? "Close" : "Cancel"}
        </Button>
        {!result && (
          <Button
            variant="contained"
            onClick={create}
            disabled={busy || !picked.length}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {busy ? "Creating…" : `Create ${picked.length || ""} block profile${picked.length === 1 ? "" : "s"}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkCreateFromMasterDialog;
