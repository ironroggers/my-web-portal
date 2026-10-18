import React, { useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

const DOT = {
  done: { bgcolor: "success.main", borderColor: "success.main", color: "#fff" },
  current: { bgcolor: "background.paper", borderColor: "primary.main", color: "primary.main" },
  todo: { bgcolor: "background.paper", borderColor: "divider", color: "text.disabled" },
  error: { bgcolor: "error.main", borderColor: "error.main", color: "#fff" },
};

/**
 * Vertical track: Site condition → Start → Entries → End → Approval.
 * stages: [{ key, title, meta, state: done | current | todo | error, content?: node }]
 * The current (or failed) step opens by default; finished ones expand on click.
 */
const ProgressTrack = ({ stages }) => {
  const [open, setOpen] = useState({});
  return (
    <Box>
      {stages.map((stage, i) => {
        const isOpen = Boolean(stage.content) && (open[stage.key] ?? (stage.state === "current" || stage.state === "error"));
        const last = i === stages.length - 1;
        const head = (
          <Box sx={{ display: "flex", alignItems: "center", width: "100%", textAlign: "left", minHeight: 28 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: stage.state === "todo" ? "text.disabled" : "text.primary" }}>
                {stage.title}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {stage.meta}
              </Typography>
            </Box>
            {stage.content && (isOpen ? <ExpandLessIcon sx={{ color: "text.disabled" }} /> : <ExpandMoreIcon sx={{ color: "text.disabled" }} />)}
          </Box>
        );
        return (
          <Box key={stage.key} sx={{ display: "flex" }}>
            <Box sx={{ width: 34, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  border: 2,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  ...DOT[stage.state],
                }}
              >
                {stage.state === "done" ? <CheckIcon sx={{ fontSize: 16 }} /> : stage.state === "error" ? <PriorityHighIcon sx={{ fontSize: 16 }} /> : i + 1}
              </Box>
              {!last && <Box sx={{ flex: 1, width: 2, my: 0.25, bgcolor: stage.state === "done" ? "success.light" : "divider" }} />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, pl: 1, pb: 2 }}>
              {stage.content ? (
                <ButtonBase onClick={() => setOpen((o) => ({ ...o, [stage.key]: !isOpen }))} sx={{ width: "100%", borderRadius: 1 }} aria-expanded={isOpen}>
                  {head}
                </ButtonBase>
              ) : (
                head
              )}
              {isOpen && <Box sx={{ mt: 1.5 }}>{stage.content}</Box>}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ProgressTrack;
