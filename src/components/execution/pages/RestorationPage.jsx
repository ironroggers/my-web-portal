import React, { useCallback, useState } from "react";
import { Alert, AlertTitle, Box, Button, ButtonBase, CircularProgress, Grid, IconButton, Tooltip, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import SendIcon from "@mui/icons-material/Send";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import PageHeader from "../../common/PageHeader";
import SectionCard from "../../common/SectionCard";
import StatTile from "../../common/StatTile";
import DetailRow from "../../common/DetailRow";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtDateTime } from "../../../utils/executionFormat";
import ApprovalActions from "../ApprovalActions";
import { FlagList } from "../Flags";
import { HistoryCard } from "../JobParts";
import { PageState, RestorationPill, StickyActionBar } from "../execUi";
import { mediaSrc } from "../mediaItems";
import { reportError, showToast } from "../toast";
import { useExecContext } from "../useExecContext";
import { useLoader } from "../useLoader";
import { tint } from "../execSx";

// Status message at the top, in the portal's Alert style
const Banner = ({ severity, icon, title, text }) => (
  <Alert severity={severity} icon={icon} sx={{ mb: 3 }}>
    {title && <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>}
    {text}
  </Alert>
);

const Thumb = ({ src, add }) => (
  <Box
    sx={{
      width: 64,
      height: 64,
      borderRadius: 1,
      bgcolor: add ? tint("primary", 0.06) : "action.hover",
      border: add ? "1px dashed" : 0,
      borderColor: "primary.main",
      display: "grid",
      placeItems: "center",
      overflow: "hidden",
      flexShrink: 0,
    }}
  >
    {src ? (
      <Box component="img" src={src} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : add ? (
      <AddAPhotoOutlinedIcon sx={{ color: "primary.main", fontSize: 20 }} />
    ) : null}
  </Box>
);

const Check = ({ ok, label }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mr: 1.5, color: ok ? "success.dark" : "text.disabled" }}>
    {ok ? <CheckIcon sx={{ fontSize: 14 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 14 }} />}
    <Typography variant="caption" sx={{ color: ok ? "success.dark" : "text.secondary", fontWeight: ok ? 600 : 400 }}>
      {label}
    </Typography>
  </Box>
);

// Restoration flags, worked out from its media (the approvals list has the same counts)
const restorationFlags = (items, limit) => {
  const media = items.flatMap((row) => [...(row.item?.photos || []), row.item?.video].filter(Boolean));
  return {
    mediaAboveLimit: media.filter((m) => m.accuracyAboveLimit || (m.locationSource === "GPS" && Number(m.accuracy) > limit)).length,
    uploaded: media.filter((m) => m.source === "UPLOAD").length,
    locationTyped: media.filter((m) => m.locationSource === "MANUAL").length,
  };
};

/**
 * C13: one row per subsection with before / after and two ticks (After photo, Video);
 * submit; approve / reject. approvalView (/approvals/restorations/:sectionId) adds the
 * flags and returns to the inbox after a decision.
 */
