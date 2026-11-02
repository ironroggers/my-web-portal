import React, { useCallback, useMemo, useState } from "react";
import { Alert, Box, Button, ButtonBase, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useParams } from "react-router-dom";
import PageHeader from "../../common/PageHeader";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import ChipGroup from "../ChipGroup";
import { EmptyState, ExecStatusPill, ListCard, PageState } from "../execUi";
import { ReviewSlots } from "../reviewUi";
import { StageCompleteButton } from "../StageComplete";
import { landmarkText } from "../stageLogic";
import { recordLine } from "../stageRecordLine";
import { useExecContext } from "../useExecContext";
import { useLoader } from "../useLoader";

/** One stage's records: warnings, status filter, cards, Mark complete and Add */
const StageRecordsPage = () => {
  const { sectionId, stage } = useParams();
  const { can, isAdmin } = usePermissions();
  const { config, statusOf } = useExecutionConfig();
  const meta = config?.stages?.[stage] || {};
  const [filter, setFilter] = useState("ALL");
  const load = useCallback(() => executionService.getStageRecords(sectionId, stage), [sectionId, stage]);
  const { data, error, reload } = useLoader(load);
  const go = useExecContext({ sectionId });

  const records = data?.records;
  const chips = useMemo(() => {
    const all = records || [];
    const statuses = (config?.statusOrder || []).filter((s) => all.some((r) => r.status === s));
    return [{ value: "ALL", label: "All", count: all.length }, ...statuses.map((s) => ({ value: s, label: statusOf(s).label, count: all.filter((r) => r.status === s).length }))];
  }, [records, config, statusOf]);
  const list = (records || []).filter((r) => filter === "ALL" || r.status === filter);
  const toRecord = stage === "COUPLING" ? (data?.options?.couplingPoints || []).filter((p) => !p.recordId) : [];
  const canWork = can("executeSubsection") && data?.sectionStage === "FIELD" && (isAdmin || !data?.blockFrozen);

  const header = (
    <PageHeader
      title={meta.label || "Stage"}
      subtitle={data?.summary}
      actions={
        <>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go(`/sections/${sectionId}/stages`)}>
            Back to stages
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={reload} aria-label="Refresh records">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {canWork && <StageCompleteButton sectionId={sectionId} stage={data} many={meta.many} onChanged={reload} />}
          {canWork && !data?.complete && meta.add && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => go(`/sections/${sectionId}/stages/${stage}/new`)}>
              {meta.add}
            </Button>
          )}
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

  return (
    <Box>
      {header}
      {data.complete && (
        <Alert severity="success" sx={{ mb: 1 }}>
          Marked complete. Reopen the stage to add more.
        </Alert>
      )}
      {data.warnings.map((w) => (
        <Alert key={w} severity="warning" sx={{ mb: 1 }}>
          {w}
        </Alert>
      ))}
      {toRecord.length > 0 && (
        <ListCard title="To record" count={toRecord.length}>
          {toRecord.map((p) => (
            <Box key={p.key} sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                  {p.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {[p.chainageM === null ? "" : `Ch ${p.chainageM} m`, p.ductNames.join(" meets ")].filter(Boolean).join(" · ")}
                </Typography>
                {landmarkText(p) && (
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    Landmarks: {landmarkText(p)}
                  </Typography>
                )}
              </Box>
              {canWork && !data.complete && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => go(`/sections/${sectionId}/stages/${stage}/new?pit=${encodeURIComponent(p.key)}`)}>
                  Record coupling
                </Button>
              )}
            </Box>
          ))}
        </ListCard>
      )}
      {records.length > 0 && (
        <Box sx={{ my: 1.5 }}>
          <ChipGroup nowrap value={filter} onChange={(v) => setFilter(v || "ALL")} options={chips} />
        </Box>
      )}
      {records.length ? (
        <ListCard title={meta.label} count={list.length}>
          {list.map((r) => (
            <ButtonBase
              key={r._id}
              onClick={() => go(`/stage-records/${r._id}`)}
              sx={{ display: "block", width: "100%", textAlign: "left", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 }, "&:hover": { bgcolor: "action.hover" } }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace", flex: 1 }}>
                  {r.name}
                </Typography>
                <ExecStatusPill status={r.status} />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                {recordLine(r)}
              </Typography>
              {r.status === "PENDING_APPROVAL" && <ReviewSlots review={r.review} sx={{ mt: 0.5 }} />}
              {r.status === "IN_PROGRESS" && (
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  Draft, not submitted
                </Typography>
              )}
              {r.status === "REJECTED" && r.approval?.remark && (
                <Typography variant="body2" sx={{ color: "error.dark", mt: 0.5 }}>
                  {r.approval.remark}
                </Typography>
              )}
            </ButtonBase>
          ))}
        </ListCard>
      ) : toRecord.length ? null : (
        <EmptyState title={`No ${meta.many} yet`} text={meta.empty} />
      )}
    </Box>
  );
};

export default StageRecordsPage;
