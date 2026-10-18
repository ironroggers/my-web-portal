import React, { useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import HistoryIcon from "@mui/icons-material/History";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ErrorIcon from "@mui/icons-material/Error";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { countLabel, fmtAccuracy, fmtDateTime, fmtLatLong } from "../../utils/executionFormat";
import { MediaStrip } from "./MediaPicker";
import { RefRow } from "./RefPoint";

// Read-only pieces of a job card, shared by the job card and the approval detail

/** Label / value rows; empty values are left out */
export const KV = ({ rows }) => (
  <Box>
    {rows
      .filter(([, v]) => v)
      .map(([label, value]) => (
        <Box key={label} sx={{ display: "flex", py: 0.375 }}>
          <Typography variant="body2" sx={{ width: 96, flexShrink: 0, color: "text.secondary" }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            {value}
          </Typography>
        </Box>
      ))}
  </Box>
);

/** Start or end as recorded: pit with its 3 reference points (ducting) or a location */
export const PointView = ({ point }) => {
  const { config } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 0.75 }}>
        <PlaceOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
          {fmtLatLong(point.latitude, point.longitude)}
        </Typography>
        <Typography variant="caption" sx={{ color: point.accuracyAboveLimit ? "warning.dark" : "success.dark" }}>
          {fmtAccuracy(point.accuracy, limit)}
        </Typography>
      </Box>
      {point.pit?.copiedFrom && (
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
          Pit copied from the previous subsection&apos;s end pit
        </Typography>
      )}
      {point.pit?.refs?.length ? point.pit.refs.map((r, i) => <RefRow key={r._id || i} refPoint={r} index={i} />) : null}
      {point.remarks && <KV rows={[["Note", point.remarks]]} />}
      <Box sx={{ mt: 1 }}>
        <MediaStrip media={point} />
      </Box>
    </Box>
  );
};

/** "Needs fix" box: the approver's reason and what to do next */
export const FixBox = ({ remark, text }) => (
  <Box sx={{ display: "flex", gap: 1, p: 1.25, borderRadius: 1, bgcolor: "rgba(185,28,28,0.06)" }}>
    <ErrorIcon sx={{ color: "error.main", fontSize: 20 }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 700, color: "error.dark" }}>
        {remark}
      </Typography>
      {text && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
          {text}
        </Typography>
      )}
    </Box>
  </Box>
);

/** Folded history, newest first: "Execution started · 18 Oct, 10:42 · Ravi · mobile" */
export const HistoryList = ({ history = [], defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box>
      <ButtonBase onClick={() => setOpen((o) => !o)} aria-expanded={open} sx={{ display: "flex", width: "100%", gap: 1, justifyContent: "flex-start", py: 0.5, borderRadius: 1 }}>
        <HistoryIcon sx={{ fontSize: 18, color: "text.secondary" }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          History
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", flex: 1, textAlign: "left" }}>
          {countLabel(history.length, "event")}
        </Typography>
        {open ? <ExpandLessIcon sx={{ color: "text.disabled" }} /> : <ExpandMoreIcon sx={{ color: "text.disabled" }} />}
      </ButtonBase>
      {open &&
        [...history].reverse().map((h, i) => (
          <Box key={h._id || i} sx={{ py: 1, borderTop: 1, borderColor: "divider", mt: i === 0 ? 1 : 0 }}>
            <Typography variant="body2">{h.text}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {fmtDateTime(h.at)}
              {h.by?.name ? ` · ${h.by.name}` : ""}
              {h.client ? ` · ${h.client}` : ""}
            </Typography>
          </Box>
        ))}
    </Box>
  );
};
