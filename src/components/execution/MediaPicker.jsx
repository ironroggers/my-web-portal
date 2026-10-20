import React, { useState } from "react";
import { Box, Button, ButtonBase, CircularProgress, Stack, Typography } from "@mui/material";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckIcon from "@mui/icons-material/Check";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { fmtDuration, isAboveLimit } from "../../utils/executionFormat";
import { openGeoCamera } from "./geoCamera";
import ExecMediaViewer from "./ExecMediaViewer";
import { mediaSrc, newMediaItem, posterSrc, uploadItem } from "./mediaItems";
import { tint } from "./execSx";

const SIZE = 88;

const badgeSx = (warn) => ({
  position: "absolute",
  left: 4,
  bottom: 4,
  px: 0.5,
  borderRadius: 0.5,
  fontSize: 10,
  fontWeight: 700,
  color: "#fff",
  bgcolor: warn ? "warning.dark" : "success.dark",
});

/** Thumbnail with upload progress / retry, accuracy or "Upload" badge */
export const MediaThumb = ({ media, onClick, size = SIZE }) => {
  const { config } = useExecutionConfig();
  const isVideo = media.fileType === "VIDEO";
  const src = isVideo ? posterSrc(media) : mediaSrc(media);
  const warn = media.accuracyAboveLimit || isAboveLimit(media.accuracy, config?.accuracyLimitM ?? 1);
  return (
    <ButtonBase
      onClick={onClick}
      aria-label={isVideo ? "Open video" : "Open photo"}
      sx={{ position: "relative", width: size, height: size, borderRadius: 1, overflow: "hidden", bgcolor: isVideo ? "grey.800" : "action.hover", flexShrink: 0 }}
    >
      {src && <Box component="img" src={src} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      {isVideo && (
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff" }}>
          <PlayArrowIcon />
          {media.durationSec ? <Typography sx={{ fontSize: 11, fontWeight: 600, mt: 4, position: "absolute" }}>{fmtDuration(media.durationSec)}</Typography> : null}
        </Box>
      )}
      {media.uploadStatus === "uploading" && (
        <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", color: "#fff" }}>
          <CircularProgress size={22} color="inherit" variant={media.progress ? "determinate" : "indeterminate"} value={(media.progress || 0) * 100} />
        </Box>
      )}
      {media.uploadStatus === "failed" && (
        <Box sx={{ position: "absolute", inset: 0, bgcolor: tint("error", 0.75), display: "grid", placeItems: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>
          <RefreshIcon />
          Retry
        </Box>
      )}
      {media.source === "UPLOAD" ? (
        <Box sx={{ ...badgeSx(false), bgcolor: "grey.700" }}>{media.locationSource === "MANUAL" ? "Typed" : "Upload"}</Box>
      ) : media.accuracy != null ? (
        <Box sx={badgeSx(warn)}>±{Number(media.accuracy).toFixed(1)} m</Box>
      ) : null}
    </ButtonBase>
  );
};

const AddTile = ({ icon, label, onClick, error }) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      width: SIZE,
      height: SIZE,
      borderRadius: 1,
      border: "1px dashed",
      borderColor: error ? "error.main" : "primary.main",
      color: error ? "error.main" : "primary.main",
      bgcolor: error ? tint("error", 0.04) : tint("primary", 0.04),
      flexDirection: "column",
      gap: 0.5,
      fontSize: 12,
      fontWeight: 600,
    }}
  >
    {icon}
    {label}
  </ButtonBase>
);

const Need = ({ ok, children }) => (
  <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, color: ok ? "success.dark" : "text.secondary", fontWeight: ok ? 600 : 400 }}>
    {ok && <CheckIcon sx={{ fontSize: 14 }} />}
    {children}
  </Typography>
);

/**
 * One look everywhere media is captured: thumbnails, one "Take photo / Add photo"
 * tile, one "Record video" tile and a counter ("At least 1 · up to 4" → "2 of 4").
 *   value: { photos: [], video }   onUpdate(fn): fn maps the old value to the new one
 *   rule: { minPhotos, maxPhotos, video: "required" | "none" }
 */
