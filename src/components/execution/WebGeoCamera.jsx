import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import GpsNotFixedIcon from "@mui/icons-material/GpsNotFixed";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import StopIcon from "@mui/icons-material/Stop";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckIcon from "@mui/icons-material/Check";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useJsApiLoader } from "@react-google-maps/api";
import * as exifr from "exifr";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "../mapViewPage/utils/googleMapsLoader";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { fmtCoord, fmtDuration, fmtSize, fmtStampTime, isAboveLimit, parseLatLong } from "../../utils/executionFormat";
import { useGpsSampler } from "./useGpsSampler";
import { showToast } from "./toast";
import { registerGeoCamera } from "./geoCamera";

// The geo camera used everywhere media is captured on the web (opened with
// openGeoCamera from geoCamera.js). Photos get a burned-in stamp; videos aren't
// stamped, their metadata is stored and a poster frame kept.

const MAX_PHOTO_WIDTH = 1600;

const deviceName = () => {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Mac/i.test(ua) ? "macOS" : /Windows/i.test(ua) ? "Windows" : "Linux";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${browser} on ${os} · web`;
};

// MP4 first so iOS can play it back; Chrome may only record WebM
const pickVideoType = () =>
  ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";

const reverseGeocode = (lat, lng) =>
  new Promise((resolve) => {
    if (!window.google?.maps?.Geocoder) return resolve("");
    const timer = setTimeout(() => resolve(""), 5000);
    new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      clearTimeout(timer);
      resolve(status === "OK" && results?.[0] ? results[0].formatted_address : "");
    });
  });

const canvasBlob = (canvas, type = "image/jpeg", quality = 0.82) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

// Band at the bottom of the photo: a drawn mini map, place, lat/long, accuracy, IST time, device
const drawStamp = (ctx, W, H, meta) => {
  const band = Math.round(W * 0.17);
  const pad = Math.round(band * 0.12);
  const y = H - band;
  ctx.fillStyle = "rgba(0,0,0,0.64)";
  ctx.fillRect(0, y, W, band);
  const ms = band - pad * 2;
  ctx.fillStyle = "#EDE7DA";
  ctx.fillRect(pad, y + pad, ms, ms);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = Math.max(3, ms / 20);
  ctx.beginPath();
  ctx.moveTo(pad, y + pad + ms * 0.62);
  ctx.lineTo(pad + ms, y + pad + ms * 0.38);
  ctx.moveTo(pad + ms * 0.35, y + pad);
  ctx.lineTo(pad + ms * 0.55, y + pad + ms);
  ctx.stroke();
  ctx.fillStyle = "#E53935";
  ctx.beginPath();
  ctx.arc(pad + ms / 2, y + pad + ms / 2, ms / 9, 0, Math.PI * 2);
  ctx.fill();
  const tx = pad * 2 + ms;
  const font = W / 36;
  const fit = (text, width) => {
    let s = text;
    if (ctx.measureText(s).width <= width) return s;
    while (s.length > 3 && ctx.measureText(`${s}…`).width > width) s = s.slice(0, -1);
    return `${s}…`;
  };
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${font * 1.05}px Roboto, Arial, sans-serif`;
  ctx.fillText(fit(meta.place || "Location", W - tx - pad), tx, y + pad + font);
  ctx.font = `${font * 0.9}px Roboto, Arial, sans-serif`;
  ctx.fillText(`Lat ${fmtCoord(meta.latitude)}   Long ${fmtCoord(meta.longitude)}`, tx, y + pad + font * 2.2);
  ctx.fillText(`Accuracy ${meta.accuracy != null ? `±${Number(meta.accuracy).toFixed(1)} m` : "typed in"}`, tx, y + pad + font * 3.3);
  ctx.fillText(fmtStampTime(meta.capturedAt), tx, y + pad + font * 4.4);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `${font * 0.75}px Roboto, Arial, sans-serif`;
  ctx.fillText(fit(`Locus · ${meta.deviceName}`, W - tx - pad), tx, y + pad + font * 5.4);
};

// A still frame from a video element as a JPEG blob
const frameOf = async (video, maxWidth = 960) => {
  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((video.videoWidth || 640) * scale);
  canvas.height = Math.round((video.videoHeight || 480) * scale);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvasBlob(canvas, "image/jpeg", 0.75);
};

// Poster for an uploaded video file
const posterFromFile = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.src = url;
    const done = (value) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration || 0);
    };
    video.onseeked = async () => done({ blob: await frameOf(video), duration: video.duration });
    video.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
  });

