import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Link,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Navigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import AddIcon from "@mui/icons-material/Add";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PageHeader from "../../common/PageHeader";
import SectionCard from "../../common/SectionCard";
import StatTile from "../../common/StatTile";
import DetailRow from "../../common/DetailRow";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { countLabel, fmtDateTime, fmtDistance } from "../../../utils/executionFormat";
import ProgressTrack from "../ProgressTrack";
import EntriesView from "../EntriesView";
import EntryForm from "../EntryForm";
import ApprovalActions from "../ApprovalActions";
import ApprovalMap from "../ApprovalMap";
import SubsectionMediaCard from "../SubsectionMediaCard";
import NearbyPitsCard from "../NearbyPitsCard";
import { FlagList } from "../Flags";
import { MediaStrip } from "../MediaPicker";
import { FixBox, HistoryCard, KV, PointView } from "../JobParts";
import { ExecStatusPill, PageState, StickyActionBar, TypeTag } from "../execUi";
import { carryOver, emptyEntry, entryBody, validateEntry } from "../executionLogic";
import { anyPending, toMediaFile } from "../mediaItems";
import { attentionMessage, reportError, showToast } from "../toast";
import { contextOfSub, useExecContext } from "../useExecContext";
import { ReviewSlots } from "../reviewUi";
import { slotForRole } from "../execConstants";

const mediaCount = (holder) => `${countLabel(holder?.photos?.length || 0, "photo")}${holder?.video ? " · video" : ""}`;

/**
 * C8–C12: the job card. Summary, the track Site condition → Start → Entries → End →
 * Approval, folded history, and the one next action in the sticky bar.
 * approvalView (C16, /approvals/subsections/:id): adds the flags and the map, and
 * returns to the inbox after a decision.
 */
