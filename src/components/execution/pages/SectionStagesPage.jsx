import React, { useCallback } from "react";
import { Alert, Box, Button, ButtonBase, IconButton, LinearProgress, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useParams } from "react-router-dom";
import PageHeader from "../../common/PageHeader";
import SectionCard from "../../common/SectionCard";
import StatusPill from "../../common/StatusPill";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { PageState, RestorationLine } from "../execUi";
import { SectionReviewCard } from "../reviewUi";
import { showToast } from "../toast";
import { useExecContext } from "../useExecContext";
import { useLoader } from "../useLoader";

const LANES = [
  ["excavated", "Excavated", "#8D6E63"],
  ["ducted", "Ducted", "#1976D2"],
  ["blown", "Blown", "#2E7D32"],
];
const POINTS = [
  ["chambers", "Chamber", "#37474F"],
  ["markers", "Marker", "#C62828"],
  ["couplings", "Coupling point", "#B45309"],
];

// Recorded work along the section. Positions are approximate: the straight line between the ends.
const RouteStrip = ({ route }) => {
  const length = route.lengthM || 1;
  const pct = (m) => `${Math.max(0, Math.min(100, (m / length) * 100))}%`;
  return (
    <Box>
      {POINTS.slice(0, 2).map(([key, , color]) => (
        <Box key={key} sx={{ position: "relative", height: 10, mb: 0.5 }}>
          {route[key].map((m, i) => (
            <Box key={i} sx={{ position: "absolute", left: pct(m), ml: "-4px", width: 8, height: 8, bgcolor: color, borderRadius: key === "markers" ? "50%" : 0 }} />
          ))}
        </Box>
      ))}
      {LANES.map(([key, , color]) => (
        <Box key={key} sx={{ position: "relative", height: 5, borderRadius: 1, bgcolor: "action.hover", mb: 0.5, overflow: "hidden" }}>
          {route[key].map((s, i) => (
            <Box key={i} sx={{ position: "absolute", top: 0, bottom: 0, minWidth: 1, left: pct(Math.min(s.startM, s.endM)), width: pct(Math.abs(s.endM - s.startM)), bgcolor: color }} />
          ))}
        </Box>
      ))}
      <Box sx={{ position: "relative", height: 10, mb: 0.5 }}>
        {route.pits.map((m, i) => (
          <Box key={i} sx={{ position: "absolute", left: pct(m), ml: "-1px", width: 2, height: 8, bgcolor: "#475569" }} />
        ))}
        {route.couplings.map((m, i) => (
          <Box key={i} sx={{ position: "absolute", left: pct(m), ml: "-4px", width: 8, height: 8, bgcolor: POINTS[2][2], transform: "rotate(45deg)" }} />
        ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="caption">{route.from}</Typography>
        <Typography variant="caption">{route.to}</Typography>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 0.5 }}>
        {[...LANES, ...POINTS].map(([key, label, color]) => (
          <Box key={key} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 5, borderRadius: 0.5, bgcolor: color }} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/** The section's stage list: Excavation leads to the subsections, the others to their records */
const SectionStagesPage = () => {
  const { sectionId } = useParams();
  const { can, role, isAdmin } = usePermissions();
  const load = useCallback(async () => {
    const [section, stages, review, restoration] = await Promise.all([
      executionService.getSection(sectionId),
      executionService.getSectionStages(sectionId),
      executionService.getSectionReview(sectionId),
      executionService.getRestoration(sectionId),
    ]);
    return { section, stages, review, restoration };
  }, [sectionId]);
  const { data, error, reload } = useLoader(load);
  const section = data?.section;
  const go = useExecContext({ blockProfileId: section?.blockProfile, blockProfileName: section?.block, sectionId, sectionName: section?.name });

  const header = (
    <PageHeader
      title={section?.name || "Section"}
      subtitle="Stages"
      actions={
        <>
          {section && (
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go(`/block-profiles/${section.blockProfile}?tab=sections`)}>
              Back to block
            </Button>
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={reload} aria-label="Refresh stages">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </>
      }
    />
  );
  if (!data) {
    return (
      <Box>
        {header}
        <PageState error={error} onRetry={reload} />
      </Box>
    );
  }

  const { stages, review, restoration } = data;
  const open = (key) => go(key === "EXCAVATION" ? `/sections/${sectionId}/subsections` : `/sections/${sectionId}/stages/${key}`);
  return (
    <Box>
      {header}
      {stages.sectionStage !== "FIELD" && stages.sectionStage !== "FROZEN" && (
        <Alert severity="info" sx={{ mb: 2 }}>
          With the reviewers. Stages are read-only for the Field Executive unless the section is sent back.
        </Alert>
      )}
      <SectionReviewCard
        review={review}
        role={role}
        canReview={can("reviewSection") && (isAdmin || !review.blockFrozen)}
        onApprove={async () => {
          await executionService.approveSection(sectionId);
          showToast("Section approved", "success");
          reload();
        }}
        onReject={async (remark, ids, recordIds) => {
          await executionService.rejectSection(sectionId, remark, ids, recordIds);
          showToast("Section sent back", "info");
          reload();
        }}
        sx={{ mb: 2 }}
      />
      <SectionCard title="Stages complete" subtitle={`${stages.completeCount} of 6`} sx={{ mb: 2 }}>
        <LinearProgress variant="determinate" value={(stages.completeCount / 6) * 100} color="success" sx={{ height: 6, borderRadius: 3 }} />
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
          The section goes to the Zonal Manager when all 6 stages are complete and every record is approved.
        </Typography>
      </SectionCard>
      <SectionCard title="Stages" sx={{ mb: 2 }} contentSx={{ p: 0 }}>
        {stages.stages.map((s) => (
          <ButtonBase
            key={s.key}
            onClick={() => open(s.key)}
            sx={{ display: "flex", width: "100%", gap: 1.5, justifyContent: "flex-start", textAlign: "left", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 }, "&:hover": { bgcolor: "action.hover" } }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {s.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {s.summary}
              </Typography>
            </Box>
            <StatusPill label={s.state.label} tone={s.state.tone} />
            <ChevronRightIcon sx={{ color: "text.disabled" }} />
          </ButtonBase>
        ))}
      </SectionCard>
      <SectionCard title="Route so far" subtitle="Positions are approximate" sx={{ mb: 2 }}>
        <RouteStrip route={stages.route} />
      </SectionCard>
      <ButtonBase onClick={() => go(`/sections/${sectionId}/restoration`)} sx={{ display: "block", width: "100%", textAlign: "left" }}>
        <SectionCard title="Restoration">
          <RestorationLine restoration={restoration} remark={restoration?.approval?.remark} />
        </SectionCard>
      </ButtonBase>
    </Box>
  );
};

export default SectionStagesPage;
