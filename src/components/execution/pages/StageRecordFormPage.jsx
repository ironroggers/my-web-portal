import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, Link, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../common/PageHeader";
import SectionCard from "../../common/SectionCard";
import executionService from "../../../services/executionService.jsx";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { distanceM, fmtDistance } from "../../../utils/executionFormat";
import ChipGroup from "../ChipGroup";
import GpsField from "../GpsField";
import MediaPicker from "../MediaPicker";
import { RefPointDialog, RefRow } from "../RefPoint";
import { StickyActionBar } from "../execUi";
import { anyPending, toMediaFile } from "../mediaItems";
import { blowingPreview, blowingRoute, chamberRows, copyRunDetails, draftErrors, emptyRecordForm, fieldShown, fillFromSubsection, landmarkText, lastCompleteRun, nextFromChamber, pitFor, recordBody, fieldPhotoRule, recordForm, refComplete, refSlots, refsFrom, stageMediaRule, submitErrors } from "../stageLogic";
import { attentionMessage, reportError, showToast } from "../toast";

const ofId = (x) => String(x?._id ?? "");

/** New or edit, for every stage, from config.stageFields */
const StageRecordFormPage = () => {
  const params = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { config } = useExecutionConfig();
  const [record, setRecord] = useState(null);
  const [sectionId, setSectionId] = useState(params.sectionId);
  const [stage, setStage] = useState(params.stage);
  const [stageData, setStageData] = useState(null);
  const [form, setForm] = useState(() => emptyRecordForm(search.get("pit") ? { pit: search.get("pit") } : {}));
  const [errors, setErrors] = useState({});
  // A blowing run's photo rule depends on its cable kind
  const rule = stageMediaRule(config, stage, form.values);
  const [picking, setPicking] = useState(null);
  // The reference point being added or edited: { index, value }
  const [refSheet, setRefSheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const rec = params.recordId ? await executionService.getStageRecord(params.recordId) : null;
        const sid = rec ? rec.section : params.sectionId;
        const st = rec ? rec.stage : params.stage;
        const [list, sec] = await Promise.all([executionService.getStageRecords(sid, st), executionService.getSection(sid)]);
        if (!live) return;
        setSectionId(sid);
        setStage(st);
        setStageData(list);
        setSection(sec);
        if (rec) {
          setRecord(rec);
          setForm(recordForm(rec));
        } else if (st === "BLOWING") {
          const fromChamber = nextFromChamber(list.records);
          if (fromChamber) setForm((f) => ({ ...f, values: { ...f.values, fromChamber } }));
        }
      } catch (e) {
        reportError(e);
      }
    })();
    return () => {
      live = false;
    };
  }, [params.recordId, params.sectionId, params.stage]);

  const fields = useMemo(() => config?.stageFields?.[stage] || [], [config, stage]);
  const meta = config?.stages?.[stage] || {};
  const options = { chambers: [], ductRuns: [], subsections: [], pits: [], couplingPoints: [], sectionEnds: [], ...stageData?.options };

  // Chamber: reference points, like a pit's
  const refsField = fields.find((f) => f.kind === "refs");
  const refRule = refsField ? config?.mediaRules?.[refsField.mediaRule] : null;
  const refs = refsField ? refSlots(form.refs, refsField.count) : [];
  const setRefs = (fn) => setForm((f) => ({ ...f, refs: fn(refSlots(f.refs, refsField.count)) }));
  const allPhotos = () => [...form.photos, ...refs.flatMap((r) => r.photos || []), ...Object.values(form.photoSets || {}).flat()];
  // Blowing: photos at each chamber
  const photoFieldAt = (end) => fields.find((f) => f.kind === "photos" && f.end === end && fieldShown(f, form.values));
  const setPhotoSet = (key, fn) => setForm((f) => ({ ...f, photoSets: { ...f.photoSets, [key]: fn({ photos: f.photoSets?.[key] || [], video: null }).photos } }));
  const backTo = record ? `/stage-records/${record._id}` : `/sections/${sectionId}/stages/${stage}`;

  const set = (key, value) => {
    setForm((f) => ({ ...f, values: { ...f.values, [key]: value } }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // A new fix means the chamber isn't taken from a coupling point, GP or block router any more
  const setLocation = (fix) => {
    setForm((f) => ({ ...f, location: fix, values: stage === "CHAMBER" ? { ...f.values, atCoupling: "", atNode: "" } : f.values }));
    setErrors((e) => ({ ...e, location: undefined }));
  };

  const pickerRows = (f) => {
    if (f.target === "SUBSECTION") {
      return options.subsections.map((s) => {
        const taken = s.usedBy && String(s.usedBy.recordId) !== ofId(record);
        return { value: ofId(s), title: s.name, sub: s.noEndPit ? s.typeLabel : `${s.startPit} to ${s.endPit} · ${fmtDistance(s.doneM)}`, disabled: s.noEndPit || taken, why: taken ? `Has ${s.usedBy.name}` : s.notStarted ? "Not started" : s.noEndPit ? "End pit not marked" : "", raw: s };
      });
    }
    return chamberRows(options.chambers, f, form.values);
  };

  const choose = (f, row) => {
    setPicking(null);
    if (f.target === "SUBSECTION") {
      setForm((v) => ({ ...v, values: fillFromSubsection(v.values, row.raw) }));
      setErrors((e) => ({ ...e, [f.key]: undefined }));
    } else set(f.key, row.value);
  };

  // Chamber: at a coupling point, or at the section's GP or block router, copies its location.
  // It's one or the other, so picking one clears the other.
  // The pit's reference points come along, to edit if needed
  const pickCoupling = (value) => {
    const p = options.couplingPoints.find((x) => x.key === value);
    const copy = refsField && p?.refs?.length;
    setForm((v) => ({
      ...v,
      values: { ...v.values, atCoupling: value, atNode: value ? "" : v.values.atNode },
      location: p ? { latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy } : v.location,
      refs: copy ? refsFrom(p.refs, refsField.count) : v.refs,
    }));
    setErrors((e) => ({ ...e, location: undefined, atNode: undefined }));
    if (copy) showToast(`Reference points copied from ${p.name}. Check them and add a photo where missing.`, "info");
  };
  const pickNode = (value) => {
    const n = options.sectionEnds.find((x) => x.key === value);
    const has = n && n.latitude !== undefined && n.latitude !== null;
    setForm((v) => ({ ...v, values: { ...v.values, atNode: value, atCoupling: value ? "" : v.values.atCoupling }, location: has ? { latitude: n.latitude, longitude: n.longitude } : v.location }));
    setErrors((e) => ({ ...e, location: undefined, atNode: undefined }));
  };

  // Route Marker: beside a chamber copies its location, offset and position
  const pickBeside = (value) => {
    const c = options.chambers.find((x) => ofId(x) === value);
    setForm((v) => {
      const values = { ...v.values, beside: value };
      if (!c) return { ...v, values };
      values.offset = values.offset || (c.roadOffset !== undefined ? String(c.roadOffset) : "");
      values.position = values.position || c.position || "";
      const has = c.latitude !== undefined && c.latitude !== null;
      return { ...v, values, location: has ? { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy } : v.location };
    });
  };

  const save = () => {
    const body = recordBody(fields, form, toMediaFile, record?.version);
    return record ? executionService.updateStageRecord(record._id, body) : executionService.createStageRecord(sectionId, stage, body);
  };

  const fail = (e) => {
    setErrors(e.fieldErrors || {});
    reportError(e);
  };

  // A Zonal Manager or Admin editing a submitted record: it stays as it is, complete
  const submitted = record && record.status !== "IN_PROGRESS";

  const saveDraft = async () => {
    const found = submitted ? submitErrors(fields, form, rule, config?.mediaRules) : draftErrors(fields, form);
    if (Object.keys(found).length) {
      setErrors(found);
      showToast(submitted ? attentionMessage(found) : config?.stageDraftMessages?.[stage] || "Fill the marked fields first", "warning");
      return;
    }
    if (anyPending(allPhotos())) {
      showToast("Wait for the upload to finish", "warning");
      return;
    }
    try {
      setBusy(true);
      const saved = await save();
      showToast(submitted ? `${saved.name} saved` : `${saved.name} saved as draft`);
      navigate(`/sections/${sectionId}/stages/${stage}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const found = submitErrors(fields, form, rule, config?.mediaRules);
    if (Object.keys(found).length) {
      setErrors(found);
      showToast(attentionMessage(found), "error");
      return;
    }
    if (anyPending(allPhotos())) {
      showToast("Wait for the upload to finish", "warning");
      return;
    }
    try {
      setBusy(true);
      const saved = await save();
      // A failed submit leaves a saved draft, so the next try updates it
      setRecord(saved);
      await executionService.submitStageRecord(saved._id, saved.version);
      showToast(`${saved.name} sent to the Cluster Head and GIS Head`);
      navigate(`/sections/${sectionId}/stages/${stage}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const label = (f) => (
    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
      {f.label}
      {!f.required && (
        <Typography component="span" variant="caption" sx={{ color: "text.secondary", fontWeight: 400 }}>
          {" "}
          {f.chips ? f.hint : "optional"}
        </Typography>
      )}
    </Typography>
  );

  const nearestChamber =
    stage === "CHAMBER" && form.location
      ? options.chambers
          .filter((c) => ofId(c) !== ofId(record) && c.latitude !== undefined && c.latitude !== null)
          .map((c) => ({ name: c.name, m: distanceM({ lat: c.latitude, lng: c.longitude }, { lat: form.location.latitude, lng: form.location.longitude }) }))
          .sort((a, b) => a.m - b.m)[0]
      : null;

  const renderField = (f) => {
    if (!fieldShown(f, form.values)) return null;
    const error = errors[f.key];
    const value = form.values[f.key] ?? "";
    if (f.kind === "note") {
      return (
        <Alert key={f.key} severity="info" sx={{ mb: 2 }}>
          {f.text}
        </Alert>
      );
    }
    if (f.kind === "location") {
      return (
        <Box key={f.key}>
          <GpsField label={f.label} value={form.location} onChange={setLocation} error={errors.location} />
          {nearestChamber && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: -1, mb: 1.5 }}>
              {fmtDistance(nearestChamber.m)} from {nearestChamber.name}, the nearest chamber.
            </Typography>
          )}
        </Box>
      );
    }
    if (f.kind === "pit" && f.fixed) {
      const p = pitFor(options.pits, value);
      const point = options.couplingPoints.find((x) => x.key === p?.key);
      return (
        <Box key={f.key} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.label}</Typography>
          <Typography variant="body2">Pit: {[p?.name, p?.chainageM === null || p?.chainageM === undefined ? "" : `Ch ${p.chainageM} m`].filter(Boolean).join(" · ") || "–"}</Typography>
          {landmarkText(p) && <Typography variant="body2">Landmarks: {landmarkText(p)}</Typography>}
          {point && <Typography variant="body2">Ducts meeting: {point.ductNames.join(" and ")}</Typography>}
          <Typography variant="body2">Location: taken from the pit</Typography>
          {error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}
        </Box>
      );
    }
    if (f.kind === "pit" && f.chips) {
      const chips = options.couplingPoints.map((p) => ({ value: p.key, label: p.name }));
      return (
        <Box key={f.key} sx={{ mb: 2 }}>
          {label(f)}
          {chips.length ? <ChipGroup size="small" allowClear options={chips} value={pitFor(options.pits, value)?.key ?? ""} onChange={pickCoupling} /> : <Typography variant="body2">No coupling points yet.</Typography>}
          {error && (
            <Typography variant="caption" color="error" sx={{ display: "block" }}>
              {error}
            </Typography>
          )}
          {f.help && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {f.help}
            </Typography>
          )}
        </Box>
      );
    }
    if (f.kind === "refs") {
      const done = refs.filter((r) => refComplete(r, refRule?.minPhotos || 0)).length;
      return (
        <Box key={f.key} sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "baseline" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
              {f.label}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: done === f.count ? "success.main" : "text.secondary" }}>
              {done} of {f.count}
            </Typography>
          </Box>
          {f.hint && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              {f.hint}
            </Typography>
          )}
          {refs.map((r, i) => (
            <RefRow
              key={i}
              refPoint={r}
              index={i}
              targetLabel="chamber"
              minPhotos={refRule?.minPhotos || 0}
              bad={Object.keys(errors).some((k) => errors[k] && (k === `${f.key}.${i}` || k.startsWith(`${f.key}.${i}.`)))}
              onClick={() => setRefSheet({ index: i, value: { ...r } })}
            />
          ))}
          {error && (
            <Typography variant="caption" color="error" sx={{ display: "block" }}>
              {error}
            </Typography>
          )}
        </Box>
      );
    }
    if (f.kind === "node" && f.chips) {
      const chips = options.sectionEnds.map((n) => ({ value: n.key, label: n.name }));
      return (
        <Box key={f.key} sx={{ mb: 2 }}>
          {label(f)}
          {chips.length ? <ChipGroup size="small" allowClear options={chips} value={value} onChange={pickNode} /> : <Typography variant="body2">This section has no GP or block router ends.</Typography>}
          {error && (
            <Typography variant="caption" color="error" sx={{ display: "block" }}>
              {error}
            </Typography>
          )}
          {f.help && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {f.help}
            </Typography>
          )}
        </Box>
      );
    }
    if (f.kind === "link" && f.chips) {
      const used = (stageData?.records || []).filter((r) => r._id !== record?._id).map((r) => r.linked?.beside?._id);
      const chips = options.chambers.filter((c) => !used.includes(c._id)).map((c) => ({ value: ofId(c), label: c.name }));
      return (
        <Box key={f.key} sx={{ mb: 2 }}>
          {label(f)}
          {chips.length ? <ChipGroup size="small" allowClear options={chips} value={value} onChange={pickBeside} /> : <Typography variant="body2">Every chamber has a marker.</Typography>}
        </Box>
      );
    }
    if (f.kind === "link") {
      const row = pickerRows(f).find((x) => x.value === value);
      return (
        <Box key={f.key} sx={{ mb: 2 }}>
          {label(f)}
          <Button fullWidth variant="outlined" color={error ? "error" : "inherit"} onClick={() => setPicking(f)} sx={{ justifyContent: "flex-start", textTransform: "none", color: row ? "text.primary" : "text.secondary" }}>
            {row ? row.title : f.placeholder}
          </Button>
          {error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}
        </Box>
      );
    }
    if (f.kind === "choice") {
      const labels = config?.optionLabels?.[f.options] || {};
      return (
        <Box key={f.key} sx={{ mb: 2 }}>
          {label(f)}
          <ChipGroup allowClear={!f.draft} error={Boolean(error)} options={(config?.options?.[f.options] || []).map((o) => ({ value: o, label: labels[o] || o }))} value={value} onChange={(v) => set(f.key, v)} />
          {error && (
            <Typography variant="caption" color="error" sx={{ display: "block" }}>
              {error}
            </Typography>
          )}
          {f.hint && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {f.hint}
            </Typography>
          )}
          {f.routeHint && section?.fromNode?.name && (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              As seen going from {section.fromNode.name} to {section.toNode?.name}.
            </Typography>
          )}
        </Box>
      );
    }
    return (
      <Box key={f.key} sx={{ mb: 2 }}>
        {label(f)}
        <TextField
          fullWidth
          size="small"
          type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"}
          value={value}
          placeholder={f.placeholder}
          error={Boolean(error)}
          helperText={error}
          onChange={(e) => set(f.key, e.target.value)}
        />
      </Box>
    );
  };

  const groups = useMemo(() => {
    const out = [{ title: null, fields: [] }];
    fields
      .filter((f) => !f.end)
      .forEach((f) => {
        if (f.group) out.push({ title: f.group, fields: [] });
        out[out.length - 1].fields.push(f);
      });
    return out;
  }, [fields]);

  const runs = stageData?.records || [];
  const lastRun = stage === "DUCTING" ? lastCompleteRun(runs, record?._id) : null;
  const preview = stage === "BLOWING" ? blowingPreview(form.values) : null;
  // The meter readings are for a new cable only
  const showReadings = fields.some((f) => f.end && f.kind === "number" && fieldShown(f, form.values));
  const chamberName = (id, fallback) => options.chambers.find((c) => String(c._id) === id)?.name || fallback;
  const blowRoute = stage === "BLOWING" ? blowingRoute(options, form.values) : null;
  const subPicked = stage === "DUCTING" && options.subsections.find((s) => ofId(s) === form.values.subSection);
  const sentBack = record?.status === "IN_PROGRESS" && record.approval?.status === "REJECTED" ? record.approval : null;

  // Blowing: one card per chamber, its meter readings with the loop (a new cable only) and its photos
  const readingEnd = (end, title, loop) => {
    const photoField = photoFieldAt(end);
    return (
      <SectionCard key={end} title={`At ${title}`} sx={{ mb: 2 }}>
        {showReadings && (
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
            {[`${end}In`, `${end}Out`].map((key) => {
              const f = fields.find((x) => x.key === key);
              return <TextField key={key} size="small" type="number" label={f?.label} value={form.values[key] ?? ""} error={Boolean(errors[key])} placeholder={f?.placeholder} onChange={(e) => set(key, e.target.value)} />;
            })}
            <TextField size="small" label="Loop" value={loop === null ? "–" : `${loop} m`} disabled />
          </Box>
        )}
        {showReadings && (errors[`${end}In`] || errors[`${end}Out`]) && (
          <Typography variant="caption" color="error">
            Enter both meter readings
          </Typography>
        )}
        {photoField && (
          <Box sx={{ mt: showReadings ? 2.5 : 0 }}>
            <MediaPicker
              title={`Photos at ${title}`}
              rule={fieldPhotoRule(config?.mediaRules, photoField, form.values)}
              value={{ photos: form.photoSets?.[photoField.key] || [], video: null }}
              onUpdate={(fn) => {
                setPhotoSet(photoField.key, fn);
                setErrors((e) => ({ ...e, [photoField.key]: undefined }));
              }}
              errors={{ photos: errors[photoField.key] }}
            />
          </Box>
        )}
      </SectionCard>
    );
  };

  if (!stageData || !config) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      <PageHeader title={record ? `Edit ${record.name}` : `New ${meta.one}`} subtitle={section?.name} actions={<Button variant="outlined" onClick={() => navigate(backTo)}>Cancel</Button>} />
      {sentBack && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>{sentBack.by?.name || "A reviewer"} sent this back.</strong> {sentBack.remark}
        </Alert>
      )}
      <Box sx={{ p: 1.5, mb: 2, borderRadius: 1, bgcolor: "action.hover" }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Name · generated
        </Typography>
        <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
          {record?.name || "Given when saved"}
        </Typography>
      </Box>
      {groups.map((g, i) => (
        <SectionCard key={g.title || i} title={g.title || meta.label} sx={{ mb: 2 }}>
          {g.title === "Duct details" && lastRun && !form.values.ductSize && (
            <Link component="button" variant="body2" sx={{ mb: 1.5 }} onClick={() => setForm((v) => ({ ...v, values: copyRunDetails(v.values, fields, lastRun) }))}>
              Copy from {lastRun.name}
            </Link>
          )}
          {g.fields.map((f) => (
            <Box key={f.key}>
              {renderField(f)}
              {f.key === "subSection" && subPicked && (
                <Box sx={{ p: 1.25, mb: 2, borderRadius: 1, bgcolor: "action.hover" }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
                    Filled from {subPicked.name}
                  </Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>Start pit: {[subPicked.startPit, subPicked.startPitM === null ? "" : `Ch ${subPicked.startPitM} m`].filter(Boolean).join(" · ")}</Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>End pit: {[subPicked.endPit, subPicked.endPitM === null ? "" : `Ch ${subPicked.endPitM} m`].filter(Boolean).join(" · ")}</Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>Method: {subPicked.typeLabel}, underground</Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>Road: {[subPicked.roadName, subPicked.side].filter(Boolean).join(", ")}</Typography>
                </Box>
              )}
            </Box>
          ))}
        </SectionCard>
      ))}
      {blowRoute?.uncoveredM > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {fmtDistance(blowRoute.uncoveredM)} between {blowRoute.from} and {blowRoute.to} has no duct recorded. You can still save this.
        </Alert>
      )}
      {blowRoute?.through.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Passes through {blowRoute.through.join(", ")}.
        </Alert>
      )}
      {preview && readingEnd("from", chamberName(form.values.fromChamber, "From chamber"), preview.fromLoopM)}
      {preview && readingEnd("to", chamberName(form.values.toChamber, "To chamber"), preview.toLoopM)}
      {preview && showReadings && (
        <>
          <Alert severity="success" icon={false} sx={{ mb: 2 }}>
            Blown length: <strong>{preview.blownM === null ? "–" : fmtDistance(preview.blownM)}</strong> · Cable In at {chamberName(form.values.toChamber, "To")} minus Cable Out at {chamberName(form.values.fromChamber, "From")}
          </Alert>
        </>
      )}
      {/* A stage whose photos sit elsewhere (Blowing: at each chamber) has none of its own */}
      <SectionCard title={rule?.maxPhotos ? "Photos and remarks" : "Remarks"} sx={{ mb: 2 }}>
        {rule?.maxPhotos > 0 && (
          <MediaPicker
            title="Geo photos"
            rule={rule}
            value={{ photos: form.photos, video: null }}
            onUpdate={(fn) => setForm((f) => ({ ...f, photos: fn({ photos: f.photos, video: null }).photos }))}
            errors={{ photos: errors.photos }}
          />
        )}
        <TextField fullWidth multiline minRows={2} label="Remarks (optional)" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} sx={{ mt: rule?.maxPhotos ? 2 : 0 }} />
      </SectionCard>
      <StickyActionBar>
        <Button variant="outlined" disabled={busy} onClick={saveDraft}>
          {submitted ? "Save changes" : "Save draft"}
        </Button>
        {!submitted && (
          <Button variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />} onClick={submit}>
            Submit
          </Button>
        )}
      </StickyActionBar>
      {refsField && (
        <RefPointDialog
          open={Boolean(refSheet)}
          index={refSheet?.index ?? 0}
          value={refSheet?.value}
          onChange={(value) => setRefSheet((x) => ({ ...x, value }))}
          mediaRule={refRule}
          onUpdateMedia={(fn) => {
            const i = refSheet?.index;
            const apply = (h) => ({ ...h, ...fn({ photos: h.photos || [], video: null }) });
            setRefSheet((x) => (x && x.index === i ? { ...x, value: apply(x.value) } : x));
            // An upload that finishes after the point was saved still lands in the saved point
            setRefs((list) =>
              list.map((r, j) => {
                if (j !== i) return r;
                const next = apply(r);
                return { ...r, photos: (r.photos || []).map((m) => (m.key ? next.photos.find((x) => x.key === m.key) || m : m)) };
              })
            );
          }}
          pit={form.location}
          pitLabel="Chamber"
          subName={record?.name}
          targetLabel="chamber"
          onClose={() => setRefSheet(null)}
          onSave={(value) => {
            const i = refSheet.index;
            setRefs((list) => list.map((r, j) => (j === i ? value : r)));
            setRefSheet(null);
            setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== "refs" && k !== `refs.${i}` && !k.startsWith(`refs.${i}.`))));
          }}
        />
      )}
      <Dialog open={Boolean(picking)} onClose={() => setPicking(null)} fullWidth maxWidth="xs">
        <DialogTitle>{picking?.label}</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {picking && (
            <List dense>
              {pickerRows(picking).map((row) => (
                <ListItemButton key={row.value} disabled={Boolean(row.disabled)} selected={form.values[picking.key] === row.value} onClick={() => choose(picking, row)}>
                  <ListItemText primary={row.title} secondary={row.why ? `${row.sub} · ${row.why}` : row.sub} />
                </ListItemButton>
              ))}
              {!pickerRows(picking).length && (
                <Typography variant="body2" sx={{ p: 2 }}>
                  Nothing to pick yet.
                </Typography>
              )}
              {!picking.required && form.values[picking.key] && (
                <ListItemButton
                  onClick={() => {
                    set(picking.key, "");
                    setPicking(null);
                  }}
                >
                  <ListItemText primary="Clear" />
                </ListItemButton>
              )}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StageRecordFormPage;
