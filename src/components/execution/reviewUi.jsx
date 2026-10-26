import React, { useState } from "react";
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
  FormHelperText,
  TextField,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SectionCard from "../common/SectionCard";
import StatusPill from "../common/StatusPill";
import { sectionStage } from "../blockProfile/blockProfileConstants";
import { fmtDateTime } from "../../utils/executionFormat";
import { tint } from "./execSx";
import { REVIEW_SLOTS } from "./execConstants";

const SLOT_ICON = {
  APPROVED: <CheckIcon sx={{ fontSize: 14, color: "success.main" }} />,
  REJECTED: <CloseIcon sx={{ fontSize: 14, color: "error.main" }} />,
};

/** Cluster Head and GIS Head decisions on a subsection, as one compact line */
export const ReviewSlots = ({ review = {}, sx }) => (
  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", ...sx }}>
    {REVIEW_SLOTS.map(({ key, label }) => {
      const decision = review?.[key];
      return (
        <Box key={key} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          {SLOT_ICON[decision?.status] || <HourglassEmptyIcon sx={{ fontSize: 14, color: "text.disabled" }} />}
          <Typography variant="caption" sx={{ color: decision ? "text.primary" : "text.secondary" }}>
            {label}
            {decision?.status === "APPROVED" ? " approved" : decision?.status === "REJECTED" ? " rejected" : " waiting"}
          </Typography>
        </Box>
      );
    })}
  </Box>
);

// Which section stage each reviewer acts on
const STAGE_OF_ROLE = { "ZONAL MANAGER": "ZONAL", ADMIN: "ADMIN" };
const APPROVE_LABEL = { ZONAL: "Approve and send to Admin", ADMIN: "Approve and freeze" };

const StageHint = {
  FIELD: "Subsections are being executed and reviewed by the Cluster Head and GIS Head. The section goes to the Zonal Manager once every subsection has both approvals.",
  ZONAL: "Every subsection is approved by the Cluster Head and GIS Head. The Zonal Manager approves it to Admin, or sends subsections back.",
  ADMIN: "Approved by the Zonal Manager. Admin's approval freezes the section.",
  FROZEN: "Approved by Admin. Only Admin can change it now.",
};

/**
 * The section's review above its subsections: stage, the latest Zonal Manager / Admin
 * decision and history, with Approve / Reject for the reviewer whose turn it is.
 * review: GET /api/sections/:id/review. onApprove() / onReject(remark, ids) return the new review.
 */
export const SectionReviewCard = ({ review, role, canReview, onApprove, onReject, sx }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const stage = review?.stage || "FIELD";
  const meta = sectionStage({ stage });
  const myTurn = canReview && STAGE_OF_ROLE[role] === stage;
  const lastReject = [review?.admin, review?.zonal].filter((d) => d?.status === "REJECTED").sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  const history = [...(review?.history || [])].reverse();

  const approve = async () => {
    try {
      setBusy(true);
      setError("");
      await onApprove();
    } catch (e) {
      setError(e.message || "Couldn't approve the section");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Section review"
      subtitle={StageHint[stage]}
      action={<StatusPill label={meta.label} tone={meta.tone} />}
      sx={sx}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {stage === "FIELD" && lastReject && (
        <Box sx={{ p: 1.25, mb: 1.5, borderRadius: 1, bgcolor: tint("error", 0.06), color: "error.dark" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Sent back by {lastReject.by?.name || "a reviewer"} · {fmtDateTime(lastReject.at)}
          </Typography>
          <Typography variant="body2">{lastReject.remark}</Typography>
        </Box>
      )}
      {myTurn && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: history.length ? 1.5 : 0 }}>
          <Button variant="outlined" color="error" startIcon={<CloseIcon />} disabled={busy} onClick={() => setRejecting(true)}>
            Send back
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            disabled={busy}
            onClick={approve}
          >
            {APPROVE_LABEL[stage]}
          </Button>
        </Box>
      )}
      {history.length > 0 && (
        <Box component="ol" sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {history.slice(0, 6).map((h, i) => (
            <Typography key={i} component="li" variant="caption" sx={{ color: "text.secondary" }}>
              {fmtDateTime(h.at)} · {h.text}
              {h.by?.name ? ` · ${h.by.name}` : ""}
            </Typography>
          ))}
        </Box>
      )}
      {rejecting && (
        <RejectSectionDialog
          review={review}
          onClose={() => setRejecting(false)}
          onReject={async (remark, ids) => {
            await onReject(remark, ids);
            setRejecting(false);
          }}
        />
      )}
    </SectionCard>
  );
};

// Pick the subsections that need fixing and say why; they go back to the Field Executive
const RejectSectionDialog = ({ review, onClose, onReject }) => {
  const subs = review?.subsections || [];
  const [picked, setPicked] = useState([]);
  const [remark, setRemark] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const send = async () => {
    setTouched(true);
    if (!remark.trim() || !picked.length) return;
    try {
      setBusy(true);
      setError("");
      await onReject(remark.trim(), picked);
    } catch (e) {
      setError(e.message || "Couldn't send the section back");
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Send section back
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {review?.section?.name}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Subsections that need fixing
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
          They reopen for the Field Executive and go through the Cluster Head and GIS Head review again. The others stay approved.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", maxHeight: 280, overflowY: "auto", mb: 1 }}>
          {subs.map((s) => (
            <FormControlLabel
              key={s._id}
              control={<Checkbox size="small" checked={picked.includes(s._id)} onChange={() => toggle(s._id)} disabled={busy} />}
              label={
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  {s.name}
                </Typography>
              }
            />
          ))}
        </Box>
        {touched && !picked.length && <FormHelperText error>Pick the subsections that need fixing.</FormHelperText>}
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Reason (the Field Executive sees this)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          error={touched && !remark.trim()}
          helperText={touched && !remark.trim() ? "Write a reason before sending it back." : " "}
          disabled={busy}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CloseIcon />}
          onClick={send}
          disabled={busy}
        >
          Send back{picked.length ? ` (${picked.length})` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
