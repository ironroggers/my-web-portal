import React, { useCallback, useEffect, useState } from "react";
import { Autocomplete, Box, Button, Chip, CircularProgress, Grid, InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import CheckIcon from "@mui/icons-material/Check";
import PageHeader from "../common/PageHeader";
import SectionCard from "../common/SectionCard";
import StatusPill from "../common/StatusPill";
import DetailRow from "../common/DetailRow";
import executionService from "../../services/executionService.jsx";
import { usePermissions } from "../../hooks/usePermissions";
import ExecMediaViewer from "../execution/ExecMediaViewer";
import { MediaThumb } from "../execution/MediaPicker";
import { fromSaved } from "../execution/mediaItems";
import { PageState, StickyActionBar } from "../execution/execUi";
import { titleCase } from "../execution/execConstants";
import { reportError, showToast } from "../execution/toast";
import { EQUIPMENT_FORMS, MISC_TYPES, assetPrefix, formFields, miscAssetCode, miscItemsOf, validateEquipment } from "./equipmentForms";

const fieldGrid = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
  gap: 2,
};

const asText = (value) => (value === undefined || value === null ? "" : String(value));

// Form values (all strings) from a saved record, or the server's starting values
// A misc sheet's items stay a list: [{ type, model, serialNo }]
const toValues = (formKey, source = {}) => ({
  ...Object.fromEntries(
    formFields(formKey).map((f) => [
      f.key,
      f.type === "miscItems" ? miscItemsOf(source).map((i) => ({ type: i.type, model: asText(i.model), serialNo: asText(i.serialNo) })) : asText(source[f.key]),
    ])
  ),
  latitude: asText(source.latitude),
  longitude: asText(source.longitude),
});

/**
 * Block_eqpt (once per block), gp_eqpt (once per GP) and misc_eqpt (once per block and per GP),
 * filled on the web. The geo photo is taken on the mobile app and only shown here.
 */
