import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  Chip,
  CircularProgress,
  GlobalStyles,
  IconButton,
  Link,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { GoogleMap, InfoWindow, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import CenterFocusStrongOutlinedIcon from "@mui/icons-material/CenterFocusStrongOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import blockProfileService from "../../services/blockProfileService.jsx";
import executionService from "../../services/executionService.jsx";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { fmtDateTime, fmtDistance } from "../../utils/executionFormat";
import KMLLayer from "../mapViewPage/mapComponents/KMLLayer";
import { initiallyHiddenLayers, kmlLayers } from "../mapViewPage/utils/kmlUtils";
import KmlLayerList from "./KmlLayerList";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "../mapViewPage/utils/googleMapsLoader";
import ConfirmDeleteDialog from "../common/ConfirmDeleteDialog";
import ExecMediaViewer from "../execution/ExecMediaViewer";
import { posterSrc, mediaSrc } from "../execution/mediaItems";
import { titleCase } from "../execution/execConstants";
import { useLoader } from "../execution/useLoader";
import PitMergeDialog from "../execution/PitMergeDialog";
import { usePermissions } from "../../hooks/usePermissions";
import { SITE_TYPES, formatDate, routerName } from "./blockProfileConstants";
import EquipmentDetails from "./EquipmentDetails";
import { miscBadge } from "./equipmentForms";
import {
  BADGE_PATH,
  ROUTER_COLOR,
  DIAMOND_PATH,
  EQUIPMENT_COLORS,
  GP_COLOR,
  INFRA_COLORS,
  MEDIA_KIND,
  MEDIA_KINDS,
  MEDIA_SQUARE_PATH,
  PIN_PATH,
  REF_COLOR,
  RESTORATION_COLORS,
  RING_COLOR,
  SQUARE_PATH,
  STAGE_LAYERS,
  STAGE_STATUSES,
  STATUS_COLORS,
  SUB_LABEL_ZOOM,
  DUCTING_TYPES,
  TYPE_COLORS,
  boundaryTicks,
  circleSymbol,
  groupMedia,
  isFlagged,
  lighten,
  lightSubsections,
  subTypeKey,
  symbol,
} from "./blockMapLayers";
import { StageRecordLayers, StageSwatch, SubsectionLabel, TickSwatch } from "./MapWorkLayers";
import { LegendGroup, MapLegend, MapStatusBar, ZoomBadge } from "./MapChrome";
import { MAP_PANEL_WIDTH, quietMapOptions, readMapPrefs, statusBarButtonSx, useMapCursor, writeMapPrefs } from "./mapChromeUtils";
import { exportBlockKml } from "../masterMap/masterMapExport";
import { ROAD_TOLERANCE_M, buildRoadNetwork, buildRoadPaths, midpointOf, pathLength } from "./roadPaths";

// Same starting view as the Locations map; the map fits to the block's data once it loads
const DEFAULT_CENTER = { lat: 9.31, lng: 76.45 };
const DEFAULT_ZOOM = 8;
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
// Layer switches and filters, remembered per browser like the Master Map's
const PREFS_KEY = "portal.blockMap.prefs";

// One colour per KML file so overlapping routes stay distinguishable; none is used by another layer
const KML_COLORS = ["#f97316", "#ca8a04", "#e11d48", "#0e7490", "#65a30d", "#78350f"];

// Names show next to the network points from this zoom in; further out they'd overlap
const NAME_ZOOM = 12;
const EQUIPMENT_FORMS_ON_MAP = [
  { key: "block", label: "Block router" },
  { key: "gp", label: "GP router" },
  { key: "misc", label: "Misc" },
];
const EQUIPMENT_TITLES = { block: "Block equipment", gp: "GP equipment", misc: "Misc equipment" };
// Code inside the equipment badge: R for routers, the asset-code tag for misc (RA, FD, FT, CC, SP)
const equipmentCode = (e) => (e.form === "misc" ? miscBadge(e) : "R");
const equipmentColor = (e) => (e.form === "misc" ? EQUIPMENT_COLORS.misc : EQUIPMENT_COLORS.router);
// Dashed line with an arrow halfway, pointing clockwise (previous → next node)
const ringIcons = (color) => [
  { icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: color, scale: 2 }, offset: "0", repeat: "10px" },
  {
    icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: color, strokeOpacity: 1, fillColor: color, fillOpacity: 1 },
    offset: "50%",
  },
];
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

// ---- legend swatches (the master map uses them too)

