import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
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
import TimelineIcon from "@mui/icons-material/Timeline";
import PageHeader from "../../common/PageHeader";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { countLabel, fmtDateTime, fmtDistance } from "../../../utils/executionFormat";
import { clearDraft, loadDraft, saveDraft } from "../../../utils/drafts";
import ProgressTrack from "../ProgressTrack";
import EntriesView from "../EntriesView";
import EntryForm from "../EntryForm";
import ApprovalActions from "../ApprovalActions";
import ApprovalMap from "../ApprovalMap";
import { FlagList } from "../Flags";
import { MediaStrip } from "../MediaPicker";
import { FixBox, HistoryList, KV, PointView } from "../JobParts";
import { ExecStatusPill, PageState, StickyActionBar, TypeTag } from "../execUi";
import { carryOver, draftFromPoint, emptyEntry, entryBody, validateEntry } from "../executionLogic";
import { anyPending, toDraftMedia, toMediaFile } from "../mediaItems";
import { attentionMessage, reportError, showToast } from "../toast";
import { contextOfSub, useExecContext } from "../useExecContext";

const mediaCount = (holder) => `${countLabel(holder?.photos?.length || 0, "photo")}${holder?.video ? " · video" : ""}`;

const Kpi = ({ value, label }) => (
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <Typography sx={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
  </Box>
);

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
  const { can } = usePermissions();
  const { config, typeOf, isDucting } = useExecutionConfig();
  const [sub, setSub] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [sheet, setSheet] = useState(null); // { form, errors }
  const [busy, setBusy] = useState(false);
  const go = useExecContext(contextOfSub(sub));
  const entryDraftKey = `entry:${subSectionId}`;

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

  // Keep the entry dialog as a draft so it survives a reload
  useEffect(() => {
    if (!sheet) return undefined;
    const timer = setTimeout(() => saveDraft(entryDraftKey, { ...sheet.form, photo: toDraftMedia(sheet.form.photo) }), 300);
    return () => clearTimeout(timer);
  }, [sheet, entryDraftKey]);

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
  const canExecute = can("executeSubsection");
  const canApprove = can("approveExecution");
  const entries = sub.entries || [];
  const done = sub.doneM || 0;
  const ic = sub.initialCondition || {};

  const openEntry = () => {
    const saved = loadDraft(entryDraftKey);
    const last = entries[entries.length - 1];
    const form = saved ? { ...saved, photo: saved.photo || null } : carryOver(emptyEntry(fields), config?.entryCarryOver || [], last);
    setSheet({ form, errors: {} });
  };

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
      clearDraft(entryDraftKey);
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
      // The previous end details pre-fill the End steps
      if (card.previousEnd) saveDraft(`end:${subSectionId}`, draftFromPoint(card.previousEnd));
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
                    ["Crossing", ic.crossing || "None"],
                    ["OFC side", ic.ofcSide],
                    ["Road", ic.roadFeatures],
                    ["Authority", ic.authorityName],
                    ["Note", ic.remarks],
                  ]
                : [["Note", ic.remarks]]
            }
          />
          <Box sx={{ mt: 1 }}>
            <MediaStrip media={ic} />
          </Box>
        </Box>
      ),
    },
    {
      key: "start",
      title: duct ? type?.pitA : "Start",
      state: sub.start ? "done" : status === "NOT_STARTED" ? "current" : "todo",
      meta: sub.start ? `${fmtDateTime(sub.start.at)} · ${duct ? "3 reference points" : "location"} · ${mediaCount(sub.start)}` : "Up next · tap Start execution",
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
            ? `Sent ${fmtDateTime(sub.end?.at)} · waiting for the admin`
            : status === "REJECTED"
              ? `Sent back ${fmtDateTime(sub.approval?.at)}`
              : "The admin approves once the end is sent",
      content: status === "REJECTED" ? <FixBox remark={sub.approval?.remark} text="Fix and resubmit reopens the execution. Your end details are kept." /> : null,
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
      <Button key="fix" variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <BuildOutlinedIcon />} onClick={reopen} disabled={busy}>
        Fix and resubmit
      </Button>
    );
  }
  if (canApprove && status === "PENDING_APPROVAL") {
    actions.push(<ApprovalActions key="approval" kind="subsection" name={sub.name} onApprove={approve} onReject={reject} />);
  }

  return (
    <Box sx={{ maxWidth: 960 }}>
      {header}

      <Card sx={{ p: 2.5, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <TypeTag type={type} />
          <Box sx={{ flex: 1 }} />
          <ExecStatusPill status={status} />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1, color: "text.secondary", minWidth: 0 }}>
          <TimelineIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2" noWrap sx={{ color: "inherit", minWidth: 0 }}>
            {[sub.sectionInfo?.block?.name, sub.sectionInfo?.section?.name].filter(Boolean).join(" › ")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Kpi value={fmtDistance(sub.subSectionLength)} label="Planned" />
          {duct && <Kpi value={fmtDistance(done)} label="Done" />}
          <Kpi value={entries.length} label={entries.length === 1 ? "Entry" : "Entries"} />
        </Box>
        {duct && (
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.round((done / (sub.subSectionLength || 1)) * 100))}
            color={status === "APPROVED" ? "success" : "primary"}
            sx={{ mt: 1.5, height: 6, borderRadius: 3 }}
          />
        )}
        <Link component="button" variant="body2" onClick={() => go(`/subsections/${subSectionId}/trenching`)} sx={{ mt: 1.5 }}>
          Open the entries on the trenching page
        </Link>
      </Card>

      {approvalView && (
        <Card sx={{ p: 2.5, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Check before approving
          </Typography>
          <FlagList flags={sub.flags} />
          <Box sx={{ mt: 2 }}>
            <ApprovalMap sub={sub} pitALabel={duct ? type?.pitA : "Start"} pitBLabel={duct ? type?.pitB : "End"} />
          </Box>
        </Card>
      )}

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Progress
      </Typography>
      <Card sx={{ p: 2.5, mb: 2 }}>
        <ProgressTrack stages={stages} />
      </Card>

      <Card sx={{ p: 2 }}>
        <HistoryList history={sub.history} />
      </Card>

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
          <Button variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />} onClick={saveEntry} disabled={busy} fullWidth={isPhone}>
            Save entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubsectionJobPage;