const InfraEquipmentPage = () => {
  const { blockProfileId, lgdCode, form } = useParams();
  const formKey = form || "block";
  // Block-level forms are block and misc; GP-level are gp and misc
  const allowed = lgdCode ? ["gp", "misc"] : ["block", "misc"];
  const spec = allowed.includes(formKey) ? EQUIPMENT_FORMS[formKey] : null;
  const navigate = useNavigate();
  const { can } = usePermissions();
  const editable = can("manageInfraEquipment");
  const backTo = `/block-profiles/${blockProfileId}?tab=${lgdCode ? "gps" : "block"}`;

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [values, setValues] = useState({});
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(false);

  const load = useCallback(async () => {
    if (!spec) return;
    try {
      setLoadError("");
      const res = lgdCode
        ? await executionService.getGpEquipment(blockProfileId, lgdCode, formKey)
        : await executionService.getBlockEquipment(blockProfileId, formKey);
      setData(res);
      setValues(toValues(formKey, res.record || res.defaults));
      setPhoto(fromSaved(res.geoPhoto, "geoPhoto"));
      setErrors({});
    } catch (e) {
      setLoadError(e.message || "Failed to load");
    }
  }, [blockProfileId, formKey, lgdCode, spec]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      const next = { ...e, [key]: undefined, ...(key === "latitude" || key === "longitude" ? { location: undefined } : {}) };
      // A misc item's errors go with the item list
      if (key === "items") Object.keys(next).filter((k) => k.startsWith("items.")).forEach((k) => delete next[k]);
      return next;
    });
  };

  const save = async () => {
    const e = validateEquipment(formKey, values);
    setErrors(e);
    const n = Object.keys(e).length;
    if (n) {
      showToast(`${n} ${n === 1 ? "thing needs" : "things need"} attention`, "error");
      return;
    }
    // The geo photo isn't sent: the mobile app saves it on its own
    const body = { ...values, version: data.version };
    try {
      setSaving(true);
      if (lgdCode) await executionService.saveGpEquipment(blockProfileId, lgdCode, formKey, body);
      else await executionService.saveBlockEquipment(blockProfileId, body, formKey);
      showToast(`${spec.title} saved`);
      navigate(backTo);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      reportError(err, load);
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <PageHeader
      title={spec?.title || "Equipment"}
      subtitle={data ? `${titleCase(data.target.name)} (${data.target.code})` : undefined}
      actions={
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(backTo)}>
          Back
        </Button>
      }
    />
  );

  if (!spec || !data) {
    return (
      <Box>
        {header}
        <PageState error={spec ? loadError : "Unknown equipment form"} onRetry={load} />
      </Box>
    );
  }

  const geo = data.geography || {};
  const prefix = assetPrefix(geo);
  const suggested = prefix && spec.suggestAssetCode ? spec.suggestAssetCode(prefix, values) : "";
  const nodeOptions = data.nodes || [];
  const nodeLabel = (code) => {
    const node = nodeOptions.find((n) => n.code === code);
    return node ? `${titleCase(node.name)} · ${node.code}` : code;
  };

  const renderField = (f) => {
    const common = {
      label: f.label,
      size: "small",
      required: f.required,
      disabled: !editable,
      error: Boolean(errors[f.key]),
      helperText: errors[f.key] || f.helper,
      sx: f.full ? { gridColumn: "1 / -1" } : undefined,
    };
    const value = values[f.key] ?? "";
    const onText = (e) => set(f.key)(f.upper ? e.target.value.toUpperCase() : e.target.value);

    if (f.type === "enum") {
      return (
        <TextField {...common} select value={value} onChange={onText}>
          <MenuItem value="">
            <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
              Not specified
            </Typography>
          </MenuItem>
          {f.options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }
    if (f.type === "node") {
      return (
        <Autocomplete
          freeSolo
          disabled={!editable}
          options={nodeOptions.map((n) => n.code)}
          getOptionLabel={nodeLabel}
          value={value || null}
          onChange={(_, v) => set(f.key)(v || "")}
          onInputChange={(_, v, reason) => reason === "input" && set(f.key)(v)}
          renderInput={(params) => <TextField {...params} label={f.label} size="small" error={common.error} helperText={errors[f.key] || "Pick the block router or a GP, or type a code"} />}
        />
      );
    }
    if (f.type === "miscItems") {
      const items = values.items || [];
      const has = (type) => items.some((i) => i.type === type);
      // Toggling a type keeps the items in the offered order and keeps what was typed for the others
      const toggle = (type) =>
        set("items")(
          has(type)
            ? items.filter((i) => i.type !== type)
            : MISC_TYPES.map((t) => t.value)
                .filter((t) => t === type || has(t))
                .map((t) => items.find((i) => i.type === t) || { type: t, model: "", serialNo: "" })
        );
      const setItem = (type, key) => (e) => set("items")(items.map((i) => (i.type === type ? { ...i, [key]: e.target.value } : i)));
      const itemError = (i) => errors[`items.${i}.type`];
      return (
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
            Types{" "}
            <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
              · pick every type at this site
            </Typography>
          </Typography>
          <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
            {MISC_TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                color={has(t.value) ? "primary" : "default"}
                variant={has(t.value) ? "filled" : "outlined"}
                onClick={editable ? () => toggle(t.value) : undefined}
                aria-pressed={has(t.value)}
              />
            ))}
          </Stack>
          {errors.items && (
            <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5 }}>
              {errors.items}
            </Typography>
          )}
          {items.length > 0 && (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {items.map((item, i) => {
                const code = miscAssetCode(geo, data.target.code, item.type);
                return (
                  <Box key={item.type} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap", mb: 1.25 }}>
                      <Typography variant="subtitle2">{MISC_TYPES.find((t) => t.value === item.type)?.label || item.type}</Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", color: code ? "text.primary" : "error.main" }}>
                        {code || "Asset code needs the state, district and block LGD codes on the block profile"}
                      </Typography>
                      {itemError(i) && (
                        <Typography variant="caption" sx={{ color: "error.main" }}>
                          {itemError(i)}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={fieldGrid}>
                      <TextField label="Model" size="small" disabled={!editable} value={item.model} onChange={setItem(item.type, "model")} />
                      <TextField label="Serial no." size="small" disabled={!editable} value={item.serialNo} onChange={setItem(item.type, "serialNo")} />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
            Asset codes are generated: {spec.assetFormat}
          </Typography>
        </Box>
      );
    }
    if (f.type === "generatedAssetCode") {
      return (
        <TextField
          {...common}
          value={data.assetCode || ""}
          placeholder="Not generated yet"
          error={Boolean(errors[f.key] || !data.assetCode)}
          helperText={
            errors[f.key] ||
            (data.assetCode ? `Generated: ${spec.assetFormat}` : "Add the state, district and block LGD codes to the block profile to generate it")
          }
          slotProps={{ htmlInput: { readOnly: true, style: { fontFamily: "monospace" } } }}
        />
      );
    }
    if (f.type === "assetCode") {
      return (
        <TextField
          {...common}
          value={value}
          onChange={(e) => set(f.key)(e.target.value.toUpperCase().replace(/\s+/g, ""))}
          helperText={errors[f.key] || (prefix ? `Format ${spec.assetFormat}` : "Set the state, district and block LGD codes on the block profile to get a suggestion")}
          slotProps={{
            htmlInput: { style: { fontFamily: "monospace" } },
            input: {
              endAdornment:
                editable && suggested && suggested !== value ? (
                  <InputAdornment position="end">
                    <Button size="small" onClick={() => set(f.key)(suggested)} sx={{ whiteSpace: "nowrap" }}>
                      Use {suggested}
                    </Button>
                  </InputAdornment>
                ) : undefined,
            },
          }}
        />
      );
    }
    const numeric = f.type === "int" || f.type === "metres";
    return (
      <TextField
        {...common}
        value={value}
        onChange={onText}
        multiline={f.multiline}
        minRows={f.multiline ? 2 : undefined}
        type={numeric ? "number" : "text"}
        slotProps={{
          htmlInput: numeric ? { min: 0, step: f.type === "int" ? 1 : "any" } : undefined,
          input: f.type === "metres" ? { endAdornment: <InputAdornment position="end">m</InputAdornment> } : undefined,
        }}
      />
    );
  };

  return (
    <Box>
      {header}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard title="Block" subtitle="From the block profile">
              <DetailRow label="State">{[geo.state, geo.stateCode && `LGD ${geo.stateCode}`].filter(Boolean).join(" · ") || "—"}</DetailRow>
              <DetailRow label="District">{[geo.district, geo.districtCode && `LGD ${geo.districtCode}`].filter(Boolean).join(" · ") || "—"}</DetailRow>
              <DetailRow label="Block">{[geo.block, geo.blockCode && `LGD ${geo.blockCode}`].filter(Boolean).join(" · ") || "—"}</DetailRow>
              {lgdCode && <DetailRow label="GP">{`${titleCase(data.target.name)} · LGD ${data.target.code}`}</DetailRow>}
            </SectionCard>
            <SectionCard title="Location" subtitle={data.record ? undefined : "Pre-filled from the infra capture or block profile"}>
              <Box sx={fieldGrid}>
                {["latitude", "longitude"].map((key) => (
                  <TextField
                    key={key}
                    label={key === "latitude" ? "Latitude" : "Longitude"}
                    size="small"
                    type="number"
                    required
                    disabled={!editable}
                    value={values[key] ?? ""}
                    onChange={(e) => set(key)(e.target.value)}
                    error={Boolean(errors.location)}
                    slotProps={{ htmlInput: { step: "any" } }}
                  />
                ))}
              </Box>
              {errors.location && (
                <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5 }}>
                  {errors.location}
                </Typography>
              )}
            </SectionCard>
            <SectionCard
              title="Geo photo"
              subtitle="Taken on the Locus app, from Block infra or GP infra"
              action={<StatusPill label={photo ? "Taken" : "Not taken yet"} tone={photo ? "success" : "default"} />}
            >
              {photo ? (
                <MediaThumb media={photo} onClick={() => setViewing(true)} />
              ) : (
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                  <PhoneAndroidOutlinedIcon fontSize="small" />
                  <Typography variant="body2">The field team takes this photo on the mobile app.</Typography>
                </Stack>
              )}
            </SectionCard>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            {spec.sections.map((section) => (
              <SectionCard key={section.title} title={section.title} subtitle={section.subtitle}>
                <Box sx={fieldGrid}>
                  {section.fields.map((f) => (
                    <React.Fragment key={f.key}>{renderField(f)}</React.Fragment>
                  ))}
                </Box>
              </SectionCard>
            ))}
          </Stack>
        </Grid>
      </Grid>
      {editable && (
        <StickyActionBar>
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />} onClick={save} disabled={saving}>
            {data.record ? "Save changes" : "Save"}
          </Button>
        </StickyActionBar>
      )}
      {viewing && photo && <ExecMediaViewer media={photo} onClose={() => setViewing(false)} />}
    </Box>
  );
};

export default InfraEquipmentPage;
