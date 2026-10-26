import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import blockProfileService from "../../services/blockProfileService.jsx";
import { useBlockPermissions } from "../../hooks/useBlockPermissions";
import PageHeader from "../common/PageHeader";
import SectionCard from "../common/SectionCard";
import { SITE_TYPES } from "./blockProfileConstants";
import { assetPrefix } from "./equipmentForms";

// District Census code and number of racks aren't on the form; saved values stay as they are
const TEXT_FIELDS = ["state", "stateCode", "district", "districtCode", "block", "blockCode", "remarks"];

const EMPTY_FORM = {
  state: "",
  stateCode: "",
  district: "",
  districtCode: "",
  block: "",
  blockCode: "",
  numberOfGps: "",
  numberOfRings: "",
  remarks: "",
  // The block router is the block's head node: sections start here
  blockRouter: { name: "", siteType: "", address: "", latitude: "", longitude: "" },
};

// rowId is only a React key; it isn't sent to the server
let gpRowId = 0;
const newGpRow = (gp = {}) => ({
  rowId: ++gpRowId,
  name: gp.name || "",
  lgdCode: gp.lgdCode || "",
  latitude: gp.latitude ?? "",
  longitude: gp.longitude ?? "",
  // The ring number (A01); the full code is built from the block's codes
  ringCode: String(gp.ringCode || "").match(/A\d{2}$/)?.[0] || "",
});

// Ring numbers follow the number of rings: A01, A02, …; a ring's code is SSDDDBBBBAAA, the
// state, district and block LGD codes + its number (the server builds the same codes)
const MAX_RINGS = 20;
const ringCodesFor = (count) =>
  /^\d+$/.test(String(count).trim()) && Number(count) <= MAX_RINGS
    ? Array.from({ length: Number(count) }, (_, i) => `A${String(i + 1).padStart(2, "0")}`)
    : [];

const toForm = (profile) => ({
  ...Object.fromEntries(TEXT_FIELDS.map((key) => [key, profile[key] || ""])),
  numberOfGps: profile.numberOfGps ?? "",
  numberOfRings: profile.rings?.length ? String(profile.rings.length) : "",
  blockRouter: {
    name: profile.blockRouter?.name || "",
    siteType: profile.blockRouter?.siteType || "",
    latitude: profile.blockRouter?.latitude ?? "",
    longitude: profile.blockRouter?.longitude ?? "",
    address: profile.blockRouter?.address || "",
  },
});

// LGD codes are digits only, of a fixed length (the server checks the same)
const CODE_DIGITS = { stateCode: 2, districtCode: 3, blockCode: 4 };
const GP_CODE_DIGITS = 6;
const digitsOnly = (value, length) => String(value).replace(/\D/g, "").slice(0, length);
const codeError = (value, length) => (/^\d+$/.test(String(value).trim()) && String(value).trim().length === length ? "" : `Enter ${length} digits`);

const isBlank = (value) => String(value ?? "").trim() === "";
const isWholeNumber = (value) => /^\d+$/.test(String(value).trim());
const hasPoint = ({ latitude, longitude }) => !isBlank(latitude) && !isBlank(longitude);

// Coordinates are optional, but latitude and longitude come as a pair
const validateCoordinates = (errors, prefix, { latitude, longitude }) => {
  if (isBlank(latitude) && isBlank(longitude)) return;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (isBlank(latitude)) errors[`${prefix}.latitude`] = "Required with a longitude";
  else if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors[`${prefix}.latitude`] = "Must be between -90 and 90";
  if (isBlank(longitude)) errors[`${prefix}.longitude`] = "Required with a latitude";
  else if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors[`${prefix}.longitude`] = "Must be between -180 and 180";
};

