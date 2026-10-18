import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Link,
  Skeleton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { GoogleMap, InfoWindow, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import blockProfileService from "../../services/blockProfileService.jsx";
import executionService from "../../services/executionService.jsx";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { fmtDateTime, fmtDistance } from "../../utils/executionFormat";
import KMLLayer from "../mapViewPage/mapComponents/KMLLayer";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "../mapViewPage/utils/googleMapsLoader";
import SectionCard from "../common/SectionCard";
import ConfirmDeleteDialog from "../common/ConfirmDeleteDialog";
import ExecMediaViewer from "../execution/ExecMediaViewer";
import { posterSrc, mediaSrc } from "../execution/mediaItems";
import { titleCase } from "../execution/execConstants";
import { useLoader } from "../execution/useLoader";
import { formatDate } from "./blockProfileConstants";
import {
  BHQ_COLOR,
  DIAMOND_PATH,
  GP_COLOR,
  INFRA_COLORS,
  MEDIA_KIND,
  MEDIA_KINDS,
  MEDIA_SQUARE_PATH,
  PIN_PATH,
  REF_COLOR,
  RESTORATION_COLORS,
  SQUARE_PATH,
  STATUS_COLORS,
  circleSymbol,
  groupMedia,
  isFlagged,
  symbol,
} from "./blockMapLayers";

// Same starting view as the Locations map; the map fits to the block's data once it loads
const DEFAULT_CENTER = { lat: 9.31, lng: 76.45 };
const DEFAULT_ZOOM = 8;
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const MAP_OPTIONS = { streetViewControl: false, mapTypeControl: true, fullscreenControl: true };

// One colour per KML file so overlapping routes stay distinguishable
const KML_COLORS = ["#2563eb", "#ea580c", "#db2777", "#ca8a04", "#0891b2", "#92400e"];
const kmlColor = (index) => KML_COLORS[index % KML_COLORS.length];

const SUB_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "PENDING_APPROVAL", "APPROVED", "REJECTED"];
const DASH = [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2.5 }, offset: "0", repeat: "12px" }];

