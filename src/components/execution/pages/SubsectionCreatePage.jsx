import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Chip, CircularProgress, Grid, IconButton, InputAdornment, Step, StepLabel, Stepper, TextField, Tooltip, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import LinkIcon from "@mui/icons-material/Link";
import StraightenIcon from "@mui/icons-material/Straighten";
import PageHeader from "../../common/PageHeader";
import SectionCard from "../../common/SectionCard";
import DetailRow from "../../common/DetailRow";
import executionService from "../../../services/executionService.jsx";
import sectionsService from "../../../services/sectionsService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { distanceM, fmtDistance, fmtLatLong, isAboveLimit, parseLatLong, subsectionName } from "../../../utils/executionFormat";
import ChipGroup from "../ChipGroup";
import MediaPicker from "../MediaPicker";
import { anyPending, toMediaFile } from "../mediaItems";
import { CREATE_STEP_OF } from "../executionLogic";
import { useGpsSampler } from "../useGpsSampler";
import { PageState, StepLine, StickyActionBar } from "../execUi";
import { attentionMessage, reportError, showToast } from "../toast";
import { useExecContext } from "../useExecContext";

const EMPTY = {
  step: 0,
  typeOfWork: "",
  roadName: "",
  fromLatLong: "",
  toLatLong: "",
  subSectionLength: "",
  terrain: "",
  // Several crossings can apply; Others needs crossingOther
  crossings: [],
  crossingOther: "",
  crossingPhotos: [],
  ofcSide: "",
  roadFeatures: "",
  authorityName: "",
  remarks: "",
};

// Same checks as the server, one step at a time; messages from the prototype
const CHECKS = {
  work: (d) => {
    const e = {};
    if (!d.typeOfWork) e.typeOfWork = "Pick the type of work";
    if (!d.roadName.trim()) e.roadName = "Enter the road name";
    if (!parseLatLong(d.fromLatLong)) e.fromLatLong = "Use GPS or enter as lat, long";
    if (!parseLatLong(d.toLatLong)) e.toLatLong = "Use GPS or enter as lat, long";
    if (!(Number(d.subSectionLength) > 0)) e.subSectionLength = "Enter the length in metres";
    return e;
  },
  site: (d) => {
    const e = {};
    if (!d.terrain) e["initialCondition.terrain"] = "Pick the terrain";
    if (d.crossings.includes("Others") && !d.crossingOther.trim()) e["initialCondition.crossingOther"] = "Describe the other crossing";
    if (!d.ofcSide) e["initialCondition.ofcSide"] = "Pick the OFC side";
    return e;
  },
};

const FieldLabel = ({ children, optional }) => (
  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
    {children}
    {optional && (
      <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
        {" "}
        (optional)
      </Box>
    )}
  </Typography>
);

const ErrorText = ({ children }) =>
  children ? (
    <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5 }}>
      {children}
    </Typography>
  ) : null;

