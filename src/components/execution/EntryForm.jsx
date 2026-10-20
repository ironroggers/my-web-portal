import React, { useState } from "react";
import { Box, ButtonBase, CircularProgress, TextField, Typography } from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import executionService from "../../services/executionService.jsx";
import ChipGroup from "./ChipGroup";
import GpsField from "./GpsField";
import MediaPicker from "./MediaPicker";
import { openGeoCamera } from "./geoCamera";
import { newMediaItem, uploadItem } from "./mediaItems";
import { showToast } from "./toast";
import { tint } from "./execSx";

const ENTRY_PHOTO = { minPhotos: 0, maxPhotos: 1, video: "none" };

/**
 * The fields of an entry, rendered from config.entryFields. HDD gets "AutoFill using AI":
 * the locator-screen photo is read by the server, becomes the entry photo, and its GPS
 * fills the location.
 * value / onUpdate(fn): the form; errors: per field key
 */
const EntryForm = ({ typeOfWork, fields, value, onUpdate, errors = {} }) => {
  const { config, typeOf } = useExecutionConfig();
  const [reading, setReading] = useState(false);
  const set = (key, v) => onUpdate((f) => ({ ...f, [key]: v }));

  const autofill = async () => {
    const captured = await openGeoCamera({ mode: "photo", source: "camera" });
    if (!captured) return;
    setReading(true);
    let values = {};
    try {
      values = (await executionService.extractDigits(captured.originalFile || captured.file)) || {};
    } catch {
      values = {};
    }
    setReading(false);
    const item = newMediaItem(captured);
    onUpdate((f) => ({
      ...f,
      depth: values.depth != null ? String(values.depth) : f.depth,
      temperature: values.temperature != null ? String(values.temperature) : f.temperature,
      angle: values.angle != null ? String(values.angle) : f.angle,
      location: { latitude: captured.latitude, longitude: captured.longitude, accuracy: captured.accuracy },
      photo: item,
    }));
    uploadItem(item, (changes) => onUpdate((f) => (f.photo?.key === item.key ? { ...f, photo: { ...f.photo, ...changes } } : f)));
    if (values.depth != null || values.temperature != null || values.angle != null) {
      showToast(
        `AI read depth ${values.depth != null ? `${Number(values.depth).toFixed(2)} m` : "—"} · ${values.temperature ?? "—"} °C · ${values.angle ?? "—"}°`,
        "info"
      );
    } else {
      showToast("Couldn't read the locator screen. Enter the values.", "warning");
    }
  };

  const field = (f) => {
    const error = errors[f.key];
    if (f.kind === "choice") {
      return (
        <Box key={f.key} sx={{ gridColumn: "1 / -1" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
            {f.label}
          </Typography>
          <ChipGroup options={config?.options?.[f.options] || []} value={value[f.key]} onChange={(v) => set(f.key, v)} allowClear error={Boolean(error)} size="small" />
          {error && (
            <Typography variant="caption" sx={{ color: "error.main" }}>
              {error}
            </Typography>
          )}
        </Box>
      );
    }
    return (
      <TextField
        key={f.key}
        size="small"
        label={`${f.label}${!f.required && !f.requiredUnlessPhoto ? " (optional)" : ""}`}
        value={value[f.key] ?? ""}
        onChange={(e) => set(f.key, e.target.value)}
        placeholder={f.placeholder}
        error={Boolean(error)}
        helperText={error}
        multiline={f.multiline}
        minRows={f.multiline ? 2 : undefined}
        slotProps={{ htmlInput: f.kind === "number" ? { inputMode: "decimal" } : undefined }}
        sx={f.multiline ? { gridColumn: "1 / -1" } : undefined}
      />
    );
  };

  return (
    <Box>
      {typeOf(typeOfWork)?.aiAutofill && (
        <ButtonBase
          onClick={autofill}
          disabled={reading}
          sx={{ width: "100%", justifyContent: "flex-start", gap: 1.5, p: 1.5, mb: 2, borderRadius: 1, bgcolor: tint("primary", 0.08), textAlign: "left" }}
        >
          {reading ? <CircularProgress size={22} /> : <SmartToyOutlinedIcon color="primary" />}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.dark" }}>
              {reading ? "Reading the locator screen…" : "AutoFill using AI"}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Photograph the locator screen to fill depth, temperature and angle
            </Typography>
          </Box>
        </ButtonBase>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2, mb: 2 }}>
        {fields.map(field)}
      </Box>
      <GpsField label="Location" value={value.location} onChange={(fix) => set("location", fix)} error={errors.location} />
      <MediaPicker
        title="Photo"
        rule={ENTRY_PHOTO}
        value={{ photos: value.photo ? [value.photo] : [], video: null }}
        onUpdate={(fn) =>
          onUpdate((f) => {
            const next = fn({ photos: f.photo ? [f.photo] : [], video: null });
            return { ...f, photo: next.photos[0] || null };
          })
        }
        errors={{ photos: errors.photo }}
      />
    </Box>
  );
};

export default EntryForm;
