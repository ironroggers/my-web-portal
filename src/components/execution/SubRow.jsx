import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { countLabel, fmtDistance } from "../../utils/executionFormat";
import { ExecStatusPill, TypeTag } from "./execUi";
import { tint } from "./execSx";
import Meter from "../common/Meter";
import { ReviewSlots } from "./reviewUi";

/** One subsection: name + status, type and progress, the fix note when sent back */
const SubRow = ({ sub, onClick, context, right }) => {
  const { typeOf, isDucting } = useExecutionConfig();
  const type = typeOf(sub.typeOfWork);
  const duct = isDucting(sub.typeOfWork);
  const done = sub.doneM || 0;
  const progress = duct ? `${fmtDistance(done)} of ${fmtDistance(sub.subSectionLength)}` : countLabel(sub.entryCount || 0, "entry", "entries");
  const remark = sub.remark || sub.approval?.remark;
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        px: 2,
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-of-type": { borderBottom: 0 },
        "&:hover": { bgcolor: tint("primary", 0.035) },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 700, flex: 1, minWidth: 0, fontFamily: "monospace" }}>
          {sub.name}
        </Typography>
        {right}
        <ExecStatusPill status={sub.executionStatus} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, minWidth: 0 }}>
        <TypeTag type={type} />
        <Typography variant="caption" noWrap sx={{ color: "text.secondary", minWidth: 0 }}>
          {[type?.label, sub.roadName, progress].filter(Boolean).join(" · ")}
        </Typography>
      </Box>
      {duct && sub.executionStatus !== "NOT_STARTED" && (
        <Meter
          value={Math.round((done / (sub.subSectionLength || 1)) * 100)}
          color={sub.executionStatus === "APPROVED" ? "success" : "primary"}
          sx={{ mt: 1 }}
          aria-label={`${sub.name}: ${progress}`}
        />
      )}
      {sub.executionStatus === "PENDING_APPROVAL" && <ReviewSlots review={sub.review} sx={{ mt: 0.75 }} />}
      {context && (
        <Typography variant="caption" noWrap sx={{ color: "text.disabled", display: "block", mt: 0.5 }}>
          {context}
        </Typography>
      )}
      {sub.executionStatus === "REJECTED" && remark && (
        <Box sx={{ display: "flex", gap: 0.75, mt: 1, p: 1, borderRadius: 1, bgcolor: tint("error", 0.06), color: "error.dark" }}>
          <ErrorOutlineIcon sx={{ fontSize: 16, mt: "2px" }} />
          <Typography variant="body2" sx={{ color: "inherit" }}>
            {remark}
          </Typography>
        </Box>
      )}
    </ButtonBase>
  );
};

export default SubRow;
