import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, ButtonBase, CircularProgress, Grid, Stack, TextField, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckIcon from "@mui/icons-material/Check";
import PageHeader from "../../common/PageHeader";
import SectionCard from "../../common/SectionCard";
import StatusPill from "../../common/StatusPill";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtAccuracy, fmtLatLong } from "../../../utils/executionFormat";
import GpsField from "../GpsField";
import ExecMediaViewer from "../ExecMediaViewer";
import { MediaThumb } from "../MediaPicker";
import { openGeoCamera } from "../geoCamera";
import { anyPending, fromSaved, newMediaItem, toMediaFile, uploadItem } from "../mediaItems";
import { PageState, StickyActionBar } from "../execUi";
import { titleCase } from "../execConstants";
import { reportError, showToast } from "../toast";

const PLACEHOLDERS = ["e.g. Building front with signboard", "e.g. Rack / equipment position", "e.g. Cable entry point", "e.g. Approach road"];

/** Block HQ or GP infra: location + up to 4 geo-stamped photos, each with a description (C3/C4) */
const InfraCapturePage = () => {
  const { blockProfileId, lgdCode } = useParams();
  const level = lgdCode ? "GP" : "BLOCK";
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { config } = useExecutionConfig();
  const maxPhotos = config?.mediaRules?.infra?.maxPhotos ?? 4;
  const editable = can("captureInfra");
  const backTo = `/block-profiles/${blockProfileId}?tab=${level === "BLOCK" ? "block" : "gps"}`;

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [target, setTarget] = useState(null);
  const [version, setVersion] = useState(undefined);
  const [location, setLocation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoadError("");
      const data = level === "BLOCK" ? await executionService.getBlockInfra(blockProfileId) : await executionService.getGpInfra(blockProfileId, lgdCode);
      const capture = data.capture;
      setTarget(data.target);
      setVersion(capture ? capture.version : undefined);
      setLocation(capture ? { latitude: capture.latitude, longitude: capture.longitude, accuracy: capture.accuracy } : null);
      setPhotos((capture?.photos || []).map((p, i) => ({ item: fromSaved(p.media, `saved${i}`), description: p.description || "" })));
      setLoaded(true);
    } catch (e) {
      setLoadError(e.message || "Failed to load");
    }
  }, [blockProfileId, level, lgdCode]);

  useEffect(() => {
    load();
  }, [load]);

  const patchItem = (key, changes) => setPhotos((list) => list.map((p) => (p.item.key === key ? { ...p, item: { ...p.item, ...changes } } : p)));

  const add = async (source, replaceKey) => {
    const captured = await openGeoCamera({ mode: "photo", source });
    if (!captured) return;
    const item = newMediaItem(captured);
    setPhotos((list) => (replaceKey ? list.map((p) => (p.item.key === replaceKey ? { ...p, item } : p)) : [...list, { item, description: "" }]));
    setErrors((e) => ({ ...e, photos: undefined }));
    uploadItem(item, (changes) => patchItem(item.key, changes));
  };

  const save = async () => {
    const e = {};
    if (!location) e.location = "Capture the location";
    if (!photos.length) e.photos = "Take at least one photo";
    setErrors(e);
    const n = Object.keys(e).length;
    if (n) {
      showToast(`${n} ${n === 1 ? "thing needs" : "things need"} attention`, "error");
      return;
    }
    if (anyPending(photos.map((p) => p.item))) {
      showToast("Wait for the uploads to finish", "warning");
      return;
    }
    const body = {
      version,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      photos: photos.map((p) => ({ media: toMediaFile(p.item), description: p.description.trim() })),
    };
    try {
      setSaving(true);
      if (level === "BLOCK") await executionService.saveBlockInfra(blockProfileId, body);
      else await executionService.saveGpInfra(blockProfileId, lgdCode, body);
      showToast(level === "BLOCK" ? "Block infra saved" : `${titleCase(target?.name)} GP saved`);
      navigate(backTo);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      reportError(err, load);
    } finally {
      setSaving(false);
    }
  };

  const title = level === "BLOCK" ? "Block infra" : "GP infra";
  const header = (
    <PageHeader
      title={title}
      subtitle={target ? `${titleCase(target.name)} (${target.code || lgdCode})` : undefined}
      actions={
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(backTo)}>
          Back
        </Button>
      }
    />
  );

  if (!loaded) {
    return (
      <Box>
        {header}
        <PageState error={loadError} onRetry={load} />
      </Box>
    );
  }

  const n = photos.length;
  return (
    <Box>
      {header}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard title="Location" subtitle={target ? `${titleCase(target.name)} · ${target.code || lgdCode}` : undefined} sx={{ height: "100%" }}>
            {editable ? (
              <GpsField
                value={location}
                onChange={(fix) => {
                  setLocation(fix);
                  setErrors((x) => ({ ...x, location: undefined }));
                }}
                error={errors.location}
              />
            ) : (
              <Box>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  {location ? fmtLatLong(location.latitude, location.longitude) : "Not captured yet"}
                </Typography>
                {location && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {fmtAccuracy(location.accuracy, config?.accuracyLimitM)}
                  </Typography>
                )}
              </Box>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title="Photos with description"
            subtitle="Geo-stamped; the description says what each one shows"
            action={<StatusPill label={n ? `${n} of ${maxPhotos}` : `At least 1 · up to ${maxPhotos}`} tone={n ? "success" : "default"} />}
            sx={{ height: "100%" }}
          >
            {photos.map((p, i) => (
              <Box key={p.item.key} sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                <MediaThumb
                  media={p.item}
                  onClick={() => (p.item.uploadStatus === "failed" ? uploadItem(p.item, (c) => patchItem(p.item.key, c)) : setViewing(p.item))}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Description (optional)"
                  placeholder={PLACEHOLDERS[i]}
                  value={p.description}
                  onChange={(e) => setPhotos((list) => list.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                  multiline
                  minRows={2}
                  disabled={!editable}
                />
              </Box>
            ))}
            {editable && n < maxPhotos && (
              <Stack direction="row" spacing={2} sx={{ alignItems: "center", mt: 2 }}>
                <ButtonBase
                  onClick={() => add("camera")}
                  sx={{
                    width: 88,
                    height: 88,
                    borderRadius: 1,
                    border: "1px dashed",
                    borderColor: errors.photos ? "error.main" : "primary.main",
                    color: errors.photos ? "error.main" : "primary.main",
                    flexDirection: "column",
                    gap: 0.5,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <AddAPhotoOutlinedIcon />
                  {n ? "Add photo" : "Take photo"}
                </ButtonBase>
                {config?.allowMediaUpload !== false && (
                  <Button size="small" startIcon={<UploadFileIcon />} onClick={() => add("library")}>
                    Upload photo
                  </Button>
                )}
              </Stack>
            )}
            {errors.photos && (
              <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5 }}>
                {errors.photos}
              </Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>
      {editable && (
        <StickyActionBar>
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />} onClick={save} disabled={saving}>
            {version !== undefined ? "Save changes" : "Save"}
          </Button>
        </StickyActionBar>
      )}
      {viewing && (
        <ExecMediaViewer
          media={viewing}
          onClose={() => setViewing(null)}
          onRemove={
            editable
              ? () => {
                  setPhotos((list) => list.filter((p) => p.item.key !== viewing.key));
                  setViewing(null);
                }
              : undefined
          }
          onRetake={
            editable
              ? () => {
                  const key = viewing.key;
                  setViewing(null);
                  add("camera", key);
                }
              : undefined
          }
        />
      )}
    </Box>
  );
};

export default InfraCapturePage;
