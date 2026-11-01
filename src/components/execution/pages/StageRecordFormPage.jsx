import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, Link, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../common/PageHeader";
import SectionCard from "../../common/SectionCard";
import executionService from "../../../services/executionService.jsx";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtDistance } from "../../../utils/executionFormat";
import ChipGroup from "../ChipGroup";
import GpsField from "../GpsField";
import MediaPicker from "../MediaPicker";
import { StickyActionBar } from "../execUi";
import { anyPending, toMediaFile } from "../mediaItems";
import { blowingPreview, copyRunDetails, draftErrors, emptyRecordForm, fieldShown, fillFromSubsection, lastCompleteRun, recordBody, recordForm, submitErrors } from "../stageLogic";
import { attentionMessage, reportError, showToast } from "../toast";

const ofId = (x) => String(x?._id ?? "");

/** New or edit, for every stage, from config.stageFields */
const StageRecordFormPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { config } = useExecutionConfig();
  const [record, setRecord] = useState(null);
  const [sectionId, setSectionId] = useState(params.sectionId);
  const [stage, setStage] = useState(params.stage);
  const [stageData, setStageData] = useState(null);
  const [form, setForm] = useState(emptyRecordForm());
  const [errors, setErrors] = useState({});
  const [picking, setPicking] = useState(null);
  const [pit, setPit] = useState(null);
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
  const rule = config?.mediaRules?.stageRecord;
  const options = stageData?.options || { chambers: [], ductRuns: [], subsections: [] };
  const limit = config?.pitSuggestionRadiusM ?? 3;
  const backTo = record ? `/stage-records/${record._id}` : `/sections/${sectionId}/stages/${stage}`;

  const set = (key, value) => {
    setForm((f) => ({ ...f, values: { ...f.values, [key]: value } }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setLocation = (fix) => {
    setForm((f) => ({ ...f, location: fix }));
    setErrors((e) => ({ ...e, location: undefined }));
    setPit(null);
    if (stage === "CHAMBER" && fix) {
      executionService.getChamberPit(sectionId, fix.latitude, fix.longitude).then((r) => setPit(r.suggestion)).catch(() => null);
    }
  };

  const pickerRows = (f) => {
    if (f.target === "SUBSECTION") {
      return options.subsections.map((s) => {
        const taken = s.usedBy && String(s.usedBy.recordId) !== ofId(record);
        return { value: ofId(s), title: s.name, sub: `${s.typeLabel} · ${fmtDistance(s.doneM)} excavated`, disabled: s.notStarted || taken, why: taken ? `Has ${s.usedBy.name}` : s.notStarted ? "Not started" : "", raw: s };
      });
    }
    if (f.target === "DUCTING") {
      const other = f.key === "joinedTo" ? "ductRun" : "joinedTo";
      return options.ductRuns.map((d) => ({ value: ofId(d), title: d.name, sub: `${d.subsectionName} · ${fmtDistance(d.lengthM || 0)}`, disabled: ofId(d) === form.values[other] }));
    }
    const other = { fromChamber: "toChamber", toChamber: "fromChamber" }[f.key];
    return options.chambers
      .filter((c) => ofId(c) !== ofId(record) && (!f.nonJointOnly || !["BJC", "SJC"].includes(c.type)))
      .map((c) => ({ value: ofId(c), title: c.name, sub: [c.typeLabel, c.chainageM !== null && c.chainageM !== undefined ? `Ch ${c.chainageM} m` : ""].filter(Boolean).join(" · "), disabled: other && ofId(c) === form.values[other] }));
  };

  const choose = (f, row) => {
    setPicking(null);
    if (f.target === "SUBSECTION") {
      setForm((v) => ({ ...v, values: fillFromSubsection(v.values, row.raw, options.chambers, limit) }));
      setErrors((e) => ({ ...e, [f.key]: undefined }));
    } else set(f.key, row.value);
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
    const found = submitted ? submitErrors(fields, form, rule) : draftErrors(fields, form);
    if (Object.keys(found).length) {
      setErrors(found);
      showToast(submitted ? attentionMessage(found) : config?.stageDraftMessages?.[stage] || "Fill the marked fields first", "warning");
      return;
    }
    if (anyPending(form.photos)) {
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
    const found = submitErrors(fields, form, rule);
    if (Object.keys(found).length) {
      setErrors(found);
      showToast(attentionMessage(found), "error");
      return;
    }
    if (anyPending(form.photos)) {
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
          {pit && (
            <Button
              size="small"
              sx={{ mt: -1, mb: 1.5 }}
              onClick={() => {
                setForm((v) => ({ ...v, location: { latitude: pit.latitude, longitude: pit.longitude, accuracy: pit.accuracy, pitFrom: pit.subSection } }));
                setPit(null);
                showToast("Using the pit location");
              }}
            >
              Use the {String(pit.pitLabel || "pit").toLowerCase()} of {pit.name}, {pit.distanceM} m away
            </Button>
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
  const chamberName = (id, fallback) => options.chambers.find((c) => ofId(c) === id)?.name || fallback;
  const subPicked = stage === "DUCTING" && options.subsections.find((s) => ofId(s) === form.values.subSection);
  const sentBack = record?.status === "IN_PROGRESS" && record.approval?.status === "REJECTED" ? record.approval : null;

  const readingEnd = (end, title, loop) => (
    <SectionCard key={end} title={`At ${title}`} sx={{ mb: 2 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
        {[`${end}In`, `${end}Out`].map((key) => {
          const f = fields.find((x) => x.key === key);
          return <TextField key={key} size="small" type="number" label={f?.label} value={form.values[key] ?? ""} error={Boolean(errors[key])} placeholder={f?.placeholder} onChange={(e) => set(key, e.target.value)} />;
        })}
        <TextField size="small" label="Loop" value={loop === null ? "–" : `${loop} m`} disabled />
      </Box>
      {(errors[`${end}In`] || errors[`${end}Out`]) && (
        <Typography variant="caption" color="error">
          Enter both meter readings
        </Typography>
      )}
    </SectionCard>
  );

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
                  {subPicked.startM !== null && subPicked.startM !== undefined && <Typography variant="caption" sx={{ display: "block" }}>Route: Ch {subPicked.startM} m to {subPicked.startM + subPicked.doneM} m</Typography>}
                  <Typography variant="caption" sx={{ display: "block" }}>Method: {subPicked.typeLabel}, underground</Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>Road: {[subPicked.roadName, subPicked.side].filter(Boolean).join(", ")}</Typography>
                </Box>
              )}
            </Box>
          ))}
        </SectionCard>
      ))}
      {preview && (
        <>
          {readingEnd("from", chamberName(form.values.fromChamber, "From chamber"), preview.fromLoopM)}
          {readingEnd("to", chamberName(form.values.toChamber, "To chamber"), preview.toLoopM)}
          <Alert severity="success" icon={false} sx={{ mb: 2 }}>
            Blown length: <strong>{preview.blownM === null ? "–" : fmtDistance(preview.blownM)}</strong> · Cable In at {chamberName(form.values.toChamber, "To")} minus Cable Out at {chamberName(form.values.fromChamber, "From")}
          </Alert>
        </>
      )}
      <SectionCard title="Photos and remarks" sx={{ mb: 2 }}>
        <MediaPicker
          title="Geo photos"
          rule={rule}
          value={{ photos: form.photos, video: null }}
          onUpdate={(fn) => setForm((f) => ({ ...f, photos: fn({ photos: f.photos, video: null }).photos }))}
          errors={{ photos: errors.photos }}
        />
        <TextField fullWidth multiline minRows={2} label="Remarks (optional)" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} sx={{ mt: 2 }} />
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