export const GeoCameraHost = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { config } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  const videoMax = config?.videoMaxSec ?? 60;
  useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const sampler = useGpsSampler({ seconds: config?.gpsSampleSec ?? 10, limit });

  const [phase, setPhase] = useState("idle"); // idle | live | recording | busy | review | manual | unavailable
  const [mode, setMode] = useState("photo");
  const [message, setMessage] = useState("");
  const [item, setItem] = useState(null);
  const [recordSec, setRecordSec] = useState(0);
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState("");
  const resolveRef = useRef(null);
  const optionsRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fixRef = useRef(null);
  const recorderRef = useRef(null);
  const manualRef = useRef(null);
  const fileRef = useRef(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const finish = (result) => {
    stopStream();
    sampler.stop();
    recorderRef.current = null;
    setPhase("idle");
    setItem(null);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(result);
  };

  const askLocation = () =>
    new Promise((resolve) => {
      manualRef.current = resolve;
      setTyped("");
      setTypedError("");
      setPhase("manual");
    });

  // The GPS fix for a capture: whatever sampling found, or a typed location
  const locationFor = async () => {
    let fix = await fixRef.current;
    let locationSource = "GPS";
    if (!fix) {
      showToast("No GPS fix. Type the location instead.", "warning");
      fix = await askLocation();
      if (!fix) return null;
      locationSource = "MANUAL";
    }
    setPhase("busy");
    setMessage("Adding the location stamp…");
    const place = await reverseGeocode(fix.latitude, fix.longitude);
    return {
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracy: fix.accuracy,
      place,
      deviceName: deviceName(),
      capturedAt: new Date().toISOString(),
      locationSource,
      accuracyAboveLimit: locationSource === "GPS" && isAboveLimit(fix.accuracy, limit),
    };
  };

  const startCamera = async (captureMode) => {
    setMode(captureMode);
    setItem(null);
    fixRef.current = sampler.sample().catch(() => null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("This browser can't open the camera here (it needs HTTPS and camera support).");
      setPhase("unavailable");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "environment", ...(captureMode === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1920 } }) },
      });
      streamRef.current = stream;
      setPhase("live");
    } catch (error) {
      setMessage(
        error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow the camera for this site, or upload a file instead."
          : "No camera is available on this device. Upload a file instead."
      );
      setPhase("unavailable");
    }
  };

  // Attach the stream once the <video> is on screen
  useEffect(() => {
    if ((phase === "live" || phase === "recording") && videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => null);
    }
  }, [phase]);

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const scale = Math.min(1, MAX_PHOTO_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopStream();
    setPhase("busy");
    setMessage("Getting the GPS fix…");
    const meta = await locationFor();
    if (!meta) return finish(null);
    // The unstamped frame is kept for reading the HDD locator screen (the stamp covers its bottom)
    const originalBlob = await canvasBlob(canvas);
    drawStamp(ctx, canvas.width, canvas.height, meta);
    const blob = await canvasBlob(canvas);
    const file = new File([blob], `ofc-${Date.now()}.jpg`, { type: "image/jpeg" });
    setItem({
      ...meta,
      file,
      originalFile: originalBlob ? new File([originalBlob], `original-${Date.now()}.jpg`, { type: "image/jpeg" }) : file,
      previewUrl: URL.createObjectURL(file),
      fileType: "IMAGE",
      contentType: "image/jpeg",
      filename: file.name,
      sizeBytes: file.size,
      source: "CAMERA",
    });
    setPhase("review");
  };

  const startRecording = async () => {
    const stream = streamRef.current;
    if (!stream || !window.MediaRecorder) {
      setMessage("This browser can't record video. Upload a file instead.");
      setPhase("unavailable");
      return;
    }
    const type = pickVideoType();
    const recorder = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 2_500_000 } : undefined);
    const chunks = [];
    const startedAt = Date.now();
    const poster = frameOf(videoRef.current);
    recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
    recorder.onstop = async () => {
      clearInterval(recorder.tick);
      const contentType = (recorder.mimeType || type || "video/webm").split(";")[0];
      const ext = contentType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: contentType });
      stopStream();
      setPhase("busy");
      setMessage("Getting the GPS fix…");
      const meta = await locationFor();
      if (!meta) return finish(null);
      const posterBlob = await poster;
      const file = new File([blob], `ofc-${Date.now()}.${ext}`, { type: contentType });
      setItem({
        ...meta,
        file,
        previewUrl: URL.createObjectURL(file),
        posterBlob,
        posterPreviewUrl: posterBlob ? URL.createObjectURL(posterBlob) : "",
        fileType: "VIDEO",
        contentType,
        filename: file.name,
        sizeBytes: file.size,
        durationSec: Math.round((Date.now() - startedAt) / 1000),
        source: "CAMERA",
      });
      setPhase("review");
    };
    recorder.start(1000);
    recorder.tick = setInterval(() => {
      const secs = Math.round((Date.now() - startedAt) / 1000);
      setRecordSec(secs);
      // TODO(confirm): video cap
      if (secs >= videoMax && recorder.state === "recording") recorder.stop();
    }, 250);
    recorderRef.current = recorder;
    setRecordSec(0);
    setPhase("recording");
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  // Gallery / files: EXIF GPS for photos, else a typed location
  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return finish(null);
    const isVideo = file.type.startsWith("video/");
    setPhase("busy");
    setMessage("Reading the location…");
    let point = null;
    if (!isVideo) {
      try {
        const gps = await exifr.gps(file);
        if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) point = { latitude: gps.latitude, longitude: gps.longitude };
      } catch {
        point = null;
      }
    }
    let locationSource = "EXIF";
    if (!point) {
      showToast("This file has no GPS location. Type where it was taken.", "info");
      point = await askLocation();
      if (!point) return finish(null);
      locationSource = "MANUAL";
      setPhase("busy");
    }
    const poster = isVideo ? await posterFromFile(file) : null;
    const place = await reverseGeocode(point.latitude, point.longitude);
    finish({
      latitude: point.latitude,
      longitude: point.longitude,
      place,
      deviceName: deviceName(),
      capturedAt: new Date().toISOString(),
      file,
      previewUrl: URL.createObjectURL(file),
      posterBlob: poster?.blob || null,
      posterPreviewUrl: poster?.blob ? URL.createObjectURL(poster.blob) : "",
      fileType: isVideo ? "VIDEO" : "IMAGE",
      contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
      filename: file.name,
      sizeBytes: file.size,
      durationSec: poster?.duration ? Math.round(poster.duration) : undefined,
      source: "UPLOAD",
      locationSource,
      accuracyAboveLimit: false,
    });
  };

  const openFiles = (accept) => {
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.click();
  };

  useEffect(() =>
    registerGeoCamera((options = {}) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        optionsRef.current = { mode: "photo", source: "camera", ...options };
        if (optionsRef.current.source === "library") {
          setPhase("busy");
          setMessage("Choose a file…");
          openFiles(optionsRef.current.mode === "video" ? "video/*" : "image/*");
        } else {
          startCamera(optionsRef.current.mode);
        }
      })
    )
  );

  const submitTyped = () => {
    const point = parseLatLong(typed);
    if (!point) {
      setTypedError("Use GPS or enter as lat, long");
      return;
    }
    const resolve = manualRef.current;
    manualRef.current = null;
    resolve?.({ latitude: point.lat, longitude: point.lng, accuracy: undefined });
  };

  const cancelTyped = () => {
    const resolve = manualRef.current;
    manualRef.current = null;
    resolve?.(null);
  };

  const use = () => {
    if (item.accuracyAboveLimit) showToast(`${item.fileType === "VIDEO" ? "Video" : "Photo"} kept at ±${Number(item.accuracy).toFixed(1)} m`, "warning");
    finish(item);
  };

  const live = sampler.live;
  const liveAbove = live && isAboveLimit(live.accuracy, limit);
  const what = item?.fileType === "VIDEO" ? "video" : "photo";
  const above = item?.accuracyAboveLimit;
  const cameraOpen = ["live", "recording", "review", "unavailable"].includes(phase);

  return (
    <>
      <input ref={fileRef} type="file" hidden onChange={onFile} />

      <Dialog open={phase === "busy"} PaperProps={{ sx: { p: 3, alignItems: "center", gap: 1.5 } }}>
        <CircularProgress />
        <Typography variant="body2">{message}</Typography>
        {sampler.sampling && live && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            GPS ±{Number(live.accuracy).toFixed(1)} m · {sampler.elapsed} s
          </Typography>
        )}
      </Dialog>

      <Dialog open={phase === "manual"} onClose={cancelTyped} maxWidth="xs" fullWidth>
        <DialogTitle>Where was this taken?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            Enter the location as lat, long. It will be shown as "Location typed" to the approver.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Lat, long"
            placeholder="9.280830, 76.458600"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setTypedError("");
            }}
            error={Boolean(typedError)}
            helperText={typedError || " "}
            onKeyDown={(e) => e.key === "Enter" && submitTyped()}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={cancelTyped}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitTyped}>
            Use location
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cameraOpen} onClose={() => finish(null)} fullScreen={fullScreen} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: "#000" } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, color: "#fff" }}>
          <IconButton onClick={() => finish(null)} aria-label="Close camera" sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
          <Typography sx={{ flex: 1, fontWeight: 600 }}>
            {phase === "review" ? `Review ${what}` : mode === "video" ? "Video" : "Photo"}
          </Typography>
          {(phase === "review" ? item : live) && (
            <Chip
              size="small"
              icon={(phase === "review" ? above : liveAbove) ? <GpsNotFixedIcon /> : <GpsFixedIcon />}
              label={`GPS ±${Number((phase === "review" ? item?.accuracy : live?.accuracy) ?? 0).toFixed(1)} m`}
              color={(phase === "review" ? above : liveAbove) ? "warning" : "success"}
              sx={{ color: "#fff" }}
            />
          )}
        </Box>

        {phase === "unavailable" ? (
          <Box sx={{ p: 3, bgcolor: "background.paper", m: 2, borderRadius: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              {message}
            </Alert>
            {config?.allowMediaUpload !== false ? (
              <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => openFiles(mode === "video" ? "video/*" : "image/*")}>
                Upload {mode === "video" ? "a video" : "a photo"}
              </Button>
            ) : (
              <Typography variant="body2">Uploads are turned off, so this needs a device with a camera.</Typography>
            )}
          </Box>
        ) : phase === "review" && item ? (
          <>
            <Box sx={{ flex: 1, minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#000" }}>
              {item.fileType === "VIDEO" ? (
                <video src={item.previewUrl} poster={item.posterPreviewUrl} controls style={{ maxWidth: "100%", maxHeight: "60vh" }} />
              ) : (
                <img src={item.previewUrl} alt="Captured photo with location stamp" style={{ maxWidth: "100%", maxHeight: "60vh" }} />
              )}
            </Box>
            <Box sx={{ bgcolor: "background.paper", p: 2 }}>
              <Alert severity={above ? "warning" : "success"} sx={{ mb: 2 }}>
                <b>
                  {above
                    ? `GPS ±${Number(item.accuracy).toFixed(1)} m · above the ${limit} m limit`
                    : `GPS ±${Number(item.accuracy ?? 0).toFixed(1)} m · good`}
                </b>
                <br />
                {above
                  ? "Retake for a better fix, or keep it. It will be marked as low accuracy."
                  : item.fileType === "VIDEO"
                    ? `Geo-tagged · ${fmtDuration(item.durationSec)}`
                    : `Geo-stamped · ${fmtSize(item.sizeBytes)}`}
              </Alert>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {above ? (
                  <>
                    <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => startCamera(mode)} sx={{ flex: 1 }}>
                      Retake
                    </Button>
                    <Button variant="outlined" onClick={use} sx={{ flex: 1 }}>
                      Use anyway
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => startCamera(mode)} sx={{ flex: 1 }}>
                      Retake
                    </Button>
                    <Button variant="contained" startIcon={<CheckIcon />} onClick={use} sx={{ flex: 1 }}>
                      Use {what}
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ position: "relative", flex: 1, minHeight: 280, bgcolor: "#000", display: "flex", justifyContent: "center" }}>
              <video ref={videoRef} playsInline muted style={{ width: "100%", maxHeight: "65vh", objectFit: "contain" }} />
              {phase === "recording" && (
                <Chip
                  icon={<FiberManualRecordIcon />}
                  label={`${fmtDuration(recordSec)} / ${fmtDuration(videoMax)}`}
                  color="error"
                  sx={{ position: "absolute", top: 12, left: 12, color: "#fff" }}
                />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", textAlign: "center", px: 2, py: 1 }}>
              {mode === "video" ? "Record a short clip of the area. Its location is saved with it." : "The photo is geo-stamped with its location and time."}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", pb: 3, pt: 1 }}>
              {mode === "photo" ? (
                <IconButton onClick={takePhoto} aria-label="Take photo" sx={{ width: 72, height: 72, bgcolor: "#fff", "&:hover": { bgcolor: "#eee" } }}>
                  <CameraAltIcon fontSize="large" />
                </IconButton>
              ) : phase === "recording" ? (
                <IconButton onClick={stopRecording} aria-label="Stop recording" sx={{ width: 72, height: 72, bgcolor: "error.main", color: "#fff", "&:hover": { bgcolor: "error.dark" } }}>
                  <StopIcon fontSize="large" />
                </IconButton>
              ) : (
                <IconButton onClick={startRecording} aria-label="Record video" sx={{ width: 72, height: 72, bgcolor: "#fff", color: "error.main", "&:hover": { bgcolor: "#eee" } }}>
                  <FiberManualRecordIcon fontSize="large" />
                </IconButton>
              )}
            </Box>
          </>
        )}
      </Dialog>
    </>
  );
};
