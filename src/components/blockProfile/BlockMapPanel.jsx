import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Grid,
  IconButton,
  Skeleton,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import blockProfileService from "../../services/blockProfileService.jsx";
import KMLLayer from "../mapViewPage/mapComponents/KMLLayer";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "../mapViewPage/utils/googleMapsLoader";
import SectionCard from "../common/SectionCard";
import ConfirmDeleteDialog from "../common/ConfirmDeleteDialog";
import { formatDate } from "./blockProfileConstants";

// Same starting view as the Locations map; the map fits to the block's data once it loads
const DEFAULT_CENTER = { lat: 9.31, lng: 76.45 };
const DEFAULT_ZOOM = 8;
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const MAP_OPTIONS = { streetViewControl: false, mapTypeControl: true, fullscreenControl: true };

// One colour per KML file so overlapping routes stay distinguishable. None of these
// match the router, BHQ or GP markers.
const KML_COLORS = ["#2563eb", "#ea580c", "#db2777", "#ca8a04", "#0891b2", "#92400e"];
const kmlColor = (index) => KML_COLORS[index % KML_COLORS.length];
const GP_COLOR = "#7c3aed";
const BHQ_COLOR = "#1e3a8a";

// GPs are diamonds and the BHQ a square, so they read apart from the round router
const DIAMOND_PATH = "M 0 -9 L 9 0 L 0 9 L -9 0 z";
const SQUARE_PATH = "M -8 -8 L 8 -8 L 8 8 L -8 8 z";

const toPoint = (latitude, longitude) => (latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null);

const featurePoints = (feature) => (feature.type === "marker" ? [feature.position] : feature.path || feature.paths || []);

const formatPoint = (point) => `${point.lat}, ${point.lng}`;

const formatSize = (bytes) => {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const LegendItem = ({ swatch, label }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.5 }}>
    <Box sx={{ width: 22, display: "flex", justifyContent: "center", flexShrink: 0 }}>{swatch}</Box>
    <Typography variant="body2">{label}</Typography>
  </Box>
);