const toPoint = (latitude, longitude) => (latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null);
const featurePoints = (feature) => (feature.type === "marker" ? [feature.position] : feature.path || feature.paths || []);
const formatPoint = (point) => `${Number(point.lat).toFixed(6)}, ${Number(point.lng).toFixed(6)}`;
const formatSize = (bytes) => {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const toggleIn = (set, key) => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

// ---- legend swatches

const Dot = ({ color, size = 12, ring }) => (
  <Box sx={{ width: size, height: size, borderRadius: "50%", bgcolor: color, border: `2px solid ${ring || "#fff"}`, boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />
);
const Square = ({ color, size = 13 }) => <Box sx={{ width: size, height: size, bgcolor: color, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />;
const Diamond = ({ color }) => (
  <Box sx={{ width: 11, height: 11, bgcolor: color, transform: "rotate(45deg)", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />
);
const Pin = ({ color }) => (
  <Box component="svg" viewBox="-10 -26 20 27" sx={{ width: 14, height: 19 }}>
    <path d={PIN_PATH} fill={color} stroke="#fff" strokeWidth="2" />
  </Box>
);
const Line = ({ color, dashed, thick }) => (
  <Box sx={{ width: 22, height: 0, borderTop: `${thick ? 5 : 3}px ${dashed ? "dashed" : "solid"} ${color}`, opacity: thick ? 0.5 : 1 }} />
);

const Swatch = ({ children }) => <Box sx={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{children}</Box>;

/** One layer: switch, swatch, label and count; its filters show while it's on */
const LayerRow = ({ swatch, label, count, checked, onChange, children, disabled }) => (
  <Box sx={{ px: 2, py: 1, "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" } }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Swatch>{swatch}</Swatch>
      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, color: disabled ? "text.disabled" : "text.primary" }}>
        {label}
      </Typography>
      {count !== undefined && (
        <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {count}
        </Typography>
      )}
      <Switch size="small" checked={checked} onChange={onChange} disabled={disabled} slotProps={{ input: { "aria-label": `Show ${label}` } }} />
    </Box>
    {checked && children && <Box sx={{ pl: 4, pt: 0.75 }}>{children}</Box>}
  </Box>
);

const FilterChip = ({ label, count, color, on, onClick, square }) => (
  <Chip
    size="small"
    variant={on ? "filled" : "outlined"}
    onClick={onClick}
    aria-pressed={on}
    icon={
      color ? (
        <Box sx={{ width: 10, height: 10, borderRadius: square ? 0.25 : "50%", bgcolor: color, opacity: on ? 1 : 0.4, ml: "6px !important" }} />
      ) : undefined
    }
    label={count !== undefined ? `${label} ${count}` : label}
    sx={{ height: 24, fontSize: "0.75rem", bgcolor: on ? "action.selected" : undefined, color: on ? "text.primary" : "text.secondary" }}
  />
);

// ---- info window bodies

const InfoTitle = ({ children, sub }) => (
  <>
    <Typography variant="subtitle2" sx={{ pr: 2 }}>
      {children}
    </Typography>
    {sub && (
      <Typography variant="caption" component="div" sx={{ color: "text.secondary", mb: 0.5 }}>
        {sub}
      </Typography>
    )}
  </>
);

const Line2 = ({ children }) =>
  children ? (
    <Typography variant="caption" component="div" sx={{ color: "text.secondary" }}>
      {children}
    </Typography>
  ) : null;

const MediaRow = ({ m, limit, onOpen }) => {
  const kind = MEDIA_KIND[m.kind];
  const flags = [
    m.accuracyAboveLimit || (m.locationSource === "GPS" && Number(m.accuracy) > limit) ? `±${Number(m.accuracy).toFixed(1)} m` : "",
    m.source === "UPLOAD" ? "Uploaded" : "",
    m.locationSource === "MANUAL" ? "Location typed" : m.locationSource === "EXIF" ? "From file" : "",
  ].filter(Boolean);
  const thumb = m.fileType === "VIDEO" ? posterSrc(m) : mediaSrc(m);
  return (
    <ButtonBase onClick={() => onOpen(m)} sx={{ display: "flex", gap: 1, width: "100%", textAlign: "left", py: 0.75, borderTop: 1, borderColor: "divider", alignItems: "flex-start" }}>
      <Box sx={{ position: "relative", width: 52, height: 52, borderRadius: 0.75, overflow: "hidden", bgcolor: m.fileType === "VIDEO" ? "grey.800" : "action.hover", flexShrink: 0 }}>
        {thumb && <Box component="img" src={thumb} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {m.fileType === "VIDEO" && <PlayArrowIcon sx={{ position: "absolute", inset: 0, m: "auto", color: "#fff" }} />}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: kind?.color, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>
            {m.label || kind?.label}
          </Typography>
        </Box>
        <Line2>{[m.fileType === "VIDEO" ? "Video" : "Photo", fmtDateTime(m.capturedAt)].filter(Boolean).join(" · ")}</Line2>
        {m.description && <Line2>{m.description}</Line2>}
        {flags.length > 0 && (
          <Typography variant="caption" component="div" sx={{ color: "warning.dark", fontWeight: 600 }}>
            {flags.join(" · ")}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
};

/**
 * Block map on Google Maps, by layer: network (router, BHQ, GPs), KML files, block and
 * GP infra, sections (by restoration state), subsections (planned line, pits, reference
 * points and the executed path, by status) and every geotagged photo or video (by where
 * it was captured, photo / video, flagged only). Upload and remove KML need `canManageKml`.
 */
const BlockMapPanel = ({ blockProfile, canManageKml = false, userId, onProfileChange }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { config } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const blockProfileId = blockProfile._id;
  const kmlFiles = useMemo(() => blockProfile.kmlFiles || [], [blockProfile.kmlFiles]);

  const loadMap = useCallback(() => executionService.getBlockMap(blockProfileId), [blockProfileId]);
  const { data, error: dataError, reload } = useLoader(loadMap);

  const [map, setMap] = useState(null);
  const [selected, setSelected] = useState(null);
  const [viewing, setViewing] = useState(null);
  // fileId -> { status: "ready" | "error", features }, reported by each file's KMLLayer
  const [kmlState, setKmlState] = useState({});
  const [hidden, setHidden] = useState(() => new Set());
  const lastFitKeyRef = useRef("");

  // Layers and their filters
  const [layers, setLayers] = useState({ network: true, blockInfra: true, gpInfra: true, sections: true, subsections: true, refs: true, media: true });
  const [subStatuses, setSubStatuses] = useState(() => new Set([...SUB_STATUSES, "LEGACY"]));
  const [mediaKinds, setMediaKinds] = useState(() => new Set(MEDIA_KINDS.map((k) => k.key)));
  const [fileTypes, setFileTypes] = useState(() => new Set(["IMAGE", "VIDEO"]));
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const toggleLayer = (key) => setLayers((l) => ({ ...l, [key]: !l[key] }));

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

  const infra = useMemo(() => (data?.infra || []).filter((i) => Number.isFinite(i.lat)), [data]);
  const sections = useMemo(() => (data?.sections || []).filter((s) => s.from && s.to), [data]);
  const subsections = useMemo(() => data?.subsections || [], [data]);
  const allMedia = useMemo(() => data?.media || [], [data]);

  const subKey = (s) => (s.legacy ? "LEGACY" : s.executionStatus);
  const visibleSubs = subsections.filter((s) => subStatuses.has(subKey(s)));
  const visibleMedia = useMemo(
    () => allMedia.filter((m) => mediaKinds.has(m.kind) && fileTypes.has(m.fileType === "VIDEO" ? "VIDEO" : "IMAGE") && (!flaggedOnly || isFlagged(m, limit))),
    [allMedia, mediaKinds, fileTypes, flaggedOnly, limit]
  );
  const mediaGroups = useMemo(() => groupMedia(visibleMedia), [visibleMedia]);

  // ---- fit the map to everything the block has, once per change of data
  const loadedKmlIds = kmlFiles.filter((file) => kmlState[file._id]).map((file) => file._id);
  const points = useMemo(
    () => [
      ...(router ? [router] : []),
      ...(bhqPoint ? [bhqPoint] : []),
      ...gpPoints.map(({ point }) => point),
      ...kmlFiles.flatMap((file) => (kmlState[file._id]?.features || []).flatMap(featurePoints)),
      ...infra.map((i) => ({ lat: i.lat, lng: i.lng })),
      ...sections.flatMap((s) => [s.from, s.to]),
      ...subsections.flatMap((s) => [s.from, s.to, s.start, s.end, ...s.entries].filter(Boolean).map((p) => ({ lat: p.lat, lng: p.lng }))),
      ...allMedia.map((m) => ({ lat: m.lat, lng: m.lng })),
    ],
    [router, bhqPoint, gpPoints, kmlFiles, kmlState, infra, sections, subsections, allMedia]
  );
  const fitKey = [router ? formatPoint(router) : "", bhqPoint ? formatPoint(bhqPoint) : "", gpPoints.length, loadedKmlIds.join(","), data ? `${infra.length}/${sections.length}/${subsections.length}/${allMedia.length}` : ""].join("|");

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

  const toggleVisible = (fileId) => setHidden((previous) => toggleIn(previous, fileId));

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
  const blockState = { blockProfileId, blockProfileName: blockProfile.block };
  const openSection = (id, name) => navigate(`/sections/${id}/subsections`, { state: { ...blockState, sectionId: id, sectionName: name } });
  const openSub = (s) => navigate(`/subsections/${s._id}`, { state: { ...blockState, sectionId: s.sectionId, sectionName: s.sectionName, subSectionId: s._id, subSectionName: s.name } });
  const select = (position, body) => setSelected({ position, body });

  const statusLabel = (key) => (key === "LEGACY" ? "Older (trenching)" : config?.statuses?.[key]?.label || key);
  const restorationLabel = (key) => config?.restorationStates?.[key]?.label || key;

  // ---- info windows
  const infoNode = (position, title, lines) =>
    select(position, (
      <>
        <InfoTitle>{title}</InfoTitle>
        {lines.filter(Boolean).map((line) => (
          <Line2 key={line}>{line}</Line2>
        ))}
      </>
    ));

  const infoInfra = (i) =>
    select({ lat: i.lat, lng: i.lng }, (
      <>
        <InfoTitle sub={i.level === "BLOCK" ? "Block infra" : `GP infra · LGD ${i.gpLgdCode}`}>{titleCase(i.name)}</InfoTitle>
        <Line2>{`${i.photoCount} ${i.photoCount === 1 ? "photo" : "photos"} · saved ${fmtDateTime(i.updatedAt)}`}</Line2>
        <Line2>{formatPoint(i)}</Line2>
        <Link
          component="button"
          variant="caption"
          onClick={() => navigate(i.level === "BLOCK" ? `/block-profiles/${blockProfileId}/infra` : `/block-profiles/${blockProfileId}/gps/${encodeURIComponent(i.gpLgdCode)}/infra`, { state: blockState })}
        >
          Open infra
        </Link>
      </>
    ));

  const infoSection = (s, position) =>
    select(position, (
      <>
        <InfoTitle sub={[s.fromName, s.toName].filter(Boolean).join(" → ")}>{s.name}</InfoTitle>
        <Line2>{[fmtDistance(s.sectionLength), `${s.total} ${s.total === 1 ? "subsection" : "subsections"}`].join(" · ")}</Line2>
        <Line2>Restoration: {restorationLabel(s.restorationStatus)}</Line2>
        <Link component="button" variant="caption" onClick={() => openSection(s._id, s.name)}>
          Open section
        </Link>
      </>
    ));

  const infoSub = (s, position, what) =>
    select(position, (
      <>
        <InfoTitle sub={[what, s.sectionName].filter(Boolean).join(" · ")}>{s.name || "Subsection"}</InfoTitle>
        <Line2>
          {[config?.types?.[s.typeOfWork]?.label, statusLabel(subKey(s)), s.roadName].filter(Boolean).join(" · ")}
        </Line2>
        <Line2>{fmtDistance(s.subSectionLength)} planned · {s.entries.length} {s.entries.length === 1 ? "entry" : "entries"}</Line2>
        <Link component="button" variant="caption" onClick={() => (s.legacy ? navigate(`/subsections/${s._id}/trenching`, { state: blockState }) : openSub(s))}>
          {s.legacy ? "Open trenching" : "Open job card"}
        </Link>
      </>
    ));

  const infoRef = (s, r, which) =>
    infoNode({ lat: r.lat, lng: r.lng }, r.description || "Reference point", [
      `${which} · ${s.name}`,
      r.tapeDistanceM != null ? `Tape ${fmtDistance(r.tapeDistanceM)}${r.gpsDistanceM != null ? ` · GPS ${fmtDistance(r.gpsDistanceM)}` : ""}` : "",
      formatPoint(r),
    ]);

  const infoMedia = (group) =>
    select(group.position, (
      <Box sx={{ width: 260, maxHeight: 320, overflowY: "auto" }}>
        <InfoTitle sub={formatPoint(group.position)}>
          {group.items.length} {group.items.length === 1 ? "attachment" : "attachments"}
        </InfoTitle>
        {group.items.map((m) => (
          <MediaRow key={m.id} m={m} limit={limit} onOpen={(item) => setViewing({ ...item, latitude: item.lat, longitude: item.lng })} />
        ))}
      </Box>
    ));

  // ---- drawing
  const renderSubsection = (s) => {
    const color = STATUS_COLORS[subKey(s)] || STATUS_COLORS.NOT_STARTED;
    const executed = [s.start, ...s.entries, s.end].filter(Boolean).map((p) => ({ lat: p.lat, lng: p.lng }));
    const mid = s.from && s.to ? { lat: (s.from.lat + s.to.lat) / 2, lng: (s.from.lng + s.to.lng) / 2 } : executed[0];
    const pitA = config?.types?.[s.typeOfWork]?.pitA || "Start";
    const pitB = config?.types?.[s.typeOfWork]?.pitB || "End";
    return (
      <React.Fragment key={s._id}>
        {s.from && s.to && (
          <Polyline
            path={[s.from, s.to]}
            options={{ strokeOpacity: 0, strokeColor: color, icons: DASH.map((d) => ({ ...d, icon: { ...d.icon, strokeColor: color } })), zIndex: 3 }}
            onClick={() => infoSub(s, mid, "Planned line")}
          />
        )}
        {executed.length > 1 && (
          <Polyline path={executed} options={{ strokeColor: color, strokeWeight: 4, strokeOpacity: 0.9, zIndex: 4 }} onClick={(e) => infoSub(s, e.latLng.toJSON(), "Executed path")} />
        )}
        {s.entries.map((p, i) => (
          <Marker key={`e${i}`} position={p} icon={circleSymbol(color, 3, { strokeWeight: 1 })} zIndex={5} title={`${s.name} · entry #${i + 1}`} onClick={() => infoSub(s, p, `Entry #${i + 1}`)} />
        ))}
        {[
          ["A", s.start, pitA, "#15803d"],
          ["B", s.end, pitB, "#b91c1c"],
        ].map(([label, pit, title, pitColor]) =>
          pit ? (
            <React.Fragment key={label}>
              {layers.refs &&
                pit.refs.map((r, i) => (
                  <React.Fragment key={`${label}r${i}`}>
                    <Polyline path={[pit, r]} options={{ strokeColor: REF_COLOR, strokeWeight: 1.5, strokeOpacity: 0.7, zIndex: 5 }} />
                    <Marker position={r} icon={circleSymbol(REF_COLOR, 4, { strokeWeight: 1 })} zIndex={6} title={r.description} onClick={() => infoRef(s, r, title)} />
                  </React.Fragment>
                ))}
              <Marker
                position={pit}
                label={{ text: label, color: "#ffffff", fontSize: "11px", fontWeight: "700" }}
                icon={circleSymbol(pitColor, 8, { stroke: color, strokeWeight: 3 })}
                zIndex={7}
                title={`${s.name} · ${title}`}
                onClick={() => infoSub(s, pit, `${title} · ${fmtDateTime(pit.at)}`)}
              />
            </React.Fragment>
          ) : null
        )}
      </React.Fragment>
    );
  };

  const renderMediaGroup = (group) => {
    const first = group.items[0];
    const color = MEDIA_KIND[first.kind]?.color || "#334155";
    const allVideo = group.items.every((m) => m.fileType === "VIDEO");
    const flagged = group.items.some((m) => isFlagged(m, limit));
    const n = group.items.length;
    const options = { stroke: flagged ? "#f59e0b" : "#ffffff", strokeWeight: flagged ? 3 : 2 };
    return (
      <Marker
        key={group.key}
        position={group.position}
        icon={allVideo ? symbol(MEDIA_SQUARE_PATH, color, { scale: n > 1 ? 1.25 : 1, ...options }) : circleSymbol(color, n > 1 ? 9 : 6, options)}
        label={n > 1 ? { text: String(n), color: "#ffffff", fontSize: "10px", fontWeight: "700" } : undefined}
        zIndex={8}
        title={`${n} ${n === 1 ? "attachment" : "attachments"}`}
        onClick={() => infoMedia(group)}
      />
    );
  };

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
          <KMLLayer key={file._id} loadedKMLs={kmlSources[file._id]} map={map} color={kmlColor(index)} onLoad={kmlLoadHandlers[file._id]} />
        )
      )}

      {layers.sections &&
        sections.map((s) => (
          <Polyline
            key={s._id}
            path={[s.from, s.to]}
            options={{ strokeColor: RESTORATION_COLORS[s.restorationStatus] || RESTORATION_COLORS.LOCKED, strokeWeight: 8, strokeOpacity: 0.35, zIndex: 1 }}
            onClick={(e) => infoSection(s, e.latLng.toJSON())}
          />
        ))}

      {layers.subsections && visibleSubs.map(renderSubsection)}

      {layers.network &&
        gpPoints.map(({ gp, point }) => (
          <Marker
            key={gp.lgdCode}
            position={point}
            title={`GP: ${gp.name}`}
            icon={symbol(DIAMOND_PATH, GP_COLOR)}
            zIndex={9}
            onClick={() => infoNode(point, gp.name, ["Gram Panchayat", `LGD ${gp.lgdCode}`, formatPoint(point)])}
          />
        ))}
      {layers.network && bhqPoint && (
        <Marker
          position={bhqPoint}
          title={`BHQ: ${blockProfile.bhq.name}`}
          icon={symbol(SQUARE_PATH, BHQ_COLOR)}
          zIndex={10}
          onClick={() => infoNode(bhqPoint, blockProfile.bhq.name, ["Block HQ (BHQ)", `Code ${blockProfile.bhq.code}`, formatPoint(bhqPoint)])}
        />
      )}
      {layers.network && router && (
        <Marker
          position={router}
          title="Block router"
          icon={circleSymbol(routerColor, 9)}
          zIndex={10}
          onClick={() => infoNode(router, "Block router", [blockProfile.blockRouter?.address, formatPoint(router)])}
        />
      )}

      {infra
        .filter((i) => (i.level === "BLOCK" ? layers.blockInfra : layers.gpInfra))
        .map((i) => (
          <Marker
            key={i._id}
            position={{ lat: i.lat, lng: i.lng }}
            icon={symbol(PIN_PATH, INFRA_COLORS[i.level])}
            label={{ text: String(i.photoCount), color: "#ffffff", fontSize: "10px", fontWeight: "700" }}
            zIndex={11}
            title={`${i.level === "BLOCK" ? "Block infra" : "GP infra"}: ${titleCase(i.name)}`}
            onClick={() => infoInfra(i)}
          />
        ))}

      {layers.media && mediaGroups.map(renderMediaGroup)}

      {selected && (
        <InfoWindow position={selected.position} onCloseClick={() => setSelected(null)}>
          <Box sx={{ maxWidth: 280, color: "text.primary" }}>{selected.body}</Box>
        </InfoWindow>
      )}
    </GoogleMap>
  );

  // ---- layer panel counts
  const blockInfraCount = infra.filter((i) => i.level === "BLOCK").length;
  const gpInfraCount = infra.filter((i) => i.level === "GP").length;
  const statusCount = (key) => subsections.filter((s) => subKey(s) === key).length;
  const kindCount = (key) => allMedia.filter((m) => m.kind === key).length;
  const typeCount = (t) => allMedia.filter((m) => (m.fileType === "VIDEO" ? "VIDEO" : "IMAGE") === t).length;
  const flaggedCount = allMedia.filter((m) => isFlagged(m, limit)).length;
  const refCount = subsections.reduce((n, s) => n + (s.start?.refs.length || 0) + (s.end?.refs.length || 0), 0);

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ position: "relative", height: { xs: 460, md: 680 }, overflow: "hidden" }}>
            {loadError ? (
              <Alert severity="error" sx={{ m: 2 }}>
                Couldn&apos;t load Google Maps. Check the connection and the Maps API key.
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
            title="Layers"
            subtitle={data ? `${allMedia.length} geotagged ${allMedia.length === 1 ? "attachment" : "attachments"}` : "Loading the block's work…"}
            contentSx={{ p: 0 }}
            action={
              <Tooltip title="Reload the map data">
                <IconButton size="small" onClick={reload} aria-label="Reload the map data">
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            {dataError && (
              <Alert severity="error" sx={{ m: 2 }} action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
                {dataError}
              </Alert>
            )}
            <LayerRow
              swatch={<Diamond color={GP_COLOR} />}
              label="Network: BHQ, GPs, router"
              count={gpPoints.length + (bhqPoint ? 1 : 0) + (router ? 1 : 0)}
              checked={layers.network}
              onChange={() => toggleLayer("network")}
            >
              <Stack spacing={0.25}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Swatch>
                    <Square color={BHQ_COLOR} size={11} />
                  </Swatch>
                  <Typography variant="caption">{bhqPoint ? "Block HQ (BHQ)" : "Block HQ (no coordinates)"}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Swatch>
                    <Diamond color={GP_COLOR} />
                  </Swatch>
                  <Typography variant="caption">Gram Panchayat</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Swatch>
                    <Dot color={routerColor} />
                  </Swatch>
                  <Typography variant="caption">{router ? "Block router" : "Block router (not set)"}</Typography>
                </Box>
                {unmappedGps > 0 && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {unmappedGps} {unmappedGps === 1 ? "GP has" : "GPs have"} no coordinates and {unmappedGps === 1 ? "isn't" : "aren't"} on the map.
                  </Typography>
                )}
              </Stack>
            </LayerRow>
            <LayerRow swatch={<Pin color={INFRA_COLORS.BLOCK} />} label="Block infra" count={blockInfraCount} checked={layers.blockInfra} onChange={() => toggleLayer("blockInfra")} />
            <LayerRow swatch={<Pin color={INFRA_COLORS.GP} />} label="GP infra" count={gpInfraCount} checked={layers.gpInfra} onChange={() => toggleLayer("gpInfra")} />
            <LayerRow swatch={<Line color={RESTORATION_COLORS.APPROVED} thick />} label="Sections" count={sections.length} checked={layers.sections} onChange={() => toggleLayer("sections")}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                Coloured by restoration
              </Typography>
              <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
                {Object.entries(RESTORATION_COLORS).map(([key, color]) => (
                  <Box key={key} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                    <Line color={color} thick />
                    <Typography variant="caption">{restorationLabel(key)}</Typography>
                  </Box>
                ))}
              </Stack>
            </LayerRow>
            <LayerRow swatch={<Line color={STATUS_COLORS.IN_PROGRESS} />} label="Subsections" count={subsections.length} checked={layers.subsections} onChange={() => toggleLayer("subsections")}>
              <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap", mb: 1 }}>
                {[...SUB_STATUSES, "LEGACY"]
                  .filter((key) => key !== "LEGACY" || statusCount("LEGACY"))
                  .map((key) => (
                    <FilterChip key={key} label={statusLabel(key)} count={statusCount(key)} color={STATUS_COLORS[key]} on={subStatuses.has(key)} onClick={() => setSubStatuses((s) => toggleIn(s, key))} />
                  ))}
              </Stack>
              <Stack spacing={0.25}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Swatch>
                    <Line color="#475569" dashed />
                  </Swatch>
                  <Typography variant="caption">Planned from → to</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Swatch>
                    <Line color="#475569" />
                  </Swatch>
                  <Typography variant="caption">Executed path through the entries</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Swatch>
                    <Dot color="#15803d" size={14} />
                  </Swatch>
                  <Typography variant="caption">A · start pit / point</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Swatch>
                    <Dot color="#b91c1c" size={14} />
                  </Swatch>
                  <Typography variant="caption">B · end pit / point</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Swatch>
                    <Dot color={REF_COLOR} size={9} />
                  </Swatch>
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    Reference points ({refCount})
                  </Typography>
                  <Switch size="small" checked={layers.refs} onChange={() => toggleLayer("refs")} slotProps={{ input: { "aria-label": "Show reference points" } }} />
                </Box>
              </Stack>
            </LayerRow>
            <LayerRow swatch={<Dot color="#0891b2" />} label="Geotagged attachments" count={allMedia.length} checked={layers.media} onChange={() => toggleLayer("media")}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                Captured at
              </Typography>
              <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap", mb: 1 }}>
                {MEDIA_KINDS.map((k) => (
                  <FilterChip key={k.key} label={k.label} count={kindCount(k.key)} color={k.color} on={mediaKinds.has(k.key)} onClick={() => setMediaKinds((s) => toggleIn(s, k.key))} />
                ))}
              </Stack>
              <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap", mb: 1 }}>
                <FilterChip label="Photos" count={typeCount("IMAGE")} color="#475569" on={fileTypes.has("IMAGE")} onClick={() => setFileTypes((s) => toggleIn(s, "IMAGE"))} />
                <FilterChip label="Videos" count={typeCount("VIDEO")} color="#475569" square on={fileTypes.has("VIDEO")} onClick={() => setFileTypes((s) => toggleIn(s, "VIDEO"))} />
                <FilterChip label="Flagged only" count={flaggedCount} color="#f59e0b" on={flaggedOnly} onClick={() => setFlaggedOnly((v) => !v)} />
              </Stack>
              <Typography variant="caption" component="div" sx={{ color: "text.secondary" }}>
                Circle: photo · square: video · number: attachments at the same spot · amber ring: GPS above ±{limit} m, uploaded or location typed.
                {visibleMedia.length !== allMedia.length && ` Showing ${visibleMedia.length} of ${allMedia.length}.`}
                {data?.mediaWithoutLocation ? ` ${data.mediaWithoutLocation} without a location aren't on the map.` : ""}
              </Typography>
            </LayerRow>
          </SectionCard>

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
                      <Typography variant="caption" component="div" sx={{ color: state?.status === "error" ? "error.main" : "text.secondary" }}>
                        {[status, formatSize(file.sizeBytes), formatDate(file.uploadedAt)].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                    <Tooltip title={visible ? "Hide on map" : "Show on map"}>
                      <Switch size="small" checked={visible} onChange={() => toggleVisible(file._id)} slotProps={{ input: { "aria-label": `Show ${file.name} on map` } }} />
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
        </Grid>
      </Grid>

      <input ref={fileInputRef} type="file" accept=".kml,.kmz" hidden onChange={handleFile} />

      {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}

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
        &quot;{removeTarget?.name}&quot; will be removed from this block and deleted from storage.
      </ConfirmDeleteDialog>
    </>
  );
};

export default BlockMapPanel;
