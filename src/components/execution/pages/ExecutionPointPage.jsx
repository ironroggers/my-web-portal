import React, { useEffect, useState } from "react";
import { Box, Button, Card, CircularProgress, Step, StepLabel, Stepper, TextField, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SendIcon from "@mui/icons-material/Send";
import PlaceIcon from "@mui/icons-material/Place";
import StraightenIcon from "@mui/icons-material/Straighten";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PageHeader from "../../common/PageHeader";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtDateTimeLong, fmtDistance, pointOf } from "../../../utils/executionFormat";
import { clearDraft, loadDraft, saveDraft } from "../../../utils/drafts";
import GpsField from "../GpsField";
import MediaPicker from "../MediaPicker";
import { RefPointDialog, RefRow } from "../RefPoint";
import { EMPTY_POINT_DRAFT, checkPointStep, draftFromPoint, emptyPit, refDone } from "../executionLogic";
import { anyPending, toDraftMedia, toMediaFile } from "../mediaItems";
import { PageState, StepLine, StickyActionBar } from "../execUi";
import { attentionMessage, reportError, showToast } from "../toast";
import { contextOfSub, useExecContext } from "../useExecContext";

const CardHead = ({ icon, title, text, right }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
    <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {text}
      </Typography>
    </Box>
    {right}
  </Box>
);

// Drafts keep uploaded media only (localStorage can't hold files)
const toStoredDraft = (d) => ({ ...d, photos: d.photos.map(toDraftMedia).filter(Boolean), video: toDraftMedia(d.video) });