// Keys match the server's validation paths (blockRouter.latitude, gps.0.lgdCode)
const validate = (form, gps) => {
  const errors = {};
  if (isBlank(form.block)) errors.block = "Required";
  if (isBlank(form.blockCode)) errors.blockCode = "Required";
  Object.entries(CODE_DIGITS).forEach(([key, length]) => {
    if (!isBlank(form[key]) && codeError(form[key], length)) errors[key] = codeError(form[key], length);
  });
  if (isBlank(form.numberOfGps)) errors.numberOfGps = "Required";
  else if (!isWholeNumber(form.numberOfGps) || Number(form.numberOfGps) < 1) errors.numberOfGps = "Enter a whole number of 1 or more";

  validateCoordinates(errors, "blockRouter", form.blockRouter);

  if (!isBlank(form.numberOfRings) && (!isWholeNumber(form.numberOfRings) || Number(form.numberOfRings) > MAX_RINGS)) {
    errors.numberOfRings = `Enter a whole number up to ${MAX_RINGS}`;
  } else if (Number(form.numberOfRings) > 0 && !assetPrefix(form)) {
    errors.numberOfRings = "Ring codes need the state, district and block LGD codes";
  }

  const codeCounts = {};
  gps.forEach((gp) => {
    const code = gp.lgdCode.trim();
    if (code) codeCounts[code] = (codeCounts[code] || 0) + 1;
  });
  gps.forEach((gp, index) => {
    if (isBlank(gp.name)) errors[`gps.${index}.name`] = "Required";
    if (isBlank(gp.lgdCode)) errors[`gps.${index}.lgdCode`] = "Required";
    else if (codeError(gp.lgdCode, GP_CODE_DIGITS)) errors[`gps.${index}.lgdCode`] = codeError(gp.lgdCode, GP_CODE_DIGITS);
    else if (codeCounts[gp.lgdCode.trim()] > 1) errors[`gps.${index}.lgdCode`] = "Duplicate LGD code";
    validateCoordinates(errors, `gps.${index}`, gp);
  });
  return errors;
};

const toPayload = (form, gps) => {
  const rings = ringCodesFor(form.numberOfRings);
  const { name, siteType, latitude, longitude, address } = form.blockRouter;
  const hasRouterPoint = hasPoint(form.blockRouter);
  return {
    ...Object.fromEntries(TEXT_FIELDS.map((key) => [key, form[key].trim()])),
    numberOfGps: Number(form.numberOfGps),
    numberOfRings: isBlank(form.numberOfRings) ? null : Number(form.numberOfRings),
    gps: gps.map((gp) => ({
      name: gp.name.trim(),
      lgdCode: gp.lgdCode.trim(),
      // A GP on a ring that's no longer there goes back to not set
      ringCode: rings.includes(gp.ringCode) ? gp.ringCode : null,
      ...(hasPoint(gp) && { latitude: Number(gp.latitude), longitude: Number(gp.longitude) }),
    })),
    blockRouter: {
      name: name.trim(),
      siteType: siteType || null,
      latitude: hasRouterPoint ? Number(latitude) : null,
      longitude: hasRouterPoint ? Number(longitude) : null,
      address: address.trim(),
    },
  };
};

// A digits-only code input of a fixed length
const codeInput = (length) => ({ helperText: `${length} digits`, slotProps: { htmlInput: { inputMode: "numeric", maxLength: length } } });

const fieldGrid = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
  gap: 2,
};

// Name, LGD code, latitude, longitude and ring on one line from md up
const gpFieldGrid = {
  ...fieldGrid,
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    sm: "repeat(2, minmax(0, 1fr))",
    md: "minmax(0, 2fr) repeat(4, minmax(0, 1fr))",
  },
};