/** C7: New subsection (ducting only) — Work & location → Site condition */
const SubsectionCreatePage = () => {
  const { sectionId } = useParams();
  const { can } = usePermissions();
  const { config, typeOf, isDucting } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  const sampler = useGpsSampler({ seconds: config?.gpsSampleSec ?? 10, limit });
  const [section, setSection] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [d, setD] = useState(null);
  const [errors, setErrors] = useState({});
  const [seq, setSeq] = useState(null);
  const [existing, setExisting] = useState([]);
  const [locating, setLocating] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputs = { roadName: useRef(null), fromLatLong: useRef(null), toLatLong: useRef(null), subSectionLength: useRef(null) };
  const go = useExecContext(
    section ? { blockProfileId: section.blockProfile, blockProfileName: section.block, sectionId, sectionName: section.name } : { sectionId }
  );

  const load = useCallback(async () => {
    try {
      setLoadError("");
      setSection(await sectionsService.get(sectionId));
    } catch (e) {
      setLoadError(e.message || "Failed to load the section");
    }
  }, [sectionId]);

  // The form starts empty each time; nothing is kept on leaving it
  useEffect(() => {
    load();
    setD(EMPTY);
    executionService
      .previewName(sectionId)
      .then((r) => setSeq(r.seq))
      .catch(() => setSeq(null));
    executionService
      .listSubsections(sectionId)
      .then((r) => setExisting((r.items || []).filter((s) => s.typeOfWork)))
      .catch(() => setExisting([]));
  }, [sectionId, load]);

  const backTo = `/sections/${sectionId}/subsections`;
  const header = (
    <PageHeader
      title="New subsection"
      subtitle={section?.name}
      actions={
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go(backTo)}>
          Cancel
        </Button>
      }
    />
  );

  if (!d || !section || !config) {
    return (
      <Box>
        {header}
        <PageState error={loadError} onRetry={load} />
      </Box>
    );
  }

  if (!can("executeSubsection")) {
    return (
      <Box>
        {header}
        <PageState error="Creating subsections isn't available for your role." />
      </Box>
    );
  }

  const update = (fn) => setD((prev) => (typeof fn === "function" ? fn(prev) : { ...prev, ...fn }));
  const set = (key, value, errorKey = key) => {
    update({ [key]: value });
    setErrors((e) => ({ ...e, [errorKey]: undefined }));
  };

  // New subsections are ducting, so every one has a site condition step; no before photos
  const steps = ["work", "site"];
  const labels = steps.map((s) => config?.stepLabels?.[s] || s);
  const index = Math.min(d.step || 0, steps.length - 1);
  const step = steps[index];
  const type = typeOf(d.typeOfWork);
  const from = parseLatLong(d.fromLatLong);
  const to = parseLatLong(d.toLatLong);
  const straight = from && to ? Math.round(distanceM(from, to)) : null;
  const roads = [...new Set(existing.map((s) => s.roadName).filter(Boolean))];
  const ductSubs = existing.filter((s) => isDucting(s.typeOfWork)).sort((a, b) => a.seq - b.seq);
  // Continuity follows the duct route, so prefer the last ducting subsection
  const previous = ductSubs[ductSubs.length - 1] || existing[existing.length - 1];

  const fail = (e) => {
    setErrors(e);
    showToast(attentionMessage(e), "error");
    const firstText = ["roadName", "fromLatLong", "toLatLong", "subSectionLength"].find((k) => e[k]);
    if (firstText && inputs[firstText].current) inputs[firstText].current.focus();
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goTo = (i) => {
    update({ step: i });
    setErrors({});
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    const e = CHECKS[step](d);
    if (Object.keys(e).length) {
      fail(e);
      return;
    }
    goTo(index + 1);
  };

  const gpsInto = async (key) => {
    setLocating(key);
    try {
      const fix = await sampler.sample();
      set(key, fmtLatLong(fix.latitude, fix.longitude));
      showToast(`Location captured · ±${Number(fix.accuracy ?? 0).toFixed(1)} m`, isAboveLimit(fix.accuracy, limit) ? "warning" : "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLocating(null);
    }
  };

  const create = async () => {
    // Re-check every step and jump to the first one that fails
    for (let i = 0; i < steps.length; i++) {
      const e = CHECKS[steps[i]](d);
      if (Object.keys(e).length) {
        goTo(i);
        fail(e);
        return;
      }
    }
    if (anyPending(d.crossingPhotos)) {
      showToast("Wait for the uploads to finish", "warning");
      return;
    }
    const body = {
      section: sectionId,
      typeOfWork: d.typeOfWork,
      roadName: d.roadName.trim(),
      fromLatLong: d.fromLatLong,
      toLatLong: d.toLatLong,
      subSectionLength: Number(d.subSectionLength),
      initialCondition: {
        terrain: d.terrain,
        crossings: d.crossings,
        crossingOther: d.crossings.includes("Others") ? d.crossingOther.trim() : undefined,
        crossingPhotos: d.crossingPhotos.map(toMediaFile),
        ofcSide: d.ofcSide,
        roadFeatures: d.roadFeatures,
        authorityName: d.authorityName,
        remarks: d.remarks,
      },
    };
    try {
      setSaving(true);
      const created = await executionService.createSubsection(body);
      showToast(`${created.name} created · next: Start execution`);
      go(`/subsections/${created._id}`, { subSectionId: created._id, subSectionName: created.name }, { replace: true });
    } catch (err) {
      const fieldErrors = err.fieldErrors || {};
      const firstStep = steps.findIndex((s) => Object.keys(fieldErrors).some((k) => CREATE_STEP_OF[k] === s));
      if (firstStep >= 0) {
        goTo(firstStep);
        setErrors(fieldErrors);
      }
      reportError(err);
    } finally {
      setSaving(false);
    }
  };

  const textField = (key, label, props = {}) => (
    <TextField
      inputRef={inputs[key]}
      fullWidth
      size="small"
      label={label}
      value={String(d[key] ?? "")}
      onChange={(e) => set(key, e.target.value)}
      error={Boolean(errors[key])}
      helperText={errors[key]}
      {...props}
    />
  );

  const latLongField = (key, label, placeholder) =>
    textField(key, label, {
      placeholder,
      slotProps: {
        htmlInput: { style: { fontFamily: "monospace" }, autoCapitalize: "none" },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Use my location">
                <span>
                  <IconButton edge="end" onClick={() => gpsInto(key)} disabled={Boolean(locating)} aria-label={`Use my location for ${label}`}>
                    {locating === key ? <CircularProgress size={18} /> : <MyLocationIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
            </InputAdornment>
          ),
        },
      },
    });

  // Only ducting can be created (the server's createTypeOrder)
  const typeChips = (config?.createTypeOrder || (config?.typeOrder || []).filter(isDucting)).map((t) => ({ value: t, label: typeOf(t).label }));
  // A section end as "Karuvatta (GP)" or "Block router (BR)"
  const endName = (node) => (node?.name ? `${node.name} (${node.type === "GP" ? "GP" : "BR"})` : "");
  const fromName = endName(section?.fromNode);
  const toName = endName(section?.toNode);

  return (
    <Box>
      {header}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <StepLine labels={labels} index={index} />
      </Box>
      <Stepper activeStep={index} sx={{ display: { xs: "none", sm: "flex" }, mb: 3 }}>
        {labels.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          {step === "work" && (
            <>
              <SectionCard title={labels[index]} subtitle="Type of work, road and where it runs" contentSx={{ display: "grid", gap: 2.5 }}>
                <Box>
                  <FieldLabel>Type of work</FieldLabel>
                  <ChipGroup options={typeChips} value={d.typeOfWork} onChange={(v) => set("typeOfWork", v)} error={Boolean(errors.typeOfWork)} />
                  <ErrorText>{errors.typeOfWork}</ErrorText>
                </Box>
                <Box>
                  {textField("roadName", "Road name", { placeholder: "e.g. NH 66" })}
                  {roads.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <ChipGroup options={roads} value={null} onChange={(v) => set("roadName", v)} size="small" />
                    </Box>
                  )}
                </Box>
                <Box>
                  {latLongField("fromLatLong", "From (lat, long)", "9.280830, 76.458600")}
                  {previous?.toLatLong && (
                    <Chip
                      icon={<LinkIcon />}
                      label={`Continue from ${previous.name}`}
                      onClick={() => set("fromLatLong", previous.toLatLong)}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
                {latLongField("toLatLong", "To (lat, long)", "9.281700, 76.457900")}
                <Box>
                  {textField("subSectionLength", "Length (m)", { placeholder: "e.g. 120", slotProps: { htmlInput: { inputMode: "decimal" } } })}
                  {straight != null && Number(d.subSectionLength) > 0 && Number(d.subSectionLength) !== straight && (
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75 }}>
                      Entered {fmtDistance(Number(d.subSectionLength))} · calculated from the points {fmtDistance(straight)}. Both are kept.
                    </Typography>
                  )}
                  {straight != null ? (
                    <Chip
                      icon={<StraightenIcon />}
                      label={`Use straight-line distance · ${fmtDistance(straight)}`}
                      onClick={() => set("subSectionLength", String(straight))}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75 }}>
                      Fill From and To to get a suggested length.
                    </Typography>
                  )}
                </Box>
              </SectionCard>
            </>
          )}

          {step === "site" && (
            <SectionCard title={labels[index]} subtitle="The ground before work starts" contentSx={{ display: "grid", gap: 2.5 }}>
              <Box>
                <FieldLabel>Terrain</FieldLabel>
                <ChipGroup
                  options={config?.options?.terrain || []}
                  value={d.terrain}
                  onChange={(v) => set("terrain", v, "initialCondition.terrain")}
                  allowClear
                  error={Boolean(errors["initialCondition.terrain"])}
                />
                <ErrorText>{errors["initialCondition.terrain"]}</ErrorText>
              </Box>
              <Box>
                <FieldLabel optional>Crossings</FieldLabel>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
                  Pick every crossing on this stretch
                </Typography>
                <ChipGroup
                  multiple
                  options={config?.options?.crossing || []}
                  value={d.crossings}
                  onChange={(v) => set("crossings", v, "initialCondition.crossings")}
                />
                {d.crossings.includes("Others") && (
                  <Box sx={{ mt: 1.5 }}>
                    {textField("crossingOther", "Other crossing", {
                      placeholder: "e.g. Canal, pipeline",
                      error: Boolean(errors["initialCondition.crossingOther"]),
                      helperText: errors["initialCondition.crossingOther"],
                      onChange: (e) => set("crossingOther", e.target.value, "initialCondition.crossingOther"),
                    })}
                  </Box>
                )}
                {d.crossings.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <MediaPicker
                      title="Crossing photos (optional)"
                      rule={config?.mediaRules?.crossing || { minPhotos: 0, maxPhotos: 4, video: "none" }}
                      value={{ photos: d.crossingPhotos, video: null }}
                      onUpdate={(fn) => update((prev) => ({ ...prev, crossingPhotos: fn({ photos: prev.crossingPhotos, video: null }).photos }))}
                      errors={{ photos: errors["initialCondition.crossingPhotos"] }}
                    />
                  </Box>
                )}
              </Box>
              <Box>
                <FieldLabel>OFC side</FieldLabel>
                <ChipGroup
                  options={config?.options?.ofcSide || []}
                  value={d.ofcSide}
                  onChange={(v) => set("ofcSide", v, "initialCondition.ofcSide")}
                  allowClear
                  error={Boolean(errors["initialCondition.ofcSide"])}
                />
                <ErrorText>{errors["initialCondition.ofcSide"]}</ErrorText>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75 }}>
                  {fromName && toName ? (
                    <>
                      LHS / RHS as seen going from <b>{fromName}</b> to <b>{toName}</b>.
                    </>
                  ) : (
                    "LHS / RHS as seen going from the section's start (GP/BR) to its end (GP/BR)."
                  )}
                </Typography>
              </Box>
              {textField("roadFeatures", "Road features (optional)", { placeholder: "e.g. Two-lane bitumen road, drain on LHS", multiline: true, minRows: 2 })}
              {textField("authorityName", "Authority name (optional)", { placeholder: "e.g. PWD Roads, Harippad section" })}
              {textField("remarks", "Condition note (optional)", { placeholder: "e.g. Bitumen surface intact, no existing damage", multiline: true, minRows: 2 })}
            </SectionCard>
          )}

        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Subsection name" subtitle="Generated from the road, type of work and the next number">
            <Typography sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.375rem", color: "primary.dark", overflowWrap: "anywhere" }}>
              {subsectionName(d.roadName, type?.code, seq)}
            </Typography>
            <Box sx={{ mt: 1.5 }}>
              <DetailRow label="Section">{section?.name}</DetailRow>
              <DetailRow label="Type of work">{type?.full}</DetailRow>
              <DetailRow label="Road">{d.roadName.trim()}</DetailRow>
              <DetailRow label="Entered length">{Number(d.subSectionLength) > 0 ? `${d.subSectionLength} m` : null}</DetailRow>
              <DetailRow label="Calculated length">{straight != null ? `${fmtDistance(straight)} (straight line, From → To)` : null}</DetailRow>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>

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
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />} onClick={create} disabled={saving}>
            Create subsection
          </Button>
        )}
      </StickyActionBar>
    </Box>
  );
};

export default SubsectionCreatePage;