const Dot = ({ color, size = 12 }) => (
  <Box sx={{ width: size, height: size, borderRadius: "50%", bgcolor: color, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />
);

const Square = ({ color }) => (
  <Box sx={{ width: 13, height: 13, bgcolor: color, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />
);

const Diamond = ({ color }) => (
  <Box sx={{ width: 11, height: 11, bgcolor: color, transform: "rotate(45deg)", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />
);

/**
 * Block map on Google Maps: router, BHQ, GPs and the block's KML files (drawn
 * by the Locations map's KMLLayer), with per-file visibility. Upload and remove
 * need `canManageKml`.
 */
const BlockMapPanel = ({ blockProfile, canManageKml = false, userId, onProfileChange }) => {
  const theme = useTheme();
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const blockProfileId = blockProfile._id;
  const kmlFiles = useMemo(() => blockProfile.kmlFiles || [], [blockProfile.kmlFiles]);

  const [map, setMap] = useState(null);
  const [selected, setSelected] = useState(null);
  // fileId -> { status: "ready" | "error", features }, reported by each file's KMLLayer
  const [kmlState, setKmlState] = useState({});
  const [hidden, setHidden] = useState(() => new Set());
  const lastFitKeyRef = useRef("");

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [kmlError, setKmlError] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);

  // KMLLayer reloads whenever its array changes, so each file keeps a stable one
  const kmlSources = useMemo(
    () => Object.fromEntries(kmlFiles.map((file) => [file._id, [{ name: file.name, content: file.url }]])),
    [kmlFiles]
  );
  const kmlLoadHandlers = useMemo(
    () =>
      Object.fromEntries(
        kmlFiles.map((file) => [
          file._id,
          ({ features, failed }) =>
            setKmlState((previous) => ({ ...previous, [file._id]: { status: failed.length ? "error" : "ready", features } })),
        ])
      ),
    [kmlFiles]
  );

  const routerLat = blockProfile.blockRouter?.latitude;
  const routerLng = blockProfile.blockRouter?.longitude;
  const router = useMemo(() => toPoint(routerLat, routerLng), [routerLat, routerLng]);
  const bhqLat = blockProfile.bhq?.latitude;
  const bhqLng = blockProfile.bhq?.longitude;
  const bhqPoint = useMemo(() => toPoint(bhqLat, bhqLng), [bhqLat, bhqLng]);

  const gpPoints = useMemo(
    () =>
      (blockProfile.gps || [])
        .map((gp) => ({ gp, point: toPoint(gp.latitude, gp.longitude) }))
        .filter(({ point }) => point),
    [blockProfile.gps]
  );

  const loadedKmlIds = kmlFiles.filter((file) => kmlState[file._id]).map((file) => file._id);
  const points = useMemo(
    () => [
      ...(router ? [router] : []),
      ...(bhqPoint ? [bhqPoint] : []),
      ...gpPoints.map(({ point }) => point),
      ...kmlFiles.flatMap((file) => (kmlState[file._id]?.features || []).flatMap(featurePoints)),
    ],
    [router, bhqPoint, gpPoints, kmlFiles, kmlState]
  );

  // Refit when the block's data changes, not when a file is hidden and shown again
  const fitKey = [
    router ? formatPoint(router) : "",
    bhqPoint ? formatPoint(bhqPoint) : "",
    gpPoints.map(({ point }) => formatPoint(point)).join(";"),
    loadedKmlIds.join(","),
  ].join("|");

  useEffect(() => {
    if (!map || points.length === 0 || fitKey === lastFitKeyRef.current) return;
    lastFitKeyRef.current = fitKey;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 48);
  }, [map, points, fitKey]);

  const toggleVisible = (fileId) =>
    setHidden((previous) => {
      const next = new Set(previous);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    // Let the same file be chosen again after an error
    event.target.value = "";
    if (!file) return;
    if (!/\.(kml|kmz)$/i.test(file.name)) {
      setKmlError("Choose a .kml or .kmz file.");
      return;
    }
    try {
      setUploading(true);
      setKmlError("");
      onProfileChange(await blockProfileService.uploadKml(blockProfileId, file, userId));
    } catch (e) {
      setKmlError(e.message || "Failed to upload the KML file");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      setRemoving(true);
      setRemoveError("");
      onProfileChange(await blockProfileService.removeKml(blockProfileId, removeTarget._id));
      setRemoveTarget(null);
    } catch (e) {
      setRemoveError(e.message || "Failed to remove the KML file");
    } finally {
      setRemoving(false);
    }
  };

  const routerColor = theme.palette.secondary.main;
  const unmappedGps = (blockProfile.gps?.length || 0) - gpPoints.length;

  // Symbol icons need the Maps script, so they're built only once it has loaded
  const circleIcon = (color, scale) => ({
    path: window.google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  });

  const select = (position, title, lines) => setSelected({ position, title, lines: lines.filter(Boolean) });

  const renderMap = () => (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      options={MAP_OPTIONS}
      onLoad={setMap}
      onUnmount={() => setMap(null)}
      onClick={() => setSelected(null)}
    >
      {kmlFiles.map((file, index) =>
        hidden.has(file._id) ? null : (
          <KMLLayer
            key={file._id}
            loadedKMLs={kmlSources[file._id]}
            map={map}
            color={kmlColor(index)}
            onLoad={kmlLoadHandlers[file._id]}
          />
        )
      )}

      {gpPoints.map(({ gp, point }) => (
        <Marker
          key={gp.lgdCode}
          position={point}
          title={`GP: ${gp.name}`}
          icon={{ path: DIAMOND_PATH, fillColor: GP_COLOR, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2, scale: 1 }}
          onClick={() => select(point, gp.name, ["Gram Panchayat", `LGD ${gp.lgdCode}`, formatPoint(point)])}
        />
      ))}

      {bhqPoint && (
        <Marker
          position={bhqPoint}
          title={`BHQ: ${blockProfile.bhq.name}`}
          icon={{ path: SQUARE_PATH, fillColor: BHQ_COLOR, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2, scale: 1 }}
          zIndex={9}
          onClick={() => select(bhqPoint, blockProfile.bhq.name, ["Block HQ (BHQ)", `Code ${blockProfile.bhq.code}`, formatPoint(bhqPoint)])}
        />
      )}

      {router && (
        <Marker
          position={router}
          title="Block router"
          icon={circleIcon(routerColor, 9)}
          zIndex={10}
          onClick={() => select(router, "Block router", [blockProfile.blockRouter?.address, formatPoint(router)])}
        />
      )}

      {selected && (
        <InfoWindow position={selected.position} onCloseClick={() => setSelected(null)}>
          <Box sx={{ maxWidth: 260, color: "text.primary" }}>
            <Typography variant="subtitle2">{selected.title}</Typography>
            {selected.lines.map((line) => (
              <Typography key={line} variant="caption" component="div" sx={{ color: "text.secondary" }}>
                {line}
              </Typography>
            ))}
          </Box>
        </InfoWindow>
      )}
    </GoogleMap>
  );

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ position: "relative", height: { xs: 420, md: 600 }, overflow: "hidden" }}>
            {loadError ? (
              <Alert severity="error" sx={{ m: 2 }}>
                Couldn't load Google Maps. Check the connection and the Maps API key.
              </Alert>
            ) : isLoaded ? (
              renderMap()
            ) : (
              <Skeleton variant="rectangular" sx={{ width: "100%", height: "100%" }} />
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <SectionCard
            title="KML files"
            subtitle={`${kmlFiles.length} ${kmlFiles.length === 1 ? "file" : "files"}`}
            contentSx={{ p: 0 }}
            action={
              canManageKml && (
                <Button
                  size="small"
                  startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadFileOutlinedIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              )
            }
          >
            {kmlError && (
              <Alert severity="error" onClose={() => setKmlError("")} sx={{ m: 2 }}>
                {kmlError}
              </Alert>
            )}
            {kmlFiles.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", px: 2.5, py: 3, textAlign: "center" }}>
                {canManageKml ? "No KML files yet. Upload a .kml or .kmz route." : "No KML files yet."}
              </Typography>
            ) : (
              kmlFiles.map((file, index) => {
                const state = kmlState[file._id];
                const visible = !hidden.has(file._id);
                const status = !state
                  ? visible
                    ? "Loading…"
                    : ""
                  : state.status === "error"
                    ? "Couldn't load this file"
                    : `${state.features.length} ${state.features.length === 1 ? "feature" : "features"}`;
                return (
                  <Box
                    key={file._id}
                    sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.25, "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" } }}
                  >
                    <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: kmlColor(index), flexShrink: 0, opacity: visible ? 1 : 0.35 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }} title={file.name}>
                        {file.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        component="div"
                        sx={{ color: state?.status === "error" ? "error.main" : "text.secondary" }}
                      >
                        {[status, formatSize(file.sizeBytes), formatDate(file.uploadedAt)].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                    <Tooltip title={visible ? "Hide on map" : "Show on map"}>
                      <Switch
                        size="small"
                        checked={visible}
                        onChange={() => toggleVisible(file._id)}
                        slotProps={{ input: { "aria-label": `Show ${file.name} on map` } }}
                      />
                    </Tooltip>
                    {canManageKml && (
                      <Tooltip title="Remove file">
                        <IconButton
                          size="small"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => {
                            setRemoveError("");
                            setRemoveTarget(file);
                          }}
                          sx={{ "&:hover": { color: "error.main" } }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                );
              })
            )}
          </SectionCard>

          <SectionCard title="Legend">
            <LegendItem swatch={<Dot color={routerColor} size={16} />} label={router ? "Block router" : "Block router (not set)"} />
            <LegendItem swatch={<Square color={BHQ_COLOR} />} label={bhqPoint ? "Block HQ (BHQ)" : "Block HQ (BHQ, no coordinates)"} />
            <LegendItem swatch={<Diamond color={GP_COLOR} />} label="Gram Panchayat" />
            {unmappedGps > 0 && (
              <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 1 }}>
                {unmappedGps} {unmappedGps === 1 ? "GP has" : "GPs have"} no coordinates and {unmappedGps === 1 ? "isn't" : "aren't"} on the
                map.
              </Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      <input ref={fileInputRef} type="file" accept=".kml,.kmz" hidden onChange={handleFile} />

      <ConfirmDeleteDialog
        open={Boolean(removeTarget)}
        title="Remove KML file?"
        error={removeError}
        deleting={removing}
        confirmLabel="Remove"
        busyLabel="Removing…"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      >
        "{removeTarget?.name}" will be removed from this block and deleted from storage.
      </ConfirmDeleteDialog>
    </>
  );
};

export default BlockMapPanel;