const BlockProfileFormPage = () => {
  const navigate = useNavigate();
  const { blockProfileId } = useParams();
  const isEdit = Boolean(blockProfileId);
  const { can, userId, loading: permissionsLoading, error: permissionsError } = useBlockPermissions();

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [gps, setGps] = useState([]);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!blockProfileId) return;
    blockProfileService
      .get(blockProfileId)
      .then((data) => {
        setProfile(data);
        setForm(toForm(data));
        setGps((data.gps || []).map((gp) => newGpRow(gp)));
      })
      .catch((e) => setLoadError(e.message || "Failed to load the block profile"));
  }, [blockProfileId]);

  const errors = useMemo(() => validate(form, gps), [form, gps]);

  // Format problems show while typing; "Required" waits until the field is left or the form submitted
  const fieldError = (key) => {
    if (serverErrors[key]) return serverErrors[key];
    const message = errors[key];
    if (!message) return "";
    return submitted || touched[key] || !message.startsWith("Required") ? message : "";
  };

  const clearServerError = (key) =>
    setServerErrors((previous) => {
      if (!previous[key]) return previous;
      const { [key]: _removed, ...rest } = previous;
      return rest;
    });

  const touch = (key) => () => setTouched((previous) => ({ ...previous, [key]: true }));

  const updateField = (key) => (event) => {
    const value = CODE_DIGITS[key] ? digitsOnly(event.target.value, CODE_DIGITS[key]) : event.target.value;
    setForm((previous) => ({ ...previous, [key]: value }));
    clearServerError(key);
  };

  // Fields of the block router
  const updateGroup = (group, key) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [group]: { ...previous[group], [key]: value } }));
    clearServerError(`${group}.${key}`);
  };

  const updateGp = (rowId, key) => (event) => {
    const value = key === "lgdCode" ? digitsOnly(event.target.value, GP_CODE_DIGITS) : event.target.value;
    setGps((previous) => previous.map((gp) => (gp.rowId === rowId ? { ...gp, [key]: value } : gp)));
    clearServerError("gps");
  };

  const addGp = () => setGps((previous) => [...previous, newGpRow()]);
  const removeGp = (rowId) => {
    setGps((previous) => previous.filter((gp) => gp.rowId !== rowId));
    // Row indexes shift, so per-row touched state no longer lines up
    setTouched((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith("gps."))));
    clearServerError("gps");
  };

  const textField = (key, label, { helperText, ...props } = {}) => (
    <TextField
      label={label}
      value={form[key]}
      onChange={updateField(key)}
      onBlur={touch(key)}
      error={Boolean(fieldError(key))}
      helperText={fieldError(key) || helperText}
      size="small"
      {...props}
    />
  );

  const handleSubmit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      setFormError("Fix the highlighted fields before saving.");
      return;
    }
    setFormError("");
    setServerErrors({});
    try {
      setSaving(true);
      const payload = toPayload(form, gps);
      const saved = isEdit
        ? await blockProfileService.update(blockProfileId, { ...payload, updatedBy: userId })
        : await blockProfileService.create({ ...payload, createdBy: userId });
      navigate(`/block-profiles/${saved._id}`, { replace: true });
    } catch (e) {
      setFormError(e.message || "Failed to save the block profile");
      setServerErrors(e.status === 409 ? { blockCode: e.message } : e.fieldErrors || {});
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => navigate(isEdit ? `/block-profiles/${blockProfileId}` : "/block-profiles");
  const title = isEdit ? "Edit block profile" : "New block profile";
  const header = (
    <PageHeader
      title={title}
      subtitle={isEdit ? profile && [profile.block, profile.district].filter(Boolean).join(", ") : "Add a block with its GPs and router"}
      actions={
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={cancel}>
          {isEdit ? "Back to block" : "Back to list"}
        </Button>
      }
    />
  );

  if (loadError) {
    return (
      <Box>
        {header}
        <Alert severity="error">{loadError}</Alert>
      </Box>
    );
  }

  if (permissionsLoading || (isEdit && !profile)) {
    return (
      <Box>
        {header}
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }

  const allowed = isEdit ? can("editBlockProfile", profile) : can("createBlockProfile");
  if (!allowed) {
    return (
      <Box>
        {header}
        <Alert severity={permissionsError ? "error" : "info"}>
          {permissionsError
            ? `Couldn't check your permissions: ${permissionsError}`
            : isEdit
              ? "You can't edit this block profile."
              : "Your role can't create block profiles."}
        </Alert>
      </Box>
    );
  }

  const rings = ringCodesFor(form.numberOfRings);
  const ringPrefix = assetPrefix(form);
  const declared = isWholeNumber(form.numberOfGps) && Number(form.numberOfGps) >= 1 ? Number(form.numberOfGps) : null;

  return (
    <Box>
      {header}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Block" subtitle="Names and LGD codes" sx={{ height: "100%" }}>
            <Box sx={fieldGrid}>
              {textField("block", "Block name", { required: true })}
              {textField("blockCode", "Block LGD code", { required: true, ...codeInput(4) })}
              {textField("district", "District")}
              {textField("districtCode", "District LGD code", codeInput(3))}
              {textField("state", "State")}
              {textField("stateCode", "State LGD code", codeInput(2))}
            </Box>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Block router" subtitle="The block's head node: sections start here. Coordinates put it on the block map." sx={{ height: "100%" }}>
            <Box sx={fieldGrid}>
              <TextField
                label="Name"
                value={form.blockRouter.name}
                onChange={updateGroup("blockRouter", "name")}
                placeholder="e.g. Harippad Exchange"
                helperText="Shown for the router on sections and maps; left empty it reads Block router"
                size="small"
                sx={{ gridColumn: "1 / -1" }}
              />
              <TextField
                select
                label="Site type"
                value={form.blockRouter.siteType}
                onChange={updateGroup("blockRouter", "siteType")}
                error={Boolean(fieldError("blockRouter.siteType"))}
                helperText={fieldError("blockRouter.siteType")}
                size="small"
                sx={{ gridColumn: "1 / -1" }}
              >
                <MenuItem value="">
                  <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
                    Not specified
                  </Typography>
                </MenuItem>
                {Object.entries(SITE_TYPES).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Address"
                value={form.blockRouter.address}
                onChange={updateGroup("blockRouter", "address")}
                size="small"
                multiline
                minRows={2}
                sx={{ gridColumn: "1 / -1" }}
              />
              {["latitude", "longitude"].map((key) => (
                <TextField
                  key={key}
                  label={key === "latitude" ? "Latitude" : "Longitude"}
                  value={form.blockRouter[key]}
                  onChange={updateGroup("blockRouter", key)}
                  onBlur={touch(`blockRouter.${key}`)}
                  error={Boolean(fieldError(`blockRouter.${key}`))}
                  helperText={fieldError(`blockRouter.${key}`)}
                  placeholder={key === "latitude" ? "e.g. 9.9816" : "e.g. 76.2999"}
                  size="small"
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
              ))}
            </Box>
          </SectionCard>
        </Grid>

        <Grid size={12}>
          <SectionCard title="Rings" subtitle="Ring code: state, district and block LGD codes + ring number (A01, A02, …). Each GP below says which ring it's on.">
            {textField("numberOfRings", "Number of rings", {
              type: "number",
              slotProps: { htmlInput: { min: 0, max: MAX_RINGS, step: 1 } },
              sx: { width: { xs: "100%", sm: 200 } },
            })}
            {serverErrors.rings && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {serverErrors.rings}
              </Alert>
            )}
            {rings.length > 0 && (
              <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap", mt: 2 }}>
                {rings.map((number) => (
                  <Chip key={number} label={ringPrefix + number} variant="outlined" sx={{ fontFamily: "monospace" }} />
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>

        <Grid size={12}>
          <SectionCard
            title="Gram Panchayats"
            subtitle="Entered by hand for now; a GP master will fill these later. Coordinates put the GP on the block map."
            action={
              <Button size="small" startIcon={<AddIcon />} onClick={addGp}>
                Add GP
              </Button>
            }
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2, mb: 2 }}>
              {textField("numberOfGps", "Number of GPs", {
                required: true,
                type: "number",
                slotProps: { htmlInput: { min: 1, step: 1 } },
                sx: { width: { xs: "100%", sm: 200 } },
              })}
              {declared !== null && (
                <Alert severity={declared === gps.length ? "success" : "warning"} sx={{ flex: 1, minWidth: 240, py: 0 }}>
                  {declared === gps.length
                    ? `Declared ${declared}, entered ${gps.length}.`
                    : `Declared ${declared}, entered ${gps.length}, will be flagged.`}
                </Alert>
              )}
            </Box>

            {serverErrors.gps && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {serverErrors.gps}
              </Alert>
            )}

            {gps.length === 0 ? (
              <Box sx={{ py: 3, textAlign: "center", border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No GPs entered yet.
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addGp} sx={{ mt: 1 }}>
                  Add GP
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "grid", gap: 1.5 }}>
                {gps.map((gp, index) => (
                  <Box key={gp.rowId} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ width: 28, pt: 1, flexShrink: 0, color: "text.secondary", fontVariantNumeric: "tabular-nums", textAlign: "right" }}
                    >
                      {index + 1}.
                    </Typography>
                    <Box sx={{ ...gpFieldGrid, flex: 1 }}>
                      <TextField
                        label="GP name"
                        value={gp.name}
                        onChange={updateGp(gp.rowId, "name")}
                        onBlur={touch(`gps.${index}.name`)}
                        error={Boolean(fieldError(`gps.${index}.name`))}
                        helperText={fieldError(`gps.${index}.name`)}
                        size="small"
                        required
                      />
                      <TextField
                        label="GP LGD code"
                        placeholder="6 digits"
                        slotProps={{ htmlInput: { inputMode: "numeric", maxLength: GP_CODE_DIGITS } }}
                        value={gp.lgdCode}
                        onChange={updateGp(gp.rowId, "lgdCode")}
                        onBlur={touch(`gps.${index}.lgdCode`)}
                        error={Boolean(fieldError(`gps.${index}.lgdCode`))}
                        helperText={fieldError(`gps.${index}.lgdCode`)}
                        size="small"
                        required
                      />
                      {["latitude", "longitude"].map((key) => (
                        <TextField
                          key={key}
                          label={key === "latitude" ? "Latitude" : "Longitude"}
                          value={gp[key]}
                          onChange={updateGp(gp.rowId, key)}
                          onBlur={touch(`gps.${index}.${key}`)}
                          error={Boolean(fieldError(`gps.${index}.${key}`))}
                          helperText={fieldError(`gps.${index}.${key}`)}
                          size="small"
                          slotProps={{ htmlInput: { inputMode: "decimal" } }}
                        />
                      ))}
                      <TextField
                        select
                        label="Ring"
                        value={rings.includes(gp.ringCode) ? gp.ringCode : ""}
                        onChange={updateGp(gp.rowId, "ringCode")}
                        error={Boolean(fieldError(`gps.${index}.ringCode`))}
                        helperText={fieldError(`gps.${index}.ringCode`) || (rings.length ? undefined : "Add rings above")}
                        disabled={!rings.length}
                        size="small"
                      >
                        <MenuItem value="">
                          <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
                            Not set
                          </Typography>
                        </MenuItem>
                        {rings.map((number) => (
                          <MenuItem key={number} value={number} sx={{ fontFamily: "monospace" }}>
                            {ringPrefix + number}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                    <Tooltip title="Remove GP">
                      <IconButton
                        aria-label={`Remove GP ${index + 1}`}
                        onClick={() => removeGp(gp.rowId)}
                        sx={{ mt: 0.25, "&:hover": { color: "error.main" } }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}
          </SectionCard>
        </Grid>

        <Grid size={12}>
          <SectionCard title="Remarks">
            <TextField
              label="Remarks"
              value={form.remarks}
              onChange={updateField("remarks")}
              size="small"
              multiline
              minRows={3}
              fullWidth
            />
          </SectionCard>
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 1.5, mt: 3 }}>
        {formError && (
          <Alert severity="error" onClose={() => setFormError("")} sx={{ flex: "1 1 100%" }}>
            {formError}
          </Alert>
        )}
        <Button color="inherit" onClick={cancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create block profile"}
        </Button>
      </Box>
    </Box>
  );
};

export default BlockProfileFormPage;