const RestorationPage = ({ approvalView = false }) => {
  const { sectionId } = useParams();
  const { can } = usePermissions();
  const { config } = useExecutionConfig();
  const [missing, setMissing] = useState({});
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => executionService.getRestoration(sectionId), [sectionId]);
  const { data, error, reload, setData } = useLoader(load);
  const go = useExecContext(data ? { blockProfileId: data.section?.blockProfile, sectionId, sectionName: data.section?.name } : { sectionId });

  const header = (
    <PageHeader
      title="Restoration"
      subtitle={data?.section?.name}
      actions={
        <>
          {approvalView ? (
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go("/approvals")}>
              Back to approvals
            </Button>
          ) : (
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go(`/sections/${sectionId}/subsections`)}>
              Back to section
            </Button>
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={reload} aria-label="Refresh">
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

  const status = data.status;
  const editable = (status === "READY" || status === "REJECTED") && can("executeRestoration");
  const doneN = data.items.filter((row) => row.done).length;
  const total = data.items.length;

  const submit = async () => {
    const notDone = data.items.filter((row) => !row.done);
    if (notDone.length) {
      setMissing(Object.fromEntries(notDone.map((row) => [row.subSection._id, true])));
      showToast(`${notDone.length} subsection${notDone.length === 1 ? " still needs" : "s still need"} an after photo and video`, "error");
      return;
    }
    try {
      setSaving(true);
      setData(await executionService.submitRestoration(sectionId, data.version));
      setMissing({});
      showToast("Restoration sent for approval");
    } catch (e) {
      reportError(e, reload);
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    try {
      setData(await executionService.approveRestoration(sectionId, data.version));
      showToast("Restoration approved · section closed");
      if (approvalView) go("/approvals");
    } catch (e) {
      reportError(e, reload);
      throw e;
    }
  };

  const reject = async (remark) => {
    try {
      setData(await executionService.rejectRestoration(sectionId, data.version, remark));
      showToast("Restoration sent back to fix", "warning");
      if (approvalView) go("/approvals");
    } catch (e) {
      reportError(e, reload);
      throw e;
    }
  };

  const head = {
    LOCKED: (
      <Banner
        severity="info"
        icon={<LockOutlinedIcon />}
        title="Not open yet"
        text={`Every subsection must end execution first · ${data.ended} of ${data.total} ended.`}
      />
    ),
    READY: (
      <Banner
        severity="info"
        text="After the area is restored, take an after photo and a short video of each subsection. Its before photo is shown for comparison."
      />
    ),
    PENDING_APPROVAL: (
      <Banner
        severity="warning"
        icon={<HourglassTopIcon />}
        title="Waiting for admin approval"
        text={`Sent ${fmtDateTime(data.submittedAt)}.${data.approveBlocked ? ` Approval waits until every subsection is approved · ${data.approved}/${data.total} approved.` : ""}`}
      />
    ),
    APPROVED: (
      <Banner severity="success" icon={<VerifiedOutlinedIcon />} title="Section restored and closed" text={`Approved ${fmtDateTime(data.approval?.at)}.`} />
    ),
    REJECTED: <Banner severity="error" title={data.approval?.remark} text="Fix the items below and submit again." />,
  }[status];

  const actions = [];
  if (editable) {
    actions.push(
      <Button
        key="submit"
        variant="contained"
        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
        onClick={submit}
        disabled={saving}
      >
        {doneN === total ? "Submit for approval" : `Submit · ${total - doneN} left`}
      </Button>
    );
  }
  if (status === "PENDING_APPROVAL" && can("approveRestoration")) {
    actions.push(
      <ApprovalActions
        key="approval"
        kind="restoration"
        name={data.section?.name}
        onApprove={approve}
        onReject={reject}
        approveBlocked={data.approveBlocked ? `Every subsection must be approved first · ${data.approved}/${data.total} approved` : ""}
      />
    );
  }

  const pct = total ? Math.round((doneN / total) * 100) : 0;
  return (
    <Box>
      {header}
      {head}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {approvalView && (
            <SectionCard title="Check before approving">
              <FlagList flags={restorationFlags(data.items, config?.accuracyLimitM ?? 1)} />
            </SectionCard>
          )}
          <SectionCard title="Subsections" subtitle="Before and after, with the two things each one needs" contentSx={{ p: 0 }}>
            {data.items.map((row) => {
              const after = row.item?.photos?.[0];
              const bad = missing[row.subSection._id];
              return (
                <ButtonBase
                  key={row.subSection._id}
                  disabled={status === "LOCKED"}
                  onClick={() => go(`/sections/${sectionId}/restoration/${row.subSection._id}`)}
                  sx={{
                    display: "flex",
                    width: "100%",
                    gap: 1.5,
                    p: 1.5,
                    textAlign: "left",
                    borderBottom: 1,
                    borderColor: "divider",
                    "&:last-of-type": { borderBottom: 0 },
                    bgcolor: bad ? tint("error", 0.05) : "transparent",
                    "&:hover": { bgcolor: tint("primary", 0.035) },
                  }}
                >
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    <Thumb src={row.before ? mediaSrc(row.before) : ""} />
                    <Thumb src={after ? mediaSrc(after) : ""} add={!after} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                      {row.subSection.name}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Check ok={Boolean(row.item?.photos?.length)} label="After photo" />
                      <Check ok={Boolean(row.item?.video)} label="Video" />
                    </Box>
                    {bad && (
                      <Typography variant="caption" sx={{ color: "error.main" }}>
                        Needs an after photo and video
                      </Typography>
                    )}
                  </Box>
                  {row.done ? <CheckCircleIcon sx={{ color: "success.main" }} /> : <ChevronRightIcon sx={{ color: "text.disabled" }} />}
                </ButtonBase>
              );
            })}
            {!data.items.length && (
              <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
                No subsections in this section yet.
              </Typography>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <StatTile label="Captured" value={doneN} suffix={` / ${total}`} meterValue={pct} caption={`${pct}% of subsections have an after photo and video`} />
          <SectionCard title="Status" action={<RestorationPill status={status} />}>
            <DetailRow label="Subsections ended">{`${data.ended} of ${data.total}`}</DetailRow>
            <DetailRow label="Approved">{`${data.approved} of ${data.total}`}</DetailRow>
            <DetailRow label="Sent">
              {data.submittedAt ? `${fmtDateTime(data.submittedAt)}${data.submittedBy?.name ? ` · ${data.submittedBy.name}` : ""}` : null}
            </DetailRow>
            <DetailRow label="Decided">
              {data.approval?.at ? `${fmtDateTime(data.approval.at)}${data.approval.by?.name ? ` · ${data.approval.by.name}` : ""}` : null}
            </DetailRow>
          </SectionCard>
          {data.history?.length > 0 && <HistoryCard history={data.history} />}
        </Grid>
      </Grid>

      {actions.length > 0 && <StickyActionBar>{actions}</StickyActionBar>}
    </Box>
  );
};

export default RestorationPage;
