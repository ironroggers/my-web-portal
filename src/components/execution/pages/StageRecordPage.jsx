import React, { useCallback, useState } from "react";
import { Alert, Box, Button, Collapse, IconButton, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../common/PageHeader";
import SectionCard from "../../common/SectionCard";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtAccuracy, fmtDateTime, fmtDistance, fmtLatLong } from "../../../utils/executionFormat";
import ApprovalActions from "../ApprovalActions";
import { ExecStatusPill, PageState, StickyActionBar } from "../execUi";
import { MediaStrip } from "../MediaPicker";
import { ReviewSlots } from "../reviewUi";
import { detailRows } from "../stageLogic";
import { reportError, showToast } from "../toast";
import { useExecContext } from "../useExecContext";
import { useLoader } from "../useLoader";

const Row = ({ label, value }) => (
  <Box sx={{ display: "flex", gap: 1.5, py: 0.25 }}>
    <Typography variant="body2" sx={{ width: 140, flex: "none", color: "text.secondary" }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
      {value}
    </Typography>
  </Box>
);

/** One stage record: approval slots, details, cable readings, every photo, GIS fields and history */
const StageRecordPage = ({ approvalView = false }) => {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { can, isAdmin } = usePermissions();
  const { config } = useExecutionConfig();
  const load = useCallback(() => executionService.getStageRecord(recordId), [recordId]);
  const { data: record, error, reload, setData } = useLoader(load);
  const [gisOpen, setGisOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const go = useExecContext({ sectionId: record?.section, sectionName: record?.sectionInfo?.name });

  if (!record) {
    return (
      <Box>
        <PageState error={error} onRetry={reload} />
      </Box>
    );
  }

  const meta = config?.stages?.[record.stage] || {};
  const inField = record.sectionInfo?.stage === "FIELD" && (isAdmin || !record.sectionInfo?.blockFrozen);
  const canWork = can("executeSubsection") && inField;
  const manager = can("deleteSubsection") && (isAdmin || !record.sectionInfo?.blockFrozen) && record.sectionInfo?.stage !== "FROZEN";
  const isPoint = !["DUCTING", "BLOWING"].includes(record.stage);
  const hasPoint = record.latitude !== undefined && record.latitude !== null;
  const sent = record.approval?.status === "REJECTED" ? record.approval : null;
  const labelOf = (options, v) => config?.optionLabels?.[options]?.[v] || v;
  const edit = () => go(`/stage-records/${record._id}/edit`);
  const update = (r) => (setData ? setData(r) : reload());

  const act = async (fn) => {
    try {
      await fn();
    } catch (e) {
      reportError(e, reload);
      throw e;
    }
  };

  const details = [
    ...(record.assetCode ? [["Asset code", record.assetCode]] : []),
    ...(record.stage === "DUCTING" && record.chainageM !== undefined ? [["Route", `Ch ${record.chainageM} m to ${record.chainageEndM} m`]] : []),
    ...detailRows(config?.stageFields?.[record.stage] || [], record, labelOf),
    ...(record.stage === "BLOWING"
      ? [
          ["Blown length", fmtDistance(record.data?.blownLengthM || 0)],
          [`At ${record.linked?.fromChamber?.name}`, `In ${record.data?.fromIn ?? "–"} m · Out ${record.data?.fromOut ?? "–"} m · Loop ${record.data?.fromLoopM ?? "–"} m`],
          [`At ${record.linked?.toChamber?.name}`, `In ${record.data?.toIn ?? "–"} m · Out ${record.data?.toOut ?? "–"} m · Loop ${record.data?.toLoopM ?? "–"} m`],
        ]
      : []),
    ...(record.remarks ? [["Remarks", record.remarks]] : []),
  ];

  const actions = [];
  if (approvalView && can("reviewSubsection") && record.status === "PENDING_APPROVAL") {
    actions.push(
      <ApprovalActions
        key="approval"
        kind="record"
        name={record.name}
        onApprove={() => act(async () => { update(await executionService.approveStageRecord(record._id, record.version)); showToast(`${record.name} approved`); })}
        onReject={(remark) => act(async () => { update(await executionService.rejectStageRecord(record._id, record.version, remark)); showToast(`${record.name} sent back to the field`, "info"); })}
      />
    );
  } else if (canWork && record.status === "IN_PROGRESS") {
    actions.push(
      <Button key="edit" variant="outlined" onClick={edit}>
        Edit
      </Button>,
      <Button key="submit" variant="contained" onClick={() => act(async () => { update(await executionService.submitStageRecord(record._id, record.version)); showToast(`${record.name} sent to the Cluster Head and GIS Head`); }).catch(() => edit())}>
        Submit
      </Button>
    );
  } else if (canWork && record.status === "REJECTED") {
    actions.push(
      <Button key="fix" variant="contained" onClick={() => act(async () => { await executionService.reopenStageRecord(record._id, record.version); edit(); }).catch(() => null)}>
        Fix and resubmit
      </Button>
    );
  } else if (manager && record.status !== "IN_PROGRESS") {
    actions.push(
      <Button key="edit" variant="outlined" onClick={edit}>
        Edit
      </Button>
    );
  }
  const unreviewed = record.status === "IN_PROGRESS" && !record.approval?.status && !record.review?.clusterHead?.status && !record.review?.gisHead?.status;
  if ((manager || (canWork && unreviewed)) && !approvalView) {
    actions.push(
      <Button
        key="delete"
        color="error"
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          act(async () => {
            await executionService.deleteStageRecord(record._id);
            showToast(`${record.name} deleted`, "info");
            navigate(`/sections/${record.section}/stages/${record.stage}`);
          }).catch(() => setArmed(false));
        }}
      >
        {armed ? "Click again" : "Delete"}
      </Button>
    );
  }

  return (
    <Box sx={{ pb: actions.length ? 10 : 0 }}>
      <PageHeader title={record.name} subtitle={`${meta.label} · ${record.sectionInfo?.name || ""}`} actions={<ExecStatusPill status={record.status} />} />
      {inField && record.status === "IN_PROGRESS" && !approvalView && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Draft. You can edit everything until you submit it.
        </Alert>
      )}
      {inField && ["PENDING_APPROVAL", "APPROVED"].includes(record.status) && !approvalView && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Submitted, so it can&apos;t be edited. It opens again only if a reviewer sends it back.
        </Alert>
      )}
      {sent && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>{sent.by?.name || "A reviewer"} sent this back.</strong> {sent.remark} Only the reviewer who sent it back reviews it again.
        </Alert>
      )}
      <SectionCard title="Approval" sx={{ mb: 2 }}>
        <ReviewSlots review={record.review} />
      </SectionCard>
      <SectionCard title="Details" sx={{ mb: 2 }}>
        {isPoint && <Row label="Location" value={hasPoint ? `${fmtLatLong(record.latitude, record.longitude)} · ${fmtAccuracy(record.accuracy, config?.accuracyLimitM)}${record.chainageM === null || record.chainageM === undefined ? "" : ` · Ch ${record.chainageM} m`}` : "No location yet"} />}
        {details.map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      </SectionCard>
      {record.stage === "CHAMBER" && (
        <SectionCard title="Cable readings · from Blowing" sx={{ mb: 2 }}>
          {record.readings?.length ? (
            record.readings.map((x) => <Row key={x.record} label={`Drum ${x.drum ?? "–"}`} value={`In ${x.in ?? "–"} m · Out ${x.out ?? "–"} m · Loop ${x.loop ?? "–"} m`} />)
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              None yet. Readings appear here when a blowing run starts or ends at this chamber.
            </Typography>
          )}
        </SectionCard>
      )}
      {record.photos?.length > 0 && (
        <SectionCard title="Photos" sx={{ mb: 2 }}>
          <MediaStrip media={{ photos: record.photos }} />
        </SectionCard>
      )}
      {record.gis && (
        <SectionCard
          title={`GIS layer: ${record.gis.layer}`}
          sx={{ mb: 2 }}
          action={
            <IconButton size="small" aria-label="Show GIS fields" onClick={() => setGisOpen((o) => !o)}>
              <ExpandMoreIcon sx={{ transform: gisOpen ? "rotate(180deg)" : "none" }} />
            </IconButton>
          }
        >
          <Collapse in={gisOpen}>
            {record.gis.rows.map(([k, v]) => (
              <Row key={k} label={k} value={v === null || v === undefined || v === "" ? "–" : String(v)} />
            ))}
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              State, district, block and ring codes are added on export.
            </Typography>
          </Collapse>
        </SectionCard>
      )}
      <SectionCard title="History" sx={{ mb: 2 }}>
        {[...(record.history || [])].reverse().map((h, i) => (
          <Box key={i} sx={{ py: 0.75, borderTop: i ? 1 : 0, borderColor: "divider" }}>
            <Typography variant="body2">{h.text}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {fmtDateTime(h.at)} · {h.by?.name || "Someone"}
            </Typography>
          </Box>
        ))}
      </SectionCard>
      {actions.length > 0 && <StickyActionBar>{actions}</StickyActionBar>}
    </Box>
  );
};

export default StageRecordPage;
