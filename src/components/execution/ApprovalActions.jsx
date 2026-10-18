import React, { useState } from "react";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Tooltip, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

const PLACEHOLDERS = {
  subsection: "e.g. Ending pit reference 2 has no description",
  restoration: "e.g. After photo still shows loose soil",
};

/**
 * Approve + Reject for an approver (C12 / C13 / C16). Reject asks for a reason the
 * engineer will see. onApprove() / onReject(remark) return promises; errors are the
 * caller's to report. approveBlocked: why Approve is disabled, if it is.
 */
const ApprovalActions = ({ kind = "subsection", name, onApprove, onReject, approveBlocked }) => {
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [remark, setRemark] = useState("");
  const [remarkError, setRemarkError] = useState(false);

  const run = async (which, fn) => {
    try {
      setBusy(which);
      await fn();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(null);
    }
  };

  const approve = () => run("approve", onApprove);

  const sendRejection = async () => {
    if (!remark.trim()) {
      setRemarkError(true);
      return;
    }
    if (await run("reject", () => onReject(remark.trim()))) {
      setRejecting(false);
      setRemark("");
    }
  };

  const approveButton = (
    <Button
      variant="contained"
      color="success"
      startIcon={busy === "approve" ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
      onClick={approve}
      disabled={Boolean(busy) || Boolean(approveBlocked)}
    >
      Approve
    </Button>
  );

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        startIcon={<CloseIcon />}
        onClick={() => {
          setRemarkError(false);
          setRejecting(true);
        }}
        disabled={Boolean(busy)}
      >
        Reject
      </Button>
      {approveBlocked ? (
        <Tooltip title={approveBlocked}>
          <span>{approveButton}</span>
        </Tooltip>
      ) : (
        approveButton
      )}

      <Dialog open={rejecting} onClose={() => !busy && setRejecting(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Reject {kind === "restoration" ? "restoration" : "subsection"}
          {name && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Reason for rejection (the engineer sees this)"
            placeholder={PLACEHOLDERS[kind]}
            value={remark}
            onChange={(e) => {
              setRemark(e.target.value);
              setRemarkError(false);
            }}
            error={remarkError}
            helperText={remarkError ? "Write a reason before rejecting." : " "}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejecting(false)} disabled={Boolean(busy)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={busy === "reject" ? <CircularProgress size={16} color="inherit" /> : <CancelOutlinedIcon />}
            onClick={sendRejection}
            disabled={Boolean(busy)}
          >
            Send rejection
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApprovalActions;