const SubsectionJobPage = ({ approvalView = false }) => {
  const { subSectionId } = useParams();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const { can, role, isAdmin } = usePermissions();
  const { config, typeOf, isDucting, statusOf } = useExecutionConfig();
  const [sub, setSub] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [sheet, setSheet] = useState(null); // { form, errors }
  const [busy, setBusy] = useState(false);
  const go = useExecContext(contextOfSub(sub));

  const load = useCallback(async () => {
    try {
      setLoadError("");
      setSub(await executionService.getSubsection(subSectionId));
    } catch (e) {
      if (sub) reportError(e);
      else setLoadError(e.message || "Failed to load the subsection");
    }
    // `sub` only decides how to show a failure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subSectionId]);

  useEffect(() => {
    load();
  }, [load]);

  const sectionId = sub?.sectionInfo?.section?._id || sub?.section;
  const header = (
    <PageHeader
      title={sub?.name || "Subsection"}
      subtitle={sub ? [typeOf(sub.typeOfWork)?.full, sub.roadName].filter(Boolean).join(" · ") : undefined}
      actions={
        <>
          {approvalView ? (
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go("/approvals")}>
              Back to approvals
            </Button>
          ) : (
            sectionId && (
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go(`/sections/${sectionId}/subsections`)}>
                Back to section
              </Button>
            )
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={load} aria-label="Refresh">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </>
      }
    />
  );

  if (!sub || !config) {
    return (
      <Box>
        {header}
        <PageState error={loadError} onRetry={load} />
      </Box>
    );
  }
  // Subsections from before execution tracking keep the trenching page (Q5)
  if (!sub.typeOfWork) return <Navigate to={`/subsections/${subSectionId}/trenching`} replace />;

  const type = typeOf(sub.typeOfWork);
  const duct = isDucting(sub.typeOfWork);
  const fields = config?.entryFields?.[duct ? sub.typeOfWork : "basic"] || [];
  const status = sub.executionStatus;
  // A frozen section or block is read-only for everyone but Admin
  const locked = !isAdmin && (sub.sectionInfo?.section?.stage === "FROZEN" || sub.sectionInfo?.block?.frozen);
  const canExecute = can("executeSubsection") && !locked;
  // Cluster Head and GIS Head each review once; the other's decision is kept
  const slot = slotForRole(role);
  const canApprove = can("reviewSubsection") && Boolean(slot) && sub.review?.[slot]?.status !== "APPROVED" && !locked;
  const entries = sub.entries || [];
  const done = sub.doneM || 0;
  const ic = sub.initialCondition || {};

  // A new entry starts empty; the previous entry's offset, side, protection… can be copied on request
  const openEntry = () => setSheet({ form: emptyEntry(fields), errors: {} });
  const previousEntry = entries[entries.length - 1];
  const copyPrevious = () =>
    setSheet((s) => (s ? { ...s, form: carryOver(s.form, config?.entryCarryOver || [], previousEntry), errors: {} } : s));

  const saveEntry = async () => {
    const errors = validateEntry(fields, sheet.form);
    if (Object.keys(errors).length) {
      setSheet((s) => ({ ...s, errors }));
      showToast(attentionMessage(errors), "error");
      return;
    }
    if (anyPending([sheet.form.photo])) {
      showToast("Wait for the upload to finish", "warning");
      return;
    }
    try {
      setBusy(true);
      const card = await executionService.addEntry(subSectionId, entryBody(fields, sheet.form, toMediaFile));
      setSub(card);
      setSheet(null);
      showToast(duct ? `Entry saved · ${fmtDistance(card.doneM)} of ${fmtDistance(card.subSectionLength)}` : "Entry saved");
    } catch (e) {
      setSheet((s) => (s ? { ...s, errors: e.fieldErrors || {} } : s));
      reportError(e, load);
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (entryId) => {
    try {
      setSub(await executionService.deleteEntry(subSectionId, entryId));
      showToast("Entry deleted", "info");
    } catch (e) {
      reportError(e, load);
    }
  };

  const endOpen = () => {
    if (!entries.length) {
      showToast("Add at least one entry before ending", "warning");
      return;
    }
    go(`/subsections/${subSectionId}/end`);
  };

  const reopen = async () => {
    try {
      setBusy(true);
      const card = await executionService.reopenSubsection(subSectionId, sub.version);
      setSub(card);
      showToast("Reopened. Fix it, then End execution again. Your end details are kept.", "info");
    } catch (e) {
      reportError(e, load);
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    try {
      setSub(await executionService.approveSubsection(subSectionId, sub.version));
      showToast(`${sub.name} approved`);
      if (approvalView) go("/approvals");
    } catch (e) {
      reportError(e, load);
      throw e;
    }
  };

  const reject = async (remark) => {
    try {
      setSub(await executionService.rejectSubsection(subSectionId, sub.version, remark));
      showToast(`${sub.name} sent back to fix`, "warning");
      if (approvalView) go("/approvals");
    } catch (e) {
      reportError(e, load);
      throw e;
    }
  };

  const endDone = Boolean(sub.end) && status !== "IN_PROGRESS";
  const stages = [
    {
      key: "initial",
      title: "Site condition",
      state: "done",
      meta: `${fmtDateTime(ic.capturedAt)} · ${mediaCount(ic)}`,
      content: (
        <Box>
          <KV
            rows={
              duct
                ? [
                    ["Terrain", ic.terrain],
                    ["Crossings", ic.crossing || "None"],
                    ["OFC side", ic.ofcSide],
                    ["Road", ic.roadFeatures],
                    ["Authority", ic.authorityName],
                    ["Note", ic.remarks],
                    ["Captured", [fmtDateTime(ic.capturedAt), sub.createdBy?.name].filter(Boolean).join(" · ")],
                  ]
                : [
                    ["Note", ic.remarks],
                    ["Captured", [fmtDateTime(ic.capturedAt), sub.createdBy?.name].filter(Boolean).join(" · ")],
                  ]
            }
          />
          {/* Before photos (older subsections) and the crossings' photos */}
          {(ic.photos?.length > 0 || ic.video) && (
            <Box sx={{ mt: 1 }}>
              <MediaStrip media={ic} />
            </Box>
          )}
          {ic.crossingPhotos?.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                Crossing photos
              </Typography>
              <MediaStrip media={{ photos: ic.crossingPhotos }} />
            </Box>
          )}
        </Box>
      ),
    },
    {
      key: "start",
      title: duct ? type?.pitA : "Start",
      state: sub.start ? "done" : status === "NOT_STARTED" ? "current" : "todo",
      meta: sub.start
        ? `${fmtDateTime(sub.start.at)} · ${duct ? "3 reference points" : "location"} · ${mediaCount(sub.start)}`
        : "Up next · tap Start execution",
      content: sub.start ? <PointView point={sub.start} /> : null,
    },
    {
      key: "entries",
      title: "Entries",
      state: status === "NOT_STARTED" ? "todo" : status === "IN_PROGRESS" ? "current" : "done",
      meta:
        status === "NOT_STARTED"
          ? "After the start is recorded"
          : duct
            ? `${countLabel(entries.length, "entry", "entries")} · ${fmtDistance(done)} of ${fmtDistance(sub.subSectionLength)}`
            : countLabel(entries.length, "entry", "entries"),
      content: status === "NOT_STARTED" ? null : <EntriesView sub={sub} editable={status === "IN_PROGRESS" && canExecute} onDelete={removeEntry} />,
    },
    {
      key: "end",
      title: duct ? type?.pitB : "End",
      state: endDone ? "done" : "todo",
      meta: endDone
        ? `${fmtDateTime(sub.end.at)} · ${duct ? "3 reference points" : "location"} · ${mediaCount(sub.end)}`
        : status === "IN_PROGRESS"
          ? "When the work is finished · tap End execution"
          : "After the entries",
      content: endDone ? <PointView point={sub.end} /> : null,
    },
    {
      key: "approval",
      title: "Approval",
      state: status === "APPROVED" ? "done" : status === "PENDING_APPROVAL" ? "current" : status === "REJECTED" ? "error" : "todo",
      meta:
        status === "APPROVED"
          ? `Approved ${fmtDateTime(sub.approval?.at)}`
          : status === "PENDING_APPROVAL"
            ? `Sent ${fmtDateTime(sub.end?.at)} · waiting for the Cluster Head and GIS Head`
            : status === "REJECTED"
              ? `Sent back by ${sub.approval?.by?.name || "a reviewer"} ${fmtDateTime(sub.approval?.at)}`
              : "The Cluster Head and GIS Head review it once the end is sent",
      content:
        status === "REJECTED" ? (
          <FixBox remark={sub.approval?.remark} text="Fix and resubmit reopens the execution. Your end details are kept." />
        ) : status === "PENDING_APPROVAL" || status === "APPROVED" ? (
          <ReviewSlots review={sub.review} />
        ) : null,
    },
  ];

  const actions = [];
  if (canExecute && status === "NOT_STARTED") {
    actions.push(
      <Button key="start" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => go(`/subsections/${subSectionId}/start`)}>
        Start execution
      </Button>
    );
  }
  if (canExecute && status === "IN_PROGRESS") {
    actions.push(
      <Button key="end" variant="outlined" startIcon={<FlagOutlinedIcon />} onClick={endOpen}>
        End
      </Button>,
      <Button key="entry" variant="contained" startIcon={<AddIcon />} onClick={openEntry}>
        Add entry
      </Button>
    );
  }
  if (canExecute && status === "REJECTED") {
    actions.push(
      <Button
        key="fix"
        variant="contained"
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <BuildOutlinedIcon />}
        onClick={reopen}
        disabled={busy}
      >
        Fix and resubmit
      </Button>
    );
  }
  if (canApprove && status === "PENDING_APPROVAL") {
    actions.push(<ApprovalActions key="approval" kind="subsection" name={sub.name} onApprove={approve} onReject={reject} />);
  }

  const pct = Math.min(100, Math.round((done / (sub.subSectionLength || 1)) * 100));
  const pitALabel = duct ? type?.pitA : "Start";
  const pitBLabel = duct ? type?.pitB : "End";
  return (
    <Box>
      {header}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            label="Planned (entered)"
            value={Math.round(sub.subSectionLength || 0)}
            suffix=" m"
            caption={sub.calculatedLength != null ? `Calculated from the points: ${fmtDistance(sub.calculatedLength)}` : "No calculated length: From or To missing"}
          />
        </Grid>
        {duct && (
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile label="Done" value={Math.round(done)} suffix=" m" meterValue={pct} caption={`${pct}% of planned`} />
          </Grid>
        )}
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            label={entries.length === 1 ? "Entry" : "Entries"}
            value={entries.length}
            caption={entries.length ? `Last ${fmtDateTime(entries[entries.length - 1].capturedAt)}` : "None yet"}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Status" value={statusOf(status).label} caption={type?.full} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {approvalView && (
            <SectionCard title="Check before approving" subtitle="Flags raised on this subsection">
              <FlagList flags={sub.flags} />
            </SectionCard>
          )}
          {(approvalView || endDone) && <SubsectionMediaCard sub={sub} pitALabel={pitALabel} pitBLabel={pitBLabel} />}
          {duct && can("mergePits") && !locked && sub.sectionInfo?.block?._id && (
            <NearbyPitsCard sub={sub} blockId={sub.sectionInfo.block._id} pitLabels={{ start: pitALabel, end: pitBLabel }} onChanged={load} />
          )}
          {approvalView && (
            <SectionCard title="Map" subtitle="Where everything was captured">
              <ApprovalMap sub={sub} pitALabel={pitALabel} pitBLabel={pitBLabel} />
            </SectionCard>
          )}
          <SectionCard title="Progress" subtitle="Site condition → start → entries → end → approval">
            <ProgressTrack stages={stages} />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <SectionCard title="Details" action={<ExecStatusPill status={status} />}>
            <DetailRow label="Type of work">
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <TypeTag type={type} />
                {type?.label}
              </Box>
            </DetailRow>
            <DetailRow label="Road">{sub.roadName}</DetailRow>
            <DetailRow label="Section">{sub.sectionInfo?.section?.name}</DetailRow>
            <DetailRow label="Block">{sub.sectionInfo?.block?.name}</DetailRow>
            <DetailRow label="From">{sub.fromLatLong}</DetailRow>
            <DetailRow label="To">{sub.toLatLong}</DetailRow>
            <DetailRow label="Created">{`${fmtDateTime(sub.createdAt)}${sub.createdBy?.name ? ` · ${sub.createdBy.name}` : ""}`}</DetailRow>
            <Link component="button" variant="body2" onClick={() => go(`/subsections/${subSectionId}/trenching`)} sx={{ mt: 1.5, fontWeight: 600 }}>
              Open the entries on the trenching page
            </Link>
          </SectionCard>
          <HistoryCard history={sub.history} />
        </Grid>
      </Grid>

      {actions.length > 0 && <StickyActionBar>{actions}</StickyActionBar>}

      <Dialog open={Boolean(sheet)} onClose={() => !busy && setSheet(null)} fullScreen={isPhone} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: "flex", alignItems: "flex-start" }}>
          <Box sx={{ flex: 1 }}>
            Add entry #{entries.length + 1}
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {sub.name}
            </Typography>
          </Box>
          <IconButton onClick={() => setSheet(null)} aria-label="Close" size="small" disabled={busy}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {sheet && previousEntry && (config?.entryCarryOver || []).length > 0 && (
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={copyPrevious} sx={{ mb: 1.5 }}>
              Copy from the previous entry
            </Button>
          )}
          {sheet && (
            <EntryForm
              typeOfWork={sub.typeOfWork}
              fields={fields}
              value={sheet.form}
              onUpdate={(fn) => setSheet((s) => (s ? { ...s, form: fn(s.form), errors: {} } : s))}
              errors={sheet.errors}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button
            variant="contained"
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            onClick={saveEntry}
            disabled={busy}
            fullWidth={isPhone}
          >
            Save entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubsectionJobPage;
