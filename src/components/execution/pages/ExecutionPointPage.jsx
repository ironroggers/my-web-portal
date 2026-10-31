import React, { useEffect, useState } from "react";
import { Alert, AlertTitle, Box, Button, CircularProgress, Step, StepLabel, Stepper, TextField, Typography } from "@mui/material";
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
import SectionCard from "../../common/SectionCard";
import StatusPill from "../../common/StatusPill";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtDateTimeLong, fmtDistance, pointOf } from "../../../utils/executionFormat";
import GpsField from "../GpsField";
import MediaPicker from "../MediaPicker";
import { RefPointDialog, RefRow } from "../RefPoint";
import { EMPTY_POINT_DRAFT, checkPointStep, draftFromPoint, emptyPit, refDone } from "../executionLogic";
import { anyPending, toMediaFile } from "../mediaItems";
import { PageState, StepLine, StickyActionBar } from "../execUi";
import { attentionMessage, reportError, showToast } from "../toast";
import { contextOfSub, useExecContext } from "../useExecContext";

// Media of the pit, its reference points and the step, for "wait for uploads" and the request
const allMedia = (d) => [...d.photos, d.video, ...(d.pit.photos || []), d.pit.video, ...d.pit.refs.flatMap((r) => [...(r.photos || []), r.video])];
const mediaOf = (holder = {}) => ({ photos: (holder.photos || []).map(toMediaFile), video: toMediaFile(holder.video) });