export const Dot = ({ color, size = 12, ring }) => (
  <Box sx={{ width: size, height: size, borderRadius: "50%", bgcolor: color, border: `2px solid ${ring || "#fff"}`, boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />
);
export const Square = ({ color, size = 13 }) => <Box sx={{ width: size, height: size, bgcolor: color, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />;
export const Diamond = ({ color }) => (
  <Box sx={{ width: 11, height: 11, bgcolor: color, transform: "rotate(45deg)", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />
);
export const Pin = ({ color }) => (
  <Box component="svg" viewBox="-10 -26 20 27" sx={{ width: 14, height: 19 }}>
    <path d={PIN_PATH} fill={color} stroke="#fff" strokeWidth="2" />
  </Box>
);
export const Line = ({ color, dashed, thick }) => (
  <Box sx={{ width: 22, height: 0, borderTop: `${thick ? 5 : 3}px ${dashed ? "dashed" : "solid"} ${color}`, opacity: thick ? 0.5 : 1 }} />
);

export const Badge = ({ color, text }) => (
  <Box
    sx={{
      minWidth: 22,
      height: 15,
      px: 0.25,
      borderRadius: 0.75,
      bgcolor: color,
      color: "#fff",
      fontSize: 9,
      fontWeight: 700,
      lineHeight: "15px",
      textAlign: "center",
      border: "1.5px solid #fff",
      boxShadow: "0 0 0 1px rgba(0,0,0,0.2)",
    }}
  >
    {text}
  </Box>
);

const Swatch = ({ children }) => <Box sx={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{children}</Box>;

/** A swatch and its meaning, inside a layer's legend */
const Key = ({ swatch, children, action }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 22 }}>
    <Swatch>{swatch}</Swatch>
    <Typography variant="caption" sx={{ flex: 1 }}>
      {children}
    </Typography>
    {action}
  </Box>
);

/** Heading over a group of layers */
export const GroupHeading = ({ children }) => (
  <Typography
    variant="overline"
    component="div"
    sx={{ px: 2, pt: 1.25, pb: 0.25, color: "text.secondary", bgcolor: "action.hover", borderBottom: 1, borderColor: "divider", lineHeight: 1.8 }}
  >
    {children}
  </Typography>
);

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

export const FilterChip = ({ label, count, color, on, onClick, square }) => (
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

export const InfoTitle = ({ children, sub }) => (
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

export const Line2 = ({ children }) =>
  children ? (
    <Typography variant="caption" component="div" sx={{ color: "text.secondary" }}>
      {children}
    </Typography>
  ) : null;

// One line per thing recorded at a site (block router or GP), with a link to open it
const SiteLine = ({ label, done, text, onOpen }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, py: 0.25 }}>
    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: done ? "success.main" : "text.disabled", flexShrink: 0 }} />
    <Typography variant="caption" sx={{ flex: 1 }}>
      <b>{label}:</b> {text}
    </Typography>
    <Link component="button" variant="caption" onClick={onOpen}>
      Open
    </Link>
  </Box>
);

export const MediaRow = ({ m, limit, onOpen }) => {
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
 * Block map on Google Maps, by layer: network (block router and GPs), KML files, block and
 * GP infra, sections (by restoration state), subsections (planned line, pits, reference
 * points and the executed path, by status) and every geotagged photo or video (by where
 * it was captured, photo / video, flagged only). Upload and remove KML need `canManageKml`.
 */
const BlockMapPanel = ({ blockProfile, canManageKml = false, userId, onProfileChange }) => {
  const navigate = useNavigate();
  const { config } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const mapOptions = useMemo(() => (isLoaded ? quietMapOptions() : undefined), [isLoaded]);
  const mouse = useMapCursor();
  const blockProfileId = blockProfile._id;
  const kmlFiles = useMemo(() => blockProfile.kmlFiles || [], [blockProfile.kmlFiles]);

  const loadMap = useCallback(() => executionService.getBlockMap(blockProfileId), [blockProfileId]);
  const { data, error: dataError, reload } = useLoader(loadMap);
  // Nearby pits to merge, for those who can; a frozen block is refused by the server
  const { can } = usePermissions();
  const canMerge = can("mergePits");
  const loadGaps = useCallback(
    () => (canMerge ? executionService.getPitGaps(blockProfileId) : Promise.resolve(null)),
    [blockProfileId, canMerge]
  );
  const { data: gapData, reload: reloadGaps } = useLoader(loadGaps);
  const gaps = gapData?.gaps || [];
  const [gap, setGap] = useState(null);

  const [map, setMap] = useState(null);
  const [selected, setSelected] = useState(null);
  const [viewing, setViewing] = useState(null);
  // fileId -> { status: "ready" | "error", features }, reported by each file's KMLLayer
  const [kmlState, setKmlState] = useState({});
  const [hidden, setHidden] = useState(() => new Set());
  // fileId -> Set of the KML layer (folder) ids switched off; files start as their KML says
  const [hiddenLayers, setHiddenLayers] = useState({});
  const lastFitKeyRef = useRef("");

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Layers and their filters. Attachments and reference points start off: they are many
  // small dots that hide the network until someone looks for them.
  const [prefs] = useState(() => readMapPrefs(PREFS_KEY));
  const [layers, setLayers] = useState(() => ({
    network: true,
    names: true,
    blockInfra: true,
    gpInfra: true,
    equipment: true,
    rings: true,
    sections: true,
    subsections: true,
    subLabels: true,
    refs: false,
    media: false,
    ...prefs.layers,
  }));
  const [equipmentForms, setEquipmentForms] = useState(() => new Set(prefs.equipmentForms || EQUIPMENT_FORMS_ON_MAP.map((f) => f.key)));
  const [subStatuses, setSubStatuses] = useState(() => new Set(prefs.subStatuses || [...SUB_STATUSES, "LEGACY"]));
  const [mediaKinds, setMediaKinds] = useState(() => new Set(prefs.mediaKinds || MEDIA_KINDS.map((k) => k.key)));
  // Section stages: which are drawn, and which record statuses
  const [stages, setStages] = useState(() => new Set(prefs.stages || STAGE_LAYERS.map((l) => l.stage)));
  const [stageStatuses, setStageStatuses] = useState(() => new Set(prefs.stageStatuses || STAGE_STATUSES));
  const [fileTypes, setFileTypes] = useState(() => new Set(prefs.fileTypes || ["IMAGE", "VIDEO"]));
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [legendOpen, setLegendOpen] = useState(prefs.legendOpen ?? true);
  const [legendAll, setLegendAll] = useState(false);
  const [panelOpen, setPanelOpen] = useState(prefs.panelOpen ?? true);
  const [tab, setTab] = useState("layers");
  useEffect(() => {
    writeMapPrefs(PREFS_KEY, {
      layers,
      equipmentForms: [...equipmentForms],
      subStatuses: [...subStatuses],
      mediaKinds: [...mediaKinds],
      stages: [...stages],
      stageStatuses: [...stageStatuses],
      fileTypes: [...fileTypes],
      legendOpen,
      panelOpen,
    });
  }, [layers, equipmentForms, subStatuses, mediaKinds, stages, stageStatuses, fileTypes, legendOpen, panelOpen]);
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
          ({ features, failed }) => {
            setKmlState((previous) => ({ ...previous, [file._id]: { status: failed.length ? "error" : "ready", features } }));
            setHiddenLayers((previous) => (previous[file._id] ? previous : { ...previous, [file._id]: new Set(initiallyHiddenLayers(features)) }));
          },
        ])
      ),
    [kmlFiles]
  );

  const routerLat = blockProfile.blockRouter?.latitude;
  const routerLng = blockProfile.blockRouter?.longitude;
  const router = useMemo(() => toPoint(routerLat, routerLng), [routerLat, routerLng]);
  const gpPoints = useMemo(
    () =>
      (blockProfile.gps || [])
        .map((gp) => ({ gp, point: toPoint(gp.latitude, gp.longitude) }))
        .filter(({ point }) => point),
    [blockProfile.gps]
  );

  const infra = useMemo(() => (data?.infra || []).filter((i) => Number.isFinite(i.lat)), [data]);
  const equipment = useMemo(() => (data?.equipment || []).filter((e) => Number.isFinite(e.lat)), [data]);
  const visibleEquipment = equipment.filter((e) => equipmentForms.has(e.form));

  // Where a ring node is: its equipment sheet's location, else the router / GP coordinates
  const nodePosition = useCallback(
    (code) => {
      if (code === blockProfile.blockCode) {
        const e = equipment.find((x) => x.form === "block");
        return e ? { lat: e.lat, lng: e.lng } : router;
      }
      const e = equipment.find((x) => x.form === "gp" && x.gpLgdCode === code);
      if (e) return { lat: e.lat, lng: e.lng };
      return gpPoints.find(({ gp }) => gp.lgdCode === code)?.point || null;
    },
    [equipment, router, gpPoints, blockProfile.blockCode]
  );
  const routerTitle = routerName(blockProfile);
  const nodeName = useCallback(
    (code) => (code === blockProfile.blockCode ? routerTitle : (blockProfile.gps || []).find((g) => g.lgdCode === code)?.name || code),
    [blockProfile.blockCode, blockProfile.gps, routerTitle]
  );

  const sections = useMemo(() => (data?.sections || []).filter((s) => s.from && s.to), [data]);
  const subsections = useMemo(() => data?.subsections || [], [data]);
  const lightSubs = useMemo(() => lightSubsections(subsections), [subsections]);
  const stageRecords = useMemo(() => data?.stageRecords || [], [data]);
  const allMedia = useMemo(() => data?.media || [], [data]);

  // Sections, subsections and ring links follow the road in the KML files, never a straight line
  const kmlFeatures = useMemo(() => kmlFiles.flatMap((file) => kmlState[file._id]?.features || []), [kmlFiles, kmlState]);
  const roadNetwork = useMemo(() => buildRoadNetwork(kmlFeatures), [kmlFeatures]);
  const roadPaths = useMemo(() => buildRoadPaths(data?.sections || [], subsections, roadNetwork), [data, subsections, roadNetwork]);

  // The final KML: the uploaded files with their layers, plus everything recorded on the block.
  // Waits for the block's work and every KML file, so nothing is missing from it.
  const kmlLoaded = kmlFiles.every((file) => kmlState[file._id]);
  const exportKml = () =>
    exportBlockKml(
      { profile: { ...blockProfile, gps: blockProfile.gps || [], kmlFiles }, ...data },
      Object.fromEntries(kmlFiles.map((file) => [file._id, kmlState[file._id]?.features || []])),
      { config, roads: roadPaths }
    );

  // Ring links from the GP sheets' previous / next node, once per direction, along the KML
  // road between the two nodes (path null when there's none)
  const ringLinks = useMemo(() => {
    const links = new Map();
    const add = (from, to, distanceM) => {
      if (!from || !to || from === to) return;
      const key = `${from}>${to}`;
      const existing = links.get(key);
      if (existing) {
        if (existing.distanceM == null) existing.distanceM = distanceM;
        return;
      }
      const a = nodePosition(from);
      const b = nodePosition(to);
      if (a && b) links.set(key, { key, from, to, path: roadPaths.route(a, b), distanceM });
    };
    equipment
      .filter((e) => e.form === "gp")
      .forEach((e) => {
        add(e.prevNode, e.gpLgdCode, e.prevNodeDistanceM);
        add(e.gpLgdCode, e.nextNode, e.nextNodeDistanceM);
      });
    return [...links.values()];
  }, [equipment, nodePosition, roadPaths]);
  const offRoadSections = (data?.sections || []).filter((s) => !roadPaths.sections.has(String(s._id)));
  const offRoadRings = ringLinks.filter((l) => !l.path).length;

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
      ...gpPoints.map(({ point }) => point),
      ...kmlFiles.flatMap((file) => (kmlState[file._id]?.features || []).flatMap(featurePoints)),
      ...infra.map((i) => ({ lat: i.lat, lng: i.lng })),
      ...equipment.map((e) => ({ lat: e.lat, lng: e.lng })),
      ...sections.flatMap((s) => [s.from, s.to]),
      ...subsections.flatMap((s) => [s.from, s.to, s.start, s.end, ...s.entries].filter(Boolean).map((p) => ({ lat: p.lat, lng: p.lng }))),
      ...allMedia.map((m) => ({ lat: m.lat, lng: m.lng })),
      ...stageRecords.filter((r) => Number.isFinite(r.lat)).map((r) => ({ lat: r.lat, lng: r.lng })),
    ],
    [router, gpPoints, kmlFiles, kmlState, infra, equipment, sections, subsections, allMedia, stageRecords]
  );
  const fitKey = [
    router ? formatPoint(router) : "",
    gpPoints.length,
    loadedKmlIds.join(","),
    data ? `${infra.length}/${equipment.length}/${sections.length}/${subsections.length}/${allMedia.length}/${stageRecords.length}` : "",
  ].join("|");

  const fitAll = useCallback(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 48);
  }, [map, points]);
  useEffect(() => {
    if (!map || points.length === 0 || fitKey === lastFitKeyRef.current) return;
    lastFitKeyRef.current = fitKey;
    fitAll();
  }, [map, points, fitKey, fitAll]);

  // Each file's KML layers (folders), for the list under it
  const layersByFile = useMemo(() => Object.fromEntries(Object.entries(kmlState).map(([id, st]) => [id, kmlLayers(st.features)])), [kmlState]);

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

  const showNames = layers.names && zoom >= NAME_ZOOM;
  // A name under a network point, with a white halo (.block-map-name) so it reads on any map tile
  const nameLabel = (text) =>
    showNames ? { text: titleCase(text), className: "block-map-name", color: "#111827", fontSize: "11px", fontWeight: "600" } : undefined;
  const unmappedGps = (blockProfile.gps?.length || 0) - gpPoints.length;
  const blockState = { blockProfileId, blockProfileName: blockProfile.block };
  const openSection = (id, name) => navigate(`/sections/${id}/subsections`, { state: { ...blockState, sectionId: id, sectionName: name } });
  const openSub = (s) => navigate(`/subsections/${s._id}`, { state: { ...blockState, sectionId: s.sectionId, sectionName: s.sectionName, subSectionId: s._id, subSectionName: s.name } });
  const select = (position, body) => setSelected({ position, body });

  const statusLabel = (key) => (key === "LEGACY" ? "Older (trenching)" : config?.statuses?.[key]?.label || key);
  const workTypeLabel = (key) => ({ OTHER: "Other work", LEGACY: "Older (trenching)" })[key] || config?.types?.[key]?.label || key;
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

  const gpPath = (code) => `/block-profiles/${blockProfileId}/gps/${encodeURIComponent(code)}`;
  const go = (path) => navigate(path, { state: blockState });

  // Block router or GP: what's recorded there, so one click answers "what is this and how far along is it"
  const infoSite = (position, { name, kind, code, infraOf, sheets, lines = [] }) => {
    const capture = (data?.infra || []).find(infraOf);
    select(position, (
      <Box sx={{ width: 260 }}>
        <InfoTitle sub={`${kind} · ${code}`}>{titleCase(name)}</InfoTitle>
        {lines.filter(Boolean).map((line) => (
          <Line2 key={line}>{line}</Line2>
        ))}
        <Line2>{formatPoint(position)}</Line2>
        <Box sx={{ mt: 0.75 }}>
          <SiteLine
            label="Infra capture"
            done={Boolean(capture)}
            text={capture ? `${capture.photoCount} ${capture.photoCount === 1 ? "photo" : "photos"}` : "not captured"}
            onOpen={() => go(sheets.infraPath)}
          />
          {sheets.forms.map(({ form, path }) => {
            // Block-level sheets have no GP code
            const e = (data?.equipment || []).find((x) => x.form === form && (x.gpLgdCode || null) === sheets.gpLgdCode);
            return (
              <SiteLine
                key={form}
                label={EQUIPMENT_TITLES[form]}
                done={Boolean(e)}
                text={e ? e.assetCode : "not filled"}
                onOpen={() => (e && Number.isFinite(e.lat) ? infoEquipment(e) : go(path))}
              />
            );
          })}
        </Box>
      </Box>
    ));
  };

  const infoGp = (gp, point) =>
    infoSite(point, {
      name: gp.name,
      kind: "Gram Panchayat · LGD",
      code: gp.lgdCode,
      infraOf: (i) => i.level === "GP" && i.gpLgdCode === gp.lgdCode,
      sheets: {
        gpLgdCode: gp.lgdCode,
        infraPath: `${gpPath(gp.lgdCode)}/infra`,
        forms: [
          { form: "gp", path: `${gpPath(gp.lgdCode)}/equipment/gp` },
          { form: "misc", path: `${gpPath(gp.lgdCode)}/equipment/misc` },
        ],
      },
    });

  const infoRouter = () =>
    infoSite(router, {
      name: routerName(blockProfile),
      kind: "Block LGD code",
      code: blockProfile.blockCode,
      lines: [SITE_TYPES[blockProfile.blockRouter?.siteType], blockProfile.blockRouter?.address],
      infraOf: (i) => i.level === "BLOCK",
      sheets: {
        gpLgdCode: null,
        infraPath: `/block-profiles/${blockProfileId}/infra`,
        forms: [
          { form: "block", path: `/block-profiles/${blockProfileId}/equipment/block` },
          { form: "misc", path: `/block-profiles/${blockProfileId}/equipment/misc` },
        ],
      },
    });

  // Every value of an equipment sheet, as on the Block infra / GPs tabs
  const infoEquipment = (e) =>
    select({ lat: e.lat, lng: e.lng }, (
      <Box sx={{ width: 300 }}>
        <InfoTitle sub={[titleCase(e.name), e.assetCode].filter(Boolean).join(" · ")}>{EQUIPMENT_TITLES[e.form]}</InfoTitle>
        <Box sx={{ maxHeight: 300, overflowY: "auto", pr: 1, my: 0.5 }}>
          <EquipmentDetails formKey={e.form} record={e} columns={{ xs: 1 }} />
        </Box>
        <Link component="button" variant="caption" onClick={() => go(e.gpLgdCode ? `${gpPath(e.gpLgdCode)}/equipment/${e.form}` : `/block-profiles/${blockProfileId}/equipment/${e.form}`)}>
          Open form
        </Link>
      </Box>
    ));

  const infoRing = (link, position) =>
    infoNode(position, `${titleCase(nodeName(link.from))} → ${titleCase(nodeName(link.to))}`, [
      "Ring link (clockwise), from the GP equipment sheets",
      link.distanceM != null ? `Optical length ${fmtDistance(link.distanceM)}` : "Optical length not entered",
    ]);

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
        {roadPaths.sections.has(String(s._id)) && <Line2>{`Road from the KML: ${fmtDistance(pathLength(roadPaths.sections.get(String(s._id))))}`}</Line2>}
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
        <Line2>{fmtDistance(s.subSectionLength)} entered{s.calculatedLength != null ? ` · ${fmtDistance(s.calculatedLength)} calculated` : ""} · {s.entries.length} {s.entries.length === 1 ? "entry" : "entries"}</Line2>
        {roadPaths.problems.has(String(s._id)) && <Line2>{`Planned line not drawn: ${roadPaths.problems.get(String(s._id))}`}</Line2>}
        <Link component="button" variant="caption" onClick={() => (s.legacy ? navigate(`/subsections/${s._id}/trenching`, { state: blockState }) : openSub(s))}>
          {s.legacy ? "Open trenching" : "Open job card"}
        </Link>
      </>
    ));

  // A stage record: what it is, where it runs, and a link to the record
  const infoStage = (r, position) => {
    const sectionName = sections.find((x) => x._id === r.sectionId)?.name;
    const nameOf = (id) => stageRecords.find((x) => x._id === String(id))?.name;
    const sub = subsections.find((x) => x._id === String(r.links?.subSection));
    select(position, (
      <>
        <InfoTitle sub={[config?.stages?.[r.stage]?.label || r.stage, sectionName].filter(Boolean).join(" · ")}>{r.name}</InfoTitle>
        <Line2>{[r.stage === "CHAMBER" ? r.type : "", statusLabel(r.status)].filter(Boolean).join(" · ")}</Line2>
        {r.stage === "DUCTING" && sub && <Line2>{`Along ${sub.name} · ${fmtDistance(sub.subSectionLength)}`}</Line2>}
        {r.stage === "BLOWING" && <Line2>{`${nameOf(r.links?.fromChamber) || "—"} → ${nameOf(r.links?.toChamber) || "—"}`}</Line2>}
        <Link component="button" variant="caption" onClick={() => navigate(`/stage-records/${r._id}`, { state: { ...blockState, sectionId: r.sectionId, sectionName } })}>
          Open record
        </Link>
      </>
    ));
  };

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
    // Coloured by type of work; every other subsection in a section takes the light shade, so neighbours stand apart
    const typeColor = TYPE_COLORS[subTypeKey(s)];
    const color = lightSubs.has(String(s._id)) ? lighten(typeColor) : typeColor;
    const executed = [s.start, ...s.entries, s.end].filter(Boolean).map((p) => ({ lat: p.lat, lng: p.lng }));
    // Along the road from the KML; without one only the field work shows
    const planned = roadPaths.subsections.get(String(s._id));
    const mid = planned ? midpointOf(planned) : executed[0];
    // The line its ends are ticked on and its label sits at
    const line = planned || (executed.length > 1 ? executed : null);
    const pitA = config?.types?.[s.typeOfWork]?.pitA || "Start";
    const pitB = config?.types?.[s.typeOfWork]?.pitB || "End";
    return (
      <React.Fragment key={s._id}>
        {planned && (
          <Polyline
            path={planned}
            options={{ strokeOpacity: 0, strokeColor: color, icons: DASH.map((d) => ({ ...d, icon: { ...d.icon, strokeColor: color } })), zIndex: 3 }}
            onClick={() => infoSub(s, mid, "Planned line")}
          />
        )}
        {executed.length > 1 && (
          <Polyline path={executed} options={{ strokeColor: color, strokeWeight: 4, strokeOpacity: 0.9, zIndex: 4 }} onClick={(e) => infoSub(s, e.latLng.toJSON(), "Executed path")} />
        )}
        {line && <Polyline path={line} options={{ strokeOpacity: 0, icons: boundaryTicks(), zIndex: 5, clickable: false }} />}
        {line && layers.subLabels && zoom >= SUB_LABEL_ZOOM && <SubsectionLabel subsection={s} path={line} onClick={(position) => infoSub(s, position, "Subsection")} />}
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
      options={mapOptions}
      onLoad={setMap}
      onUnmount={() => setMap(null)}
      onZoomChanged={() => map && setZoom(map.getZoom())}
      onMouseMove={mouse.onMouseMove}
      onMouseOut={mouse.onMouseOut}
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
            hiddenLayers={hiddenLayers[file._id]}
          />
        )
      )}

      {layers.sections &&
        sections.map((s) => {
          const color = RESTORATION_COLORS[s.restorationStatus] || RESTORATION_COLORS.LOCKED;
          const road = roadPaths.sections.get(String(s._id));
          // A wide band along the road from the KML; a section is never the straight line between its nodes
          return road ? (
            <Polyline
              key={s._id}
              path={road}
              options={{ strokeColor: color, strokeWeight: 8, strokeOpacity: 0.35, zIndex: 1 }}
              onClick={(e) => infoSection(s, e.latLng.toJSON())}
            />
          ) : null;
        })}

      {layers.subsections && visibleSubs.map(renderSubsection)}
      <StageRecordLayers records={stageRecords} subsections={subsections} roads={roadPaths} visible={stages} statuses={stageStatuses} onPick={infoStage} />
      {gaps.map((g) => (
        <Marker
          key={`${g.a.subSection}:${g.a.side}:${g.b.subSection}:${g.b.side}`}
          position={{ lat: (g.a.latitude + g.b.latitude) / 2, lng: (g.a.longitude + g.b.longitude) / 2 }}
          icon={circleSymbol("#f59e0b", 11, { stroke: "#ffffff", strokeWeight: 3 })}
          label={{ text: "!", color: "#ffffff", fontSize: "13px", fontWeight: "700" }}
          zIndex={12}
          title={`Pit gap · ${g.a.name} and ${g.b.name} · ${g.distanceM} m`}
          onClick={() => setGap(g)}
        />
      ))}

      {layers.rings &&
        ringLinks.filter((link) => link.path).map((link) => (
          <Polyline
            key={link.key}
            path={link.path}
            options={{ strokeOpacity: 0, icons: ringIcons(RING_COLOR), zIndex: 2 }}
            onClick={(e) => infoRing(link, e.latLng.toJSON())}
          />
        ))}

      {layers.network &&
        gpPoints.map(({ gp, point }) => (
          <Marker
            key={gp.lgdCode}
            position={point}
            title={`GP: ${titleCase(gp.name)} (LGD ${gp.lgdCode})`}
            icon={symbol(DIAMOND_PATH, GP_COLOR, { labelBelow: 21 })}
            label={nameLabel(gp.name)}
            zIndex={9}
            onClick={() => infoGp(gp, point)}
          />
        ))}
      {layers.network && router && (
        <Marker
          position={router}
          title="Block router"
          icon={symbol(SQUARE_PATH, ROUTER_COLOR, { labelBelow: 20 })}
          label={nameLabel(routerName(blockProfile))}
          zIndex={10}
          onClick={infoRouter}
        />
      )}

      {infra
        .filter((i) => (i.level === "BLOCK" ? layers.blockInfra : layers.gpInfra))
        .map((i) => (
          <Marker
            key={i._id}
            position={{ lat: i.lat, lng: i.lng }}
            icon={symbol(PIN_PATH, INFRA_COLORS[i.level])}
            zIndex={11}
            title={`${i.level === "BLOCK" ? "Block infra capture" : "GP infra capture"}: ${titleCase(i.name)} · ${i.photoCount} ${i.photoCount === 1 ? "photo" : "photos"}`}
            onClick={() => infoInfra(i)}
          />
        ))}

      {layers.equipment &&
        visibleEquipment.map((e) => (
          <Marker
            key={e._id}
            position={{ lat: e.lat, lng: e.lng }}
            icon={symbol(BADGE_PATH, equipmentColor(e))}
            label={{ text: equipmentCode(e), color: "#ffffff", fontSize: "10px", fontWeight: "700" }}
            zIndex={12}
            title={`${EQUIPMENT_TITLES[e.form]}: ${titleCase(e.name)}${e.assetCode ? ` · ${e.assetCode}` : ""}`}
            onClick={() => infoEquipment(e)}
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
  const workTypeCount = (key) => subsections.filter((s) => subTypeKey(s) === key).length;
  const kindCount = (key) => allMedia.filter((m) => m.kind === key).length;
  const typeCount = (t) => allMedia.filter((m) => (m.fileType === "VIDEO" ? "VIDEO" : "IMAGE") === t).length;
  const flaggedCount = allMedia.filter((m) => isFlagged(m, limit)).length;
  const refCount = subsections.reduce((n, s) => n + (s.start?.refs.length || 0) + (s.end?.refs.length || 0), 0);

  // ---- side panel: layers and KML files, as on the Master Map
  const renderLayersPanel = () => (
    <Box sx={{ flex: 1, overflowY: "auto" }}>
      {dataError && (
        <Alert severity="error" sx={{ m: 2 }} action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
          {dataError}
        </Alert>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Swatch>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Aa
          </Typography>
        </Swatch>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
          Names
        </Typography>
        <ZoomBadge minZoom={NAME_ZOOM} zoom={zoom} />
        <Switch size="small" checked={layers.names} onChange={() => toggleLayer("names")} slotProps={{ input: { "aria-label": "Show names" } }} />
      </Box>
      <GroupHeading>Network</GroupHeading>
      <LayerRow
        swatch={<Diamond color={GP_COLOR} />}
        label="Block router and GPs"
        count={gpPoints.length + (router ? 1 : 0)}
        checked={layers.network}
        onChange={() => toggleLayer("network")}
      >
        <Stack spacing={0.25}>
          {unmappedGps > 0 && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {unmappedGps} {unmappedGps === 1 ? "GP has" : "GPs have"} no coordinates and {unmappedGps === 1 ? "isn't" : "aren't"} on the map.
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Click the block router or a GP to see its infra capture and equipment sheets.
          </Typography>
        </Stack>
      </LayerRow>

      <GroupHeading>Infra</GroupHeading>
      <LayerRow
        swatch={<Pin color={INFRA_COLORS.BLOCK} />}
        label="Block infra capture"
        count={blockInfraCount}
        checked={layers.blockInfra}
        onChange={() => toggleLayer("blockInfra")}
      />
      <LayerRow swatch={<Pin color={INFRA_COLORS.GP} />} label="GP infra capture" count={gpInfraCount} checked={layers.gpInfra} onChange={() => toggleLayer("gpInfra")} />
      <LayerRow
        swatch={<Badge color={EQUIPMENT_COLORS.router} text="R" />}
        label="Equipment"
        count={equipment.length}
        checked={layers.equipment}
        onChange={() => toggleLayer("equipment")}
      >
        <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap" }}>
          {EQUIPMENT_FORMS_ON_MAP.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              count={equipment.filter((e) => e.form === f.key).length}
              color={f.key === "misc" ? EQUIPMENT_COLORS.misc : EQUIPMENT_COLORS.router}
              square
              on={equipmentForms.has(f.key)}
              onClick={() => setEquipmentForms((s) => toggleIn(s, f.key))}
            />
          ))}
        </Stack>
      </LayerRow>
      <LayerRow
        swatch={<Line color={RING_COLOR} dashed />}
        label="Ring links"
        count={ringLinks.length - offRoadRings}
        checked={layers.rings}
        onChange={() => toggleLayer("rings")}
      >
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Previous → next node from the GP equipment sheets, along the KML road; the arrow points clockwise. Click a link for its optical length.
        </Typography>
        {offRoadRings > 0 && (
          <Typography variant="caption" component="div" sx={{ color: "warning.dark", mt: 0.5 }}>
            {offRoadRings} {offRoadRings === 1 ? "link isn't" : "links aren't"} drawn: no KML road runs between {offRoadRings === 1 ? "its" : "their"} nodes.
          </Typography>
        )}
      </LayerRow>

      <GroupHeading>Work</GroupHeading>
      <LayerRow
        swatch={<Line color={RESTORATION_COLORS.APPROVED} thick />}
        label="Sections"
        count={(data?.sections?.length || 0) - offRoadSections.length}
        checked={layers.sections}
        onChange={() => toggleLayer("sections")}
      >
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
          Wide band along the road from the block&apos;s KML, from node to node, coloured by restoration (see the legend). Each node snaps to the nearest KML road within {ROAD_TOLERANCE_M} m.
        </Typography>
        {data && kmlFiles.every((file) => kmlState[file._id]) && offRoadSections.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1, py: 0, "& .MuiAlert-message": { py: 0.75 } }}>
            <Typography variant="caption" component="div" sx={{ fontWeight: 700 }}>
              {offRoadSections.length} {offRoadSections.length === 1 ? "section isn't" : "sections aren't"} on the map
            </Typography>
            {offRoadSections.slice(0, 5).map((s) => (
              <Typography key={s._id} variant="caption" component="div">
                <b>{s.name}:</b> {roadPaths.problems.get(String(s._id))}
              </Typography>
            ))}
            {offRoadSections.length > 5 && (
              <Typography variant="caption" component="div">
                and {offRoadSections.length - 5} more
              </Typography>
            )}
          </Alert>
        )}
      </LayerRow>
      <LayerRow swatch={<Line color={TYPE_COLORS.HDD} />} label="Subsections" count={subsections.length} checked={layers.subsections} onChange={() => toggleLayer("subsections")}>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
          Show by status
        </Typography>
        <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap", mb: 1 }}>
          {[...SUB_STATUSES, "LEGACY"]
            .filter((key) => key !== "LEGACY" || statusCount("LEGACY"))
            .map((key) => (
              <FilterChip key={key} label={statusLabel(key)} count={statusCount(key)} on={subStatuses.has(key)} onClick={() => setSubStatuses((s) => toggleIn(s, key))} />
            ))}
        </Stack>
        <Stack spacing={0.25}>
          <Key
            swatch={
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Aa
              </Typography>
            }
            action={<Switch size="small" checked={layers.subLabels} onChange={() => toggleLayer("subLabels")} slotProps={{ input: { "aria-label": "Show subsection labels" } }} />}
          >
            Name and length <ZoomBadge minZoom={SUB_LABEL_ZOOM} zoom={zoom} />
          </Key>
          <Key
            swatch={<Dot color={REF_COLOR} size={9} />}
            action={<Switch size="small" checked={layers.refs} onChange={() => toggleLayer("refs")} slotProps={{ input: { "aria-label": "Show reference points" } }} />}
          >
            Reference points ({refCount})
          </Key>
        </Stack>
      </LayerRow>

      <GroupHeading>Stages</GroupHeading>
      {STAGE_LAYERS.map((l) => (
        <LayerRow
          key={l.stage}
          swatch={<StageSwatch stage={l.stage} />}
          label={config?.stages?.[l.stage]?.label || l.label}
          count={stageRecords.filter((r) => r.stage === l.stage).length}
          checked={stages.has(l.stage)}
          onChange={() => setStages((v) => toggleIn(v, l.stage))}
        />
      ))}
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
          Show by status
        </Typography>
        <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap" }}>
          {STAGE_STATUSES.map((key) => (
            <FilterChip
              key={key}
              label={statusLabel(key)}
              count={stageRecords.filter((r) => r.status === key).length}
              color={STATUS_COLORS[key]}
              on={stageStatuses.has(key)}
              onClick={() => setStageStatuses((v) => toggleIn(v, key))}
            />
          ))}
        </Stack>
      </Box>

      <GroupHeading>Attachments</GroupHeading>
      <LayerRow swatch={<Dot color="#0891b2" />} label="Geotagged photos and videos" count={allMedia.length} checked={layers.media} onChange={() => toggleLayer("media")}>
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
      <Typography variant="caption" component="p" sx={{ color: "text.secondary", px: 2, py: 1.5 }}>
        {data ? `${allMedia.length} geotagged ${allMedia.length === 1 ? "attachment" : "attachments"}. ` : "Loading the block's work… "}
        What each colour and shape means is in the legend on the map.
      </Typography>
    </Box>
  );

  const renderKmlPanel = () => (
    <Box sx={{ flex: 1, overflowY: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
          {kmlFiles.length} {kmlFiles.length === 1 ? "file" : "files"}
        </Typography>
        <Tooltip title={!data || !kmlLoaded ? "Loading the block's work and KML…" : "The uploaded KML with its layers, plus the network, sections, subsections, infra, equipment and attachments"}>
          <span>
            <Button size="small" startIcon={<FileDownloadOutlinedIcon />} onClick={exportKml} disabled={!data || !kmlLoaded}>
              Export KML
            </Button>
          </span>
        </Tooltip>
        {canManageKml && (
          <Button
            size="small"
            startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadFileOutlinedIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        )}
      </Box>
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
          const layers = layersByFile[file._id] || [];
          return (
            <Box key={file._id} sx={{ px: 2.5, py: 1.25, "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: kmlColor(index), flexShrink: 0, opacity: visible ? 1 : 0.35 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }} title={file.name}>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ color: state?.status === "error" ? "error.main" : "text.secondary" }}>
                    {[status, layers.length ? `${layers.length} ${layers.length === 1 ? "layer" : "layers"}` : "", formatSize(file.sizeBytes), formatDate(file.uploadedAt)]
                      .filter(Boolean)
                      .join(" · ")}
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
              {visible && layers.length > 0 && (
                <Box sx={{ pl: 3.5, pt: 0.75 }}>
                  <KmlLayerList
                    layers={layers}
                    hidden={hiddenLayers[file._id] || new Set()}
                    onChange={(next) => setHiddenLayers((previous) => ({ ...previous, [file._id]: next }))}
                    fileName={file.name}
                  />
                </Box>
              )}
            </Box>
          );
        })
      )}
    </Box>
  );

  // ---- legend over the map: the layers that are on, or every layer
  const legendGroups = [
    {
      on: layers.network,
      label: "Block router and GPs",
      items: [
        { swatch: <Square color={ROUTER_COLOR} size={11} />, text: router ? "Block router (head node)" : "Block router (no coordinates)" },
        { swatch: <Diamond color={GP_COLOR} />, text: "Gram Panchayat" },
      ],
    },
    {
      on: layers.blockInfra || layers.gpInfra,
      label: "Infra capture",
      items: [
        { swatch: <Pin color={INFRA_COLORS.BLOCK} />, text: "Block infra capture" },
        { swatch: <Pin color={INFRA_COLORS.GP} />, text: "GP infra capture" },
      ],
    },
    {
      on: layers.equipment,
      label: "Equipment",
      items: [
        { swatch: <Badge color={EQUIPMENT_COLORS.router} text="R" />, text: "Router (block or GP sheet)" },
        { swatch: <Badge color={EQUIPMENT_COLORS.misc} text="FD" />, text: "Misc: RA rack, FD FDMS, FT FTB, CC CCU, SP SPV, ER earthing, EM electric meter" },
      ],
    },
    { on: layers.rings, label: "Ring links", items: [{ swatch: <Line color={RING_COLOR} dashed />, text: "Previous → next node; the arrow points clockwise" }] },
    {
      on: layers.sections,
      label: "Sections",
      items: Object.entries(RESTORATION_COLORS).map(([key, color]) => ({ swatch: <Line color={color} thick />, text: `Restoration · ${restorationLabel(key)}` })),
    },
    {
      on: layers.subsections,
      label: "Subsections",
      items: [
        ...Object.keys(TYPE_COLORS)
          .filter((key) => DUCTING_TYPES.includes(key) || workTypeCount(key))
          .map((key) => ({ swatch: <Line color={TYPE_COLORS[key]} />, text: `${workTypeLabel(key)} (${workTypeCount(key)})` })),
        { swatch: <Line color="#475569" dashed />, text: "Planned line, along the road from → to" },
        { swatch: <Line color="#475569" />, text: "Executed path through the entries" },
        { swatch: <Line color={lighten(TYPE_COLORS.HDD)} />, text: "Every other subsection in a section is lighter" },
        { swatch: <TickSwatch />, text: "Where one subsection ends and the next begins" },
        { swatch: <Dot color="#15803d" size={14} />, text: "A · start pit / point" },
        { swatch: <Dot color="#b91c1c" size={14} />, text: "B · end pit / point" },
        ...(layers.refs ? [{ swatch: <Dot color={REF_COLOR} size={9} />, text: "Reference point" }] : []),
      ],
    },
    ...STAGE_LAYERS.map((l) => ({ on: stages.has(l.stage), label: config?.stages?.[l.stage]?.label || l.label, items: [{ swatch: <StageSwatch stage={l.stage} />, text: l.note }] })),
    {
      on: stages.size > 0,
      label: "Stage records",
      items: STAGE_STATUSES.map((key) => ({ swatch: <Dot color={STATUS_COLORS[key]} />, text: statusLabel(key) })),
    },
    {
      on: layers.media,
      label: "Attachments",
      items: [
        ...MEDIA_KINDS.map((k) => ({ swatch: <Dot color={k.color} />, text: k.label })),
        { swatch: <Dot color="#475569" />, text: "Photo · a number when several are at one spot" },
        { swatch: <Square color="#475569" size={11} />, text: "Video" },
        { swatch: <Dot color="#475569" ring="#f59e0b" />, text: `GPS above ±${limit} m, uploaded or location typed` },
      ],
    },
    ...(gaps.length ? [{ on: true, label: "Pit gaps", items: [{ swatch: <Dot color="#f59e0b" size={14} />, text: `Pits within ${gapData.maxGapM} m to compare and merge` }] }] : []),
  ];

  const renderLegend = () => {
    const shown = legendGroups.filter((g) => legendAll || g.on);
    return (
      <MapLegend all={legendAll} onToggleAll={() => setLegendAll((v) => !v)} onClose={() => setLegendOpen(false)} empty={shown.length === 0}>
        {shown.map((g) => (
          <LegendGroup key={g.label} label={g.label} items={g.items} />
        ))}
      </MapLegend>
    );
  };

  return (
    <>
      <GlobalStyles styles={{ ".block-map-name": { textShadow: "0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff", whiteSpace: "nowrap" } }} />
      {gaps.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {gaps.length === 1 ? "1 pit gap" : `${gaps.length} pit gaps`} within {gapData.maxGapM} m. Click an amber marker on the map to compare and merge.
        </Alert>
      )}
      <PitMergeDialog
        gap={gap}
        blockId={blockProfileId}
        onClose={() => setGap(null)}
        onMerged={() => {
          setGap(null);
          reload();
          reloadGaps();
        }}
      />
      <Card sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, height: { md: "calc(100vh - 240px)" }, minHeight: { md: 600 }, overflow: "hidden" }}>
        {panelOpen && (
          <Box
            sx={{
              width: { xs: "100%", md: MAP_PANEL_WIDTH },
              height: { xs: 380, md: "auto" },
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: { md: 1 },
              borderBottom: { xs: 1, md: 0 },
              borderColor: "divider",
              minHeight: 0,
            }}
          >
            <Tabs value={tab} onChange={(e, value) => setTab(value)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: "divider", minHeight: 44, "& .MuiTab-root": { minHeight: 44 } }}>
              <Tab value="layers" label="Layers" />
              <Tab value="kml" label={`KML files${kmlFiles.length ? ` (${kmlFiles.length})` : ""}`} />
            </Tabs>
            {tab === "layers" ? renderLayersPanel() : renderKmlPanel()}
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: { xs: 520, md: "auto" } }}>
          <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
            {loadError ? (
              <Alert severity="error" sx={{ m: 2 }}>
                Couldn&apos;t load Google Maps. Check the connection and the Maps API key.
              </Alert>
            ) : isLoaded ? (
              renderMap()
            ) : (
              <Skeleton variant="rectangular" sx={{ width: "100%", height: "100%" }} />
            )}
            {isLoaded && legendOpen && renderLegend()}
          </Box>
          <MapStatusBar
            panelOpen={panelOpen}
            onTogglePanel={() => setPanelOpen((v) => !v)}
            cursor={mouse}
            zoom={zoom}
            status={
              !data &&
              !dataError && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: { xs: "none", sm: "block" } }}>
                  · Loading the block&apos;s work…
                </Typography>
              )
            }
            actions={
              <>
                <Tooltip title="Reload the map data">
                  <IconButton size="small" onClick={reload} aria-label="Reload the map data" sx={statusBarButtonSx}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Fit the block">
                  <span>
                    <IconButton size="small" onClick={fitAll} disabled={!points.length} aria-label="Fit the block" sx={statusBarButtonSx}>
                      <CenterFocusStrongOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            }
            legendOpen={legendOpen}
            onToggleLegend={() => setLegendOpen((v) => !v)}
          />
        </Box>
      </Card>

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
