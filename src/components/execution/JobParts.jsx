import React, { useState } from "react";
import { Alert, AlertTitle, Box, IconButton, Typography } from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import HistoryIcon from "@mui/icons-material/History";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { countLabel, fmtAccuracy, fmtDateTime, fmtLatLong } from "../../utils/executionFormat";
import { MediaStrip } from "./MediaPicker";
import { RefRow } from "./RefPoint";
import DetailRow from "../common/DetailRow";
import SectionCard from "../common/SectionCard";

// Read-only pieces of a job card, shared by the job card and the approval detail

/** Label / value rows (the portal's DetailRow); empty values are left out */
export const KV = ({ rows }) => (
  <Box>
    {rows.map(([label, value]) => (
      <DetailRow key={label} label={label}>
        {value}
      </DetailRow>
    ))}
  </Box>
);

/** What a merged pit brought from the others; tape distances are to where each was captured */
const MergedPit = ({ merge }) => (
  <Box sx={{ mt: 1.5 }}>
    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
      Merged · location of {merge.keptFrom} · captured here at {fmtLatLong(merge.original?.latitude, merge.original?.longitude)}
    </Typography>
    {(merge.others || []).map((other) => (
      <Box key={`${other.subSection}:${other.side}`} sx={{ mt: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          From {other.name} · {other.pitLabel}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
          Captured at {fmtLatLong(other.latitude, other.longitude)}
        </Typography>
        {(other.photos?.length > 0 || other.video) && <MediaStrip media={other} size={56} />}
        {(other.refs || []).map((r, i) => (
          <React.Fragment key={i}>
            <RefRow refPoint={r} index={i} />
            {(r.photos?.length > 0 || r.video) && (
              <Box sx={{ pl: 5.25, pb: 1 }}>
                <MediaStrip media={r} size={56} />
              </Box>
            )}
          </React.Fragment>
        ))}
      </Box>
    ))}
  </Box>
);

/** Start or end as recorded: pit with its 3 reference points (ducting), each with any photos, or a location */
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
          Pit copied from another subsection
        </Typography>
      )}
      {/* The pit's own photos and video, then each reference point with its own */}
      {point.pit && (point.pit.photos?.length > 0 || point.pit.video) && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
            Pit photos
          </Typography>
          <MediaStrip media={point.pit} size={56} />
        </Box>
      )}
      {point.pit?.refs?.length
        ? point.pit.refs.map((r, i) => (
            <React.Fragment key={r._id || i}>
              <RefRow refPoint={r} index={i} />
              {(r.photos?.length > 0 || r.video) && (
                <Box sx={{ pl: 5.25, pb: 1 }}>
                  <MediaStrip media={r} size={56} />
                </Box>
              )}
            </React.Fragment>
          ))
        : null}
      <KV rows={[["Recorded", [fmtDateTime(point.at), point.by?.name].filter(Boolean).join(" · ")], ["Note", point.remarks]].filter(([, v]) => v)} />
      {point.pit?.merge?.id && <MergedPit merge={point.pit.merge} />}
      <Box sx={{ mt: 1 }}>
        <MediaStrip media={point} />
      </Box>
    </Box>
  );
};

/** "Needs fix": the approver's reason and what to do next */
export const FixBox = ({ remark, text }) => (
  <Alert severity="error">
    <AlertTitle sx={{ fontWeight: 600 }}>{remark}</AlertTitle>
    {text}
  </Alert>
);

/** History in a card, folded until opened, newest first: "Execution started · 18 Oct, 10:42 · Ravi · mobile" */
export const HistoryCard = ({ history = [], defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SectionCard
      title="History"
      subtitle={countLabel(history.length, "event")}
      icon={<HistoryIcon />}
      action={
        <IconButton size="small" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Hide history" : "Show history"}>
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      }
      contentSx={{ py: 0 }}
    >
      {open
        ? [...history].reverse().map((h, i) => (
            <Box key={h._id || i} sx={{ py: 1.25, "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" } }}>
              <Typography variant="body2">{h.text}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {fmtDateTime(h.at)}
                {h.by?.name ? ` · ${h.by.name}` : ""}
                {h.client ? ` · ${h.client}` : ""}
              </Typography>
            </Box>
          ))
        : null}
    </SectionCard>
  );
};