const MediaPicker = ({ value, onUpdate, rule, title = "Photos", errors = {}, editable = true }) => {
  const { config } = useExecutionConfig();
  const [viewing, setViewing] = useState(null);
  const photos = value?.photos || [];
  const video = value?.video || null;
  const allowUpload = config?.allowMediaUpload !== false;

  const patch = (key, changes) =>
    onUpdate((v) => ({
      photos: (v.photos || []).map((p) => (p.key === key ? { ...p, ...changes } : p)),
      video: v.video && v.video.key === key ? { ...v.video, ...changes } : v.video,
    }));

  const add = async (mode, source, replaceKey) => {
    const captured = await openGeoCamera({ mode, source });
    if (!captured) return;
    const item = newMediaItem(captured);
    onUpdate((v) => {
      if (mode === "video") return { photos: v.photos || [], video: item };
      const list = v.photos || [];
      return { photos: replaceKey ? list.map((p) => (p.key === replaceKey ? item : p)) : [...list, item], video: v.video };
    });
    uploadItem(item, (changes) => patch(item.key, changes));
  };

  const open = (media) => {
    if (media.uploadStatus === "failed") {
      uploadItem(media, (changes) => patch(media.key, changes));
      return;
    }
    setViewing(media);
  };

  const n = photos.length;
  const need = n ? `${n} of ${rule.maxPhotos}` : rule.minPhotos === 0 ? `Optional · up to ${rule.maxPhotos}` : `At least ${rule.minPhotos} · up to ${rule.maxPhotos}`;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Need ok={n > 0}>{need}</Need>
      </Box>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
        {photos.map((p) => (
          <MediaThumb key={p.key || p.url} media={p} onClick={() => open(p)} />
        ))}
        {editable && n < rule.maxPhotos && (
          <AddTile icon={<AddAPhotoOutlinedIcon />} label={n ? "Add photo" : "Take photo"} onClick={() => add("photo", "camera")} error={errors.photos} />
        )}
      </Stack>
      {errors.photos && (
        <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5 }}>
          {errors.photos}
        </Typography>
      )}

      {rule.video === "required" && (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Video
            </Typography>
            <Need ok={Boolean(video)}>{video ? "Recorded" : "Required"}</Need>
          </Box>
          <Stack direction="row" spacing={1}>
            {video ? (
              <MediaThumb media={video} onClick={() => open(video)} />
            ) : editable ? (
              <AddTile icon={<VideocamOutlinedIcon />} label="Record video" onClick={() => add("video", "camera")} error={errors.video} />
            ) : null}
          </Stack>
          {errors.video && (
            <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5 }}>
              {errors.video}
            </Typography>
          )}
        </>
      )}

      {editable && allowUpload && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          {n < rule.maxPhotos && (
            <Button size="small" startIcon={<UploadFileIcon />} onClick={() => add("photo", "library")}>
              Upload photo
            </Button>
          )}
          {rule.video === "required" && !video && (
            <Button size="small" startIcon={<UploadFileIcon />} onClick={() => add("video", "library")}>
              Upload video
            </Button>
          )}
        </Stack>
      )}

      {viewing && (
        <ExecMediaViewer
          media={viewing}
          onClose={() => setViewing(null)}
          onRemove={
            editable
              ? () => {
                  onUpdate((v) => ({
                    photos: (v.photos || []).filter((p) => p.key !== viewing.key),
                    video: v.video && v.video.key === viewing.key ? null : v.video,
                  }));
                  setViewing(null);
                }
              : undefined
          }
          onRetake={
            editable
              ? () => {
                  const target = viewing;
                  setViewing(null);
                  add(target.fileType === "VIDEO" ? "video" : "photo", "camera", target.key);
                }
              : undefined
          }
        />
      )}
    </Box>
  );
};

/** Read-only strip of photos then the video */
export const MediaStrip = ({ media, size = 72 }) => {
  const [viewing, setViewing] = useState(null);
  const items = [...(media?.photos || []), media?.video].filter(Boolean);
  if (!items.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No photos or video
      </Typography>
    );
  }
  return (
    <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
      {items.map((m, i) => (
        <MediaThumb key={m._id || m.key || m.url || i} media={m} size={size} onClick={() => setViewing(m)} />
      ))}
      {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}
    </Stack>
  );
};

export default MediaPicker;