/** C9 / C11: Start or End execution. Ducting: pit + 3 reference points, then photos & video. */
const ExecutionPointPage = ({ which = "start" }) => {
  const { subSectionId } = useParams();
  const isStart = which === "start";
  const draftKey = `${which}:${subSectionId}`;
  const { can } = usePermissions();
  const { config, typeOf, isDucting } = useExecutionConfig();
  const [sub, setSub] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [d, setD] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const go = useExecContext(contextOfSub(sub));
  const jobUrl = `/subsections/${subSectionId}`;

  const loadSub = async () => {
    try {
      setLoadError("");
      const card = await executionService.getSubsection(subSectionId);
      setSub(card);
      return card;
    } catch (e) {
      setLoadError(e.message || "Failed to load the subsection");
      return null;
    }
  };

  // Restore the draft, else pre-fill: the previous end after a fix, or a nearby end pit for a start
  useEffect(() => {
    let active = true;
    (async () => {
      const card = await loadSub();
      const saved = loadDraft(draftKey);
      if (!active || !card) return;
      if (saved) {
        setD({ ...EMPTY_POINT_DRAFT, ...saved, photos: (saved.photos || []).filter(Boolean), video: saved.video || null });
        return;
      }
      if (!isStart && card.end) {
        setD(draftFromPoint(card.end));
        return;
      }
      if (isStart && card.typeOfWork) {
        try {
          const { suggestion } = await executionService.getStartPitSuggestion(subSectionId);
          if (suggestion && active) {
            const prefill = draftFromPoint({ pit: suggestion.pit });
            prefill.pit.copiedFrom = suggestion.subSection;
            prefill.pit.copiedFromName = suggestion.name;
            setD(prefill);
            return;
          }
        } catch {
          // no suggestion (or not ducting): start empty
        }
      }
      if (active) setD(EMPTY_POINT_DRAFT);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, attempt]);

  // Keep the draft (with its step and any open reference point) as it changes
  useEffect(() => {
    if (!d) return undefined;
    const timer = setTimeout(() => saveDraft(draftKey, toStoredDraft(d)), 300);
    return () => clearTimeout(timer);
  }, [d, draftKey]);

  const title = isStart ? "Start execution" : "End execution";
  const header = (
    <PageHeader
      title={title}
      subtitle={sub?.name}
      actions={
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go(jobUrl)}>
          Back to subsection
        </Button>
      }
    />
  );

  if (!sub || !d || !config) {
    return (
      <Box>
        {header}
        <PageState error={loadError} onRetry={() => setAttempt((n) => n + 1)} />
      </Box>
    );
  }

  const expected = isStart ? "NOT_STARTED" : "IN_PROGRESS";
  if (!can("executeSubsection") || sub.executionStatus !== expected) {
    return (
      <Box>
        {header}
        <PageState
          error={
            !can("executeSubsection")
              ? "Recording execution isn't available for your role."
              : isStart
                ? "This subsection has already started."
                : "Only a subsection in progress can be ended."
          }
        />
      </Box>
    );
  }

  const type = typeOf(sub.typeOfWork);
  const ducting = isDucting(sub.typeOfWork);
  const pitLabel = isStart ? type?.pitA : type?.pitB;
  const steps = ducting ? ["pit", "media"] : ["media"];
  const labels = steps.map((s) => (s === "pit" ? pitLabel : config?.stepLabels?.media || "Photos & video"));
  const index = Math.min(d.step || 0, steps.length - 1);
  const step = steps[index];
  const update = (fn) => setD((prev) => (typeof fn === "function" ? fn(prev) : { ...prev, ...fn }));
  const clearError = (key) => setErrors((e) => ({ ...e, [key]: undefined }));

  const goTo = (i) => {
    update({ step: i });
    setErrors({});
    window.scrollTo({ top: 0 });
  };

  const fail = (e) => {
    setErrors(e);
    showToast(attentionMessage(e), "error");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    const e = checkPointStep(step, d, ducting);
    if (Object.keys(e).length) {
      fail(e);
      return;
    }
    goTo(index + 1);
  };

  const submit = async () => {
    for (let i = 0; i < steps.length; i++) {
      const e = checkPointStep(steps[i], d, ducting);
      if (Object.keys(e).length) {
        goTo(i);
        fail(e);
        return;
      }
    }
    if (anyPending([...d.photos, d.video])) {
      showToast("Wait for the uploads to finish", "warning");
      return;
    }
    const body = {
      version: sub.version,
      photos: d.photos.map(toMediaFile),
      video: toMediaFile(d.video),
      remarks: d.remarks,
      ...(ducting
        ? {
            pit: {
              latitude: d.pit.latitude,
              longitude: d.pit.longitude,
              accuracy: d.pit.accuracy,
              copiedFrom: d.pit.copiedFrom,
              refs: d.pit.refs.map((r) => ({ ...r, tapeDistanceM: Number(r.tapeDistanceM) })),
            },
          }
        : { latitude: d.location.latitude, longitude: d.location.longitude, accuracy: d.location.accuracy }),
    };
    try {
      setSaving(true);
      if (isStart) await executionService.startSubsection(subSectionId, body);
      else await executionService.endSubsection(subSectionId, body);
      clearDraft(draftKey);
      showToast(isStart ? "Execution started · add entries as you go" : "Sent for approval");
      go(jobUrl, {}, { replace: true });
    } catch (err) {
      const fieldErrors = err.fieldErrors || {};
      if (Object.keys(fieldErrors).length) {
        const pitError = Object.keys(fieldErrors).some((k) => k.startsWith("pit"));
        goTo(pitError ? 0 : steps.length - 1);
        setErrors(fieldErrors);
      }
      reportError(err, loadSub);
    } finally {
      setSaving(false);
    }
  };

  const autoStamp = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary", mb: 2, px: 0.5 }}>
      <ScheduleIcon sx={{ fontSize: 16 }} />
      <Typography variant="body2" sx={{ color: "inherit" }}>
        {isStart ? "Start" : "End"} time is recorded automatically ·{" "}
        <Box component="b" sx={{ color: "text.primary" }}>
          {fmtDateTimeLong(Date.now())}
        </Box>
      </Typography>
    </Box>
  );

  const doneN = d.pit.refs.filter(refDone).length;
  const doneM = sub.doneM || 0;
  const off = !isStart && ducting && Math.abs(doneM - sub.subSectionLength) > (sub.subSectionLength * (config?.planDeviationPct ?? 10)) / 100;

  return (
    <Box sx={{ maxWidth: 760 }}>
      {header}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <StepLine labels={labels} index={index} />
      </Box>
      {steps.length > 1 && (
        <Stepper activeStep={index} sx={{ display: { xs: "none", sm: "flex" }, mb: 3 }}>
          {labels.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}

      {step === "pit" && (
        <>
          <Card sx={{ p: 2.5, mb: 2 }}>
            <CardHead
              icon={<PlaceIcon />}
              title={pitLabel}
              text="Stand on the pit and capture its GPS"
              right={
                pointOf(d.pit) && (
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "success.dark" }}>
                    Done
                  </Typography>
                )
              }
            />
            <GpsField
              value={pointOf(d.pit) ? d.pit : null}
              onChange={(fix) => {
                // A fresh fix replaces the copied pit
                update((p) => ({ ...p, pit: { ...p.pit, ...fix, copiedFrom: undefined, copiedFromName: undefined } }));
                clearError("pit.location");
              }}
              error={errors["pit.location"]}
            />
            {d.pit.copiedFrom && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(29,78,216,0.08)", borderRadius: 1, p: 1 }}>
                <AutoAwesomeIcon sx={{ fontSize: 16, color: "primary.dark" }} />
                <Typography variant="body2" sx={{ flex: 1, color: "primary.dark" }}>
                  Copied from the end pit of {d.pit.copiedFromName}. Check it on site.
                </Typography>
                <Button size="small" onClick={() => update({ pit: emptyPit() })}>
                  Clear
                </Button>
              </Box>
            )}
          </Card>
          <Card sx={{ p: 2.5, mb: 2 }}>
            <CardHead
              icon={<StraightenIcon />}
              title="Reference points"
              text="3 fixed objects near the pit, with the tape distance to each"
              right={
                <Typography variant="caption" sx={{ fontWeight: 700, color: doneN === 3 ? "success.dark" : "text.secondary" }}>
                  {doneN} of 3
                </Typography>
              }
            />
            {d.pit.refs.map((r, i) => (
              <RefRow
                key={i}
                refPoint={r}
                index={i}
                bad={["description", "location", "tapeDistanceM"].some((k) => errors[`pit.refs.${i}.${k}`])}
                onClick={() => update({ sheet: { index: i, value: { ...r } } })}
              />
            ))}
          </Card>
          {autoStamp}
        </>
      )}

      {step === "media" && (
        <>
          {!ducting && autoStamp}
          {!isStart && ducting && (
            <Box sx={{ display: "flex", gap: 1.25, p: 1.5, borderRadius: 1, mb: 2, bgcolor: off ? "rgba(180,83,9,0.1)" : "action.hover" }}>
              {off ? <WarningAmberIcon sx={{ color: "warning.dark" }} /> : <StraightenIcon sx={{ color: "text.secondary" }} />}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Executed {fmtDistance(doneM)} of {fmtDistance(sub.subSectionLength)}
                </Typography>
                {/* TODO(confirm): whether the note becomes required when more than 10% off */}
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {off ? "More than 10% off the plan. Explain it in the note." : "Matches the planned length."}
                </Typography>
              </Box>
            </Box>
          )}
          {!ducting && (
            <Card sx={{ p: 2.5, mb: 2 }}>
              <GpsField
                label={isStart ? "Start location" : "End location"}
                value={d.location}
                onChange={(fix) => {
                  update({ location: fix });
                  clearError("location");
                }}
                error={errors.location}
              />
            </Card>
          )}
          <Card sx={{ p: 2.5 }}>
            <MediaPicker
              rule={config?.mediaRules?.[which] || { minPhotos: 1, maxPhotos: 4, video: "required" }}
              value={{ photos: d.photos, video: d.video }}
              onUpdate={(fn) =>
                update((prev) => {
                  const media = fn({ photos: prev.photos, video: prev.video });
                  return { ...prev, photos: media.photos, video: media.video };
                })
              }
              errors={{ photos: errors.photos, video: errors.video }}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              label="Note (optional)"
              value={d.remarks}
              onChange={(e) => update({ remarks: e.target.value })}
              placeholder={isStart ? "e.g. Pit opened, machine positioned" : "e.g. Pit closed after duct exit, end cap fixed"}
              sx={{ mt: 2.5 }}
            />
          </Card>
        </>
      )}

      <StickyActionBar>
        {index > 0 && (
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => goTo(index - 1)}>
            Back
          </Button>
        )}
        {index < steps.length - 1 ? (
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={next}>
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : isStart ? <PlayArrowIcon /> : <SendIcon />}
            onClick={submit}
            disabled={saving}
          >
            {isStart ? "Start execution" : "Submit for approval"}
          </Button>
        )}
      </StickyActionBar>

      <RefPointDialog
        open={Boolean(d.sheet)}
        index={d.sheet?.index ?? 0}
        value={d.sheet?.value}
        onChange={(value) => update((p) => ({ ...p, sheet: { ...p.sheet, value } }))}
        pit={d.pit}
        pitLabel={pitLabel}
        subName={sub.name}
        onClose={() => update({ sheet: null })}
        onSave={(value) => {
          const i = d.sheet.index;
          update((p) => ({ ...p, sheet: null, pit: { ...p.pit, refs: p.pit.refs.map((r, j) => (j === i ? value : r)) } }));
          setErrors((e) => ({ ...e, [`pit.refs.${i}.description`]: undefined, [`pit.refs.${i}.location`]: undefined, [`pit.refs.${i}.tapeDistanceM`]: undefined }));
        }}
      />
    </Box>
  );
};

export default ExecutionPointPage;