/** C9 / C11: Start or End execution. Ducting: pit + 3 reference points, then photos & video. */
const ExecutionPointPage = ({ which = "start" }) => {
  const { subSectionId } = useParams();
  const isStart = which === "start";
  const { can } = usePermissions();
  const { config, typeOf, isDucting } = useExecutionConfig();
  const [sub, setSub] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [d, setD] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // A neighbour's pit this start / end can copy (its end pit for a start, its start pit for
  // an end), with reference points, photos and video; offered, never filled in by itself
  const [suggestion, setSuggestion] = useState(null);
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

  // The form starts empty each time (nothing is kept on leaving it). End after "Fix and
  // resubmit" opens with the end that was sent; otherwise a start or end can be filled from
  // a neighbouring subsection's pit, but only when asked (suggestion)
  useEffect(() => {
    let active = true;
    (async () => {
      const card = await loadSub();
      if (!active || !card) return;
      if (!isStart && card.end) {
        setD(draftFromPoint(card.end));
        return;
      }
      setD(EMPTY_POINT_DRAFT);
      if (card.typeOfWork) {
        try {
          const result = await executionService.getPitSuggestion(subSectionId, isStart ? "start" : "end");
          if (active) setSuggestion(result.suggestion || null);
        } catch {
          // no suggestion (or not ducting)
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subSectionId, which, attempt]);

  // Fills the pit, its reference points and their photos and video from the suggested pit
  const applySuggestion = () => {
    const prefill = draftFromPoint({ pit: suggestion.pit });
    update((p) => ({ ...p, pit: { ...prefill.pit, copiedFrom: suggestion.subSection, copiedFromName: suggestion.name, copiedFromLabel: suggestion.pitLabel } }));
  };

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
  // Ducting is the pit step alone (start and end); other work has one location step
  const steps = ducting ? ["pit"] : ["media"];
  const mediaRule = config?.mediaRules?.[which] || { minPhotos: 1, maxPhotos: 4, video: "required" };
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
    const e = checkPointStep(step, d, ducting, mediaRule);
    if (Object.keys(e).length) {
      fail(e);
      return;
    }
    goTo(index + 1);
  };

  const submit = async () => {
    for (let i = 0; i < steps.length; i++) {
      const e = checkPointStep(steps[i], d, ducting, mediaRule);
      if (Object.keys(e).length) {
        goTo(i);
        fail(e);
        return;
      }
    }
    if (anyPending(allMedia(d))) {
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
              ...mediaOf(d.pit),
              refs: d.pit.refs.map((r) => ({ ...r, tapeDistanceM: Number(r.tapeDistanceM), ...mediaOf(r) })),
            },
          }
        : { latitude: d.location.latitude, longitude: d.location.longitude, accuracy: d.location.accuracy }),
    };
    try {
      setSaving(true);
      if (isStart) await executionService.startSubsection(subSectionId, body);
      else await executionService.endSubsection(subSectionId, body);
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
    <Box>
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
          {/* End: how much was executed against the plan */}
          {!isStart && (
            <Alert
              severity={off ? "warning" : "info"}
              icon={off ? <WarningAmberIcon fontSize="inherit" /> : <StraightenIcon fontSize="inherit" />}
              sx={{ mb: 3 }}
            >
              <AlertTitle sx={{ fontWeight: 600 }}>
                Executed {fmtDistance(doneM)} of {fmtDistance(sub.subSectionLength)}
              </AlertTitle>
              {/* TODO(confirm): whether the note becomes required when more than 10% off */}
              {off ? "More than 10% off the plan. Explain it in the note." : "Matches the planned length."}
            </Alert>
          )}

          <SectionCard
            title={pitLabel}
            subtitle="Stand on the pit and capture its GPS"
            icon={<PlaceIcon />}
            action={pointOf(d.pit) && <StatusPill label="Done" tone="success" />}
            sx={{ mb: 3 }}
          >
            {!isStart && sub.end?.pit?.merge?.id && (
              <Alert severity="info" sx={{ mb: 1.5 }}>
                This pit is merged with another subsection. Capturing GPS again takes it out of the merge.
              </Alert>
            )}
            <GpsField
              value={pointOf(d.pit) ? d.pit : null}
              onChange={(fix) => {
                // A fresh fix replaces the copied pit
                update((p) => ({ ...p, pit: { ...p.pit, ...fix, copiedFrom: undefined, copiedFromName: undefined, copiedFromLabel: undefined } }));
                clearError("pit.location");
              }}
              error={errors["pit.location"]}
            />
            {suggestion && !d.pit.copiedFrom && !pointOf(d.pit) && (
              <Alert
                severity="info"
                icon={<AutoAwesomeIcon fontSize="inherit" />}
                action={
                  <Button color="inherit" size="small" onClick={applySuggestion}>
                    Use it
                  </Button>
                }
                sx={{ mt: 1.5 }}
              >
                {suggestion.name}&apos;s {(suggestion.pitLabel || "pit").toLowerCase()} is {fmtDistance(suggestion.distanceM)} from the planned {isStart ? "start" : "end"}. Use it as this {isStart ? "start" : "end"}, with its 3 reference points, photos and video?
              </Alert>
            )}
            {d.pit.copiedFrom && (
              <Alert
                severity="info"
                icon={<AutoAwesomeIcon fontSize="inherit" />}
                action={
                  <Button color="inherit" size="small" onClick={() => update({ pit: emptyPit() })}>
                    Clear
                  </Button>
                }
              >
                Copied from {d.pit.copiedFromName ? `${d.pit.copiedFromName}'s ${(d.pit.copiedFromLabel || "pit").toLowerCase()}` : "another subsection"}: location, reference points, photos and video. Check it on site.
              </Alert>
            )}
            <Box sx={{ mt: 2 }}>
              <MediaPicker
                title={`${pitLabel} photos (optional)`}
                rule={config?.mediaRules?.pit || { minPhotos: 0, maxPhotos: 4, video: "optional" }}
                value={{ photos: d.pit.photos || [], video: d.pit.video || null }}
                onUpdate={(fn) => update((p) => ({ ...p, pit: { ...p.pit, ...fn({ photos: p.pit.photos || [], video: p.pit.video || null }) } }))}
                errors={{ photos: errors["pit.photos"], video: errors["pit.video"] }}
              />
            </Box>
          </SectionCard>
          <SectionCard
            title="Reference points"
            subtitle="3 fixed objects near the pit, with the tape distance to each"
            icon={<StraightenIcon />}
            action={<StatusPill label={`${doneN} of 3`} tone={doneN === 3 ? "success" : "default"} />}
            contentSx={{ py: 0 }}
            sx={{ mb: 3 }}
          >
            {d.pit.refs.map((r, i) => (
              <RefRow
                key={i}
                refPoint={r}
                index={i}
                bad={["description", "location", "tapeDistanceM", "photos", "video"].some((k) => errors[`pit.refs.${i}.${k}`])}
                onClick={() => update({ sheet: { index: i, value: { ...r } } })}
              />
            ))}
          </SectionCard>
          {/* No photos step for ducting, so the note is here */}
          <SectionCard title="Note" sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              label="Note (optional)"
              value={d.remarks}
              onChange={(e) => update({ remarks: e.target.value })}
              placeholder={isStart ? "e.g. Pit opened, machine positioned" : "e.g. Pit closed after duct exit, end cap fixed"}
            />
          </SectionCard>
          {autoStamp}
        </>
      )}

      {step === "media" && (
        <>
          {!ducting && autoStamp}

          {!ducting && (
            <SectionCard title={isStart ? "Start location" : "End location"} subtitle="Stand at the spot and capture GPS" icon={<PlaceIcon />} sx={{ mb: 3 }}>
              <GpsField
                value={d.location}
                onChange={(fix) => {
                  update({ location: fix });
                  clearError("location");
                }}
                error={errors.location}
              />
            </SectionCard>
          )}
          <SectionCard
            title={config?.stepLabels?.media || "Photos & video"}
            subtitle={mediaRule.minPhotos > 0 ? "At least one photo and a video, then an optional note" : "Optional photos and video, and a note"}
          >
            <MediaPicker
              rule={mediaRule}
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
          </SectionCard>
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
        mediaRule={config?.mediaRules?.refPoint}
        onUpdateMedia={(fn) => {
          const i = d.sheet?.index;
          update((p) => {
            const apply = (h) => ({ ...h, ...fn({ photos: h.photos || [], video: h.video || null }) });
            // An upload that finishes after the point was saved still lands in the saved point
            // (only on items it already has; additions and removals wait for Save)
            const settle = (r) => {
              const next = apply(r);
              return {
                ...r,
                photos: (r.photos || []).map((m) => next.photos.find((x) => x.key === m.key) || m),
                video: r.video && next.video?.key === r.video.key ? next.video : r.video,
              };
            };
            return {
              ...p,
              sheet: p.sheet && p.sheet.index === i ? { ...p.sheet, value: apply(p.sheet.value) } : p.sheet,
              pit: { ...p.pit, refs: p.pit.refs.map((r, j) => (j === i ? settle(r) : r)) },
            };
          });
        }}
        pit={d.pit}
        pitLabel={pitLabel}
        subName={sub.name}
        onClose={() => update({ sheet: null })}
        onSave={(value) => {
          const i = d.sheet.index;
          update((p) => ({ ...p, sheet: null, pit: { ...p.pit, refs: p.pit.refs.map((r, j) => (j === i ? value : r)) } }));
          setErrors((e) => ({
            ...e,
            [`pit.refs.${i}.description`]: undefined,
            [`pit.refs.${i}.location`]: undefined,
            [`pit.refs.${i}.tapeDistanceM`]: undefined,
          }));
        }}
      />
    </Box>
  );
};

export default ExecutionPointPage;
