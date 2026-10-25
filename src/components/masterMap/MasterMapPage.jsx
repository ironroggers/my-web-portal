import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  GlobalStyles,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { GoogleMap, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CenterFocusStrongOutlinedIcon from "@mui/icons-material/CenterFocusStrongOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import executionService from "../../services/executionService.jsx";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { useLoader } from "../execution/useLoader";
import { titleCase } from "../execution/execConstants";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "../mapViewPage/utils/googleMapsLoader";
import { fetchKMLContentFromURL, inHiddenLayer, initiallyHiddenLayers, kmlLayers, parseKMLContent } from "../mapViewPage/utils/kmlUtils";
import KmlLayerList from "../blockProfile/KmlLayerList";
import PageHeader from "../common/PageHeader";
import StatTile from "../common/StatTile";
import ExecMediaViewer from "../execution/ExecMediaViewer";
import { Badge, Diamond, Dot, FilterChip, GroupHeading, Line, Pin, Square } from "../blockProfile/BlockMapPanel";
import { EQUIPMENT_COLORS, MEDIA_KINDS, STATUS_COLORS } from "../blockProfile/blockMapLayers";
import MasterMapBlockLayers from "./MasterMapBlockLayers";
import MasterMapBlockTree from "./MasterMapBlockTree";
import MasterMapInfo from "./MasterMapInfo";
import { exportMasterMapExcel, exportMasterMapKml } from "./masterMapExport";
import { buildRoadNetwork, buildRoadPaths } from "../blockProfile/roadPaths";
import {
  EQUIPMENT_FORMS_ON_MAP,
  LAYER_GROUPS,
  LOAD_CONCURRENCY,
  NAME_ZOOM,
  SUB_STATUSES,
  THICK_LINE_ZOOM,
  blockPoints,
  boundsOf,
  intersects,
  layerDefs,
  padBounds,
  readPrefs,
  subKey,
  writePrefs,
} from "./masterMapLayers";

// Kerala, as on the Locations map, until blocks are picked
const DEFAULT_CENTER = { lat: 9.31, lng: 76.45 };
const DEFAULT_ZOOM = 7;
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
// Quieter base map so the network's colours stand out
const MAP_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", stylers: [{ saturation: -60 }] },
];
const PANEL_WIDTH = 320;

// Parsed KML per file URL, kept for the whole session: files don't change once uploaded
const kmlCache = new Map();
const loadKml = (url) => {
  if (!kmlCache.has(url)) {
    const request = fetchKMLContentFromURL(url)
      .then(parseKMLContent)
      .catch((error) => {
        kmlCache.delete(url);
        throw error;
      });
    kmlCache.set(url, request);
  }
  return kmlCache.get(url);
};

// A block's road paths, rebuilt only when its data or one of its KML files changes: the
// road network of a big ring KML takes a moment to build
const roadsCache = new WeakMap();
const roadsOf = (data, files) => {
  const hit = roadsCache.get(data);
  if (hit && hit.files.length === files.length && hit.files.every((f, i) => f === files[i])) return hit.roads;
  const roads = buildRoadPaths(data.sections, data.subsections, buildRoadNetwork(files.flatMap((f) => f || [])));
  roadsCache.set(data, { files, roads });
  return roads;
};

const toggleIn = (set, key) => {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
};

/** A legend swatch from a layer definition's { shape, color, … } */
const LegendSwatch = ({ item }) => {
  switch (item.shape) {
    case "square":
      return <Square color={item.color} size={11} />;
    case "diamond":
      return <Diamond color={item.color} />;
    case "pin":
      return <Pin color={item.color} />;
    case "badge":
      return <Badge color={item.color} text={item.text} />;
    case "line":
      return <Line color={item.color} dashed={item.dashed} thick={item.thick} />;
    default:
      return <Dot color={item.color} size={item.size} />;
  }
};

const Swatch = ({ children }) => <Box sx={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{children}</Box>;

const ZoomBadge = ({ minZoom, zoom }) =>
  minZoom > 0 ? (
    <Tooltip title={zoom < minZoom ? `Zoom in to ${minZoom} to see this layer` : `Shows from zoom ${minZoom}`}>
      <Box
        component="span"
        sx={{
          px: 0.5,
          borderRadius: 0.5,
          fontSize: 10,
          fontWeight: 700,
          lineHeight: "16px",
          border: 1,
          borderColor: zoom < minZoom ? "warning.main" : "divider",
          color: zoom < minZoom ? "warning.dark" : "text.secondary",
          flexShrink: 0,
        }}
      >
        z{minZoom}
      </Box>
    </Tooltip>
  ) : null;

/** One layer: swatch, label, min-zoom badge, count and switch; its filters show while it's on */
const LayerRow = ({ def, count, checked, onChange, zoom, children }) => (
  <Box sx={{ px: 2, py: 0.75, "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" } }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Swatch>
        <LegendSwatch item={def.legend[0]} />
      </Swatch>
      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
        {def.label}
      </Typography>
      <ZoomBadge minZoom={def.minZoom} zoom={zoom} />
      {count !== undefined && (
        <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", minWidth: 20, textAlign: "right" }}>
          {count}
        </Typography>
      )}
      <Switch size="small" checked={checked} onChange={onChange} slotProps={{ input: { "aria-label": `Show ${def.label}` } }} />
    </Box>
    {checked && children && <Box sx={{ pl: 4, pt: 0.5, pb: 0.5 }}>{children}</Box>}
  </Box>
);

const statusBarButtonSx = { color: "text.secondary", "&:hover": { color: "text.primary" } };

/**
 * Master Map: every block's network and work on one read-only map. Blocks are picked in a
 * State → District → Block tree (kept in the URL as ?blocks=…); each picked block loads
 * its own layers, and a block's details draw only while it's in view and the zoom is
 * close enough. Export to KML or Excel covers the picked blocks and the layers that are on.
 */
const MasterMapPage = () => {
  const defs = useMemo(() => layerDefs(), []);
  const { config } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const { data: list, error: listError, reload: reloadList } = useLoader(executionService.getMasterMapBlocks);
  const blocks = useMemo(() => list?.items || [], [list]);
  const blockById = useMemo(() => new Map(blocks.map((b) => [b._id, b])), [blocks]);

  // ---- picked blocks, in the URL so a view can be shared
  const [searchParams, setSearchParams] = useSearchParams();
  const blocksParam = searchParams.get("blocks") || "";
  const selected = useMemo(() => new Set(blocksParam.split(",").filter(Boolean)), [blocksParam]);
  const fitPendingRef = useRef(selected.size > 0);
  const setSelected = useCallback(
    (next) => {
      if ([...next].some((id) => !selected.has(id))) fitPendingRef.current = true;
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          if (next.size) params.set("blocks", [...next].join(","));
          else params.delete("blocks");
          return params;
        },
        { replace: true }
      );
    },
    [selected, setSearchParams]
  );

  // ---- panel preferences, remembered per browser
  const [prefs] = useState(readPrefs);
  const [layers, setLayers] = useState(() => ({ ...Object.fromEntries(defs.map((d) => [d.key, d.on])), names: true, ...prefs.layers }));
  const [subStatuses, setSubStatuses] = useState(() => new Set(prefs.subStatuses || SUB_STATUSES));
  const [equipmentForms, setEquipmentForms] = useState(() => new Set(prefs.equipmentForms || EQUIPMENT_FORMS_ON_MAP.map((f) => f.key)));
  const [mediaKinds, setMediaKinds] = useState(() => new Set(prefs.mediaKinds || MEDIA_KINDS.map((k) => k.key)));
  const [legendOpen, setLegendOpen] = useState(prefs.legendOpen ?? true);
  const [legendAll, setLegendAll] = useState(false);
  const [panelOpen, setPanelOpen] = useState(prefs.panelOpen ?? true);
  const [tab, setTab] = useState(selected.size ? "layers" : "blocks");
  useEffect(() => {
    writePrefs({ layers, subStatuses: [...subStatuses], equipmentForms: [...equipmentForms], mediaKinds: [...mediaKinds], legendOpen, panelOpen });
  }, [layers, subStatuses, equipmentForms, mediaKinds, legendOpen, panelOpen]);
  const toggleLayer = (key) => setLayers((l) => ({ ...l, [key]: !l[key] }));
  const filters = useMemo(() => ({ subStatuses, equipmentForms, mediaKinds }), [subStatuses, equipmentForms, mediaKinds]);

  // ---- each picked block's layers, a few requests at a time; kept while the page is open
  const [blockData, setBlockData] = useState({});
  const inFlightRef = useRef(new Set());
  useEffect(() => {
    const waiting = [...selected].filter((id) => !blockData[id] && !inFlightRef.current.has(id));
    for (const id of waiting) {
      if (inFlightRef.current.size >= LOAD_CONCURRENCY) break;
      inFlightRef.current.add(id);
      executionService
        .getMasterMapBlock(id)
        .then((data) => setBlockData((previous) => ({ ...previous, [id]: { status: "ready", data } })))
        .catch((error) => setBlockData((previous) => ({ ...previous, [id]: { status: "error", error: error.message } })))
        .finally(() => inFlightRef.current.delete(id));
    }
  }, [selected, blockData]);
  const loadState = useCallback((id) => blockData[id]?.status || "loading", [blockData]);
  const retryBlock = useCallback(
    (id) =>
      setBlockData((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      }),
    []
  );
  const ready = useMemo(() => [...selected].map((id) => blockData[id]).filter((b) => b?.status === "ready").map((b) => b.data), [selected, blockData]);

  // ---- KML files of the picked blocks, parsed once per file. Loaded even with the KML
  // layer off: sections and subsections take their road from them.
  const [kml, setKml] = useState({});
  // fileId -> Set of the KML layer (folder) ids switched off; files start as their KML says
  const [kmlHidden, setKmlHidden] = useState({});
  useEffect(() => {
    for (const data of ready) {
      for (const file of data.profile.kmlFiles) {
        if (kml[file._id]) continue;
        setKml((previous) => (previous[file._id] ? previous : { ...previous, [file._id]: [] }));
        loadKml(file.url)
          .then((features) => {
            setKml((previous) => ({ ...previous, [file._id]: features }));
            setKmlHidden((previous) => (previous[file._id] ? previous : { ...previous, [file._id]: new Set(initiallyHiddenLayers(features)) }));
          })
          .catch(() => setKml((previous) => ({ ...previous, [file._id]: [] })));
      }
    }
  }, [ready, kml]);
  const kmlOf = useCallback((data) => Object.fromEntries(data.profile.kmlFiles.map((f) => [f._id, kml[f._id] || []])), [kml]);
  // What the map draws and exports: the features of the layers switched on. Roads and
  // bounds keep using every feature.
  const visibleKml = useMemo(
    () => Object.fromEntries(Object.entries(kml).map(([id, features]) => [id, kmlHidden[id]?.size ? features.filter((f) => !inHiddenLayer(f, kmlHidden[id])) : features])),
    [kml, kmlHidden]
  );
  const kmlLayersByFile = useMemo(() => Object.fromEntries(Object.entries(kml).map(([id, features]) => [id, kmlLayers(features)])), [kml]);
  const visibleKmlByBlock = useMemo(
    () => Object.fromEntries(ready.map((data) => [data.profile._id, Object.fromEntries(data.profile.kmlFiles.map((f) => [f._id, visibleKml[f._id] || []]))])),
    [ready, visibleKml]
  );
  const kmlByBlock = useMemo(() => Object.fromEntries(ready.map((data) => [data.profile._id, kmlOf(data)])), [ready, kmlOf]);
  // Each block's sections, subsections and ring links along the road from its KML
  const roadsByBlock = useMemo(() => Object.fromEntries(ready.map((data) => [data.profile._id, roadsOf(data, data.profile.kmlFiles.map((f) => kml[f._id]))])), [ready, kml]);

  // Where each picked block is: everything it draws, else its router / first GP from the list
  const blockBounds = useMemo(() => {
    const out = {};
    for (const id of selected) {
      const data = blockData[id]?.status === "ready" ? blockData[id].data : null;
      const kmlFeatures = data ? Object.values(kmlByBlock[id] || {}).flat() : [];
      out[id] = boundsOf(data ? blockPoints(data, kmlFeatures) : [blockById.get(id)?.center]);
    }
    return out;
  }, [selected, blockData, kmlByBlock, blockById]);

  // ---- map, view and zoom
  const [map, setMap] = useState(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [view, setView] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [copied, setCopied] = useState(false);
  const frameRef = useRef(0);

  const mapOptions = useMemo(
    () =>
      isLoaded
        ? {
            styles: MAP_STYLES,
            streetViewControl: false,
            fullscreenControl: true,
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
              position: window.google.maps.ControlPosition.TOP_LEFT,
              mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain"],
            },
            clickableIcons: false,
          }
        : undefined,
    [isLoaded]
  );

  const fitTo = useCallback(
    (ids) => {
      if (!map) return;
      const all = ids.map((id) => blockBounds[id]).filter(Boolean);
      if (!all.length) return;
      const b = all.reduce((acc, x) => ({ south: Math.min(acc.south, x.south), west: Math.min(acc.west, x.west), north: Math.max(acc.north, x.north), east: Math.max(acc.east, x.east) }));
      if (b.south === b.north && b.west === b.east) {
        map.panTo({ lat: b.south, lng: b.west });
        map.setZoom(14);
        return;
      }
      map.fitBounds(b, 48);
    },
    [map, blockBounds]
  );

  // Fit once the blocks just picked have loaded
  useEffect(() => {
    if (!fitPendingRef.current || !map || selected.size === 0) return;
    const settled = [...selected].every((id) => blockData[id]);
    if (!settled) return;
    fitPendingRef.current = false;
    fitTo([...selected]);
  }, [map, selected, blockData, fitTo]);

  // The view only updates once the map settles, so panning doesn't re-render the layers
  const onIdle = () => {
    if (!map) return;
    setZoom(map.getZoom());
    const b = map.getBounds()?.toJSON();
    if (b) setView(b);
  };

  const onMouseMove = (e) => {
    const point = e.latLng.toJSON();
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setCursor(point));
  };
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const copyCursor = async () => {
    if (!cursor) return;
    try {
      await navigator.clipboard.writeText(`${cursor.lat.toFixed(5)},${cursor.lng.toFixed(5)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  // Which layers draw now: switched on and close enough
  const showKey = JSON.stringify(
    Object.fromEntries([
      ...defs.map((d) => [d.key, Boolean(layers[d.key]) && zoom >= d.minZoom]),
      ["entries", Boolean(layers.subsections) && zoom >= 15],
      ["kmlPoints", Boolean(layers.kml) && zoom >= 13],
    ])
  );
  const show = useMemo(() => JSON.parse(showKey), [showKey]);
  const thick = zoom >= THICK_LINE_ZOOM;
  const names = Boolean(layers.names) && zoom >= NAME_ZOOM;

  // Blocks in (or near) the view draw their layers; the rest draw nothing until panned to
  const inView = useMemo(() => {
    const area = padBounds(view, 0.2);
    return ready.filter((data) => !area || intersects(area, blockBounds[data.profile._id]));
  }, [ready, view, blockBounds]);

  const onSelect = useCallback((feature) => setSelectedFeature(feature), []);
  const zoomTo = useCallback(
    (position) => {
      if (!map) return;
      map.panTo(position);
      map.setZoom(Math.max(map.getZoom() || 0, 18));
    },
    [map]
  );

  // ---- counts for the KPI tiles and the layer panel
  const totals = useMemo(() => {
    const sum = (fn) => ready.reduce((n, data) => n + fn(data), 0);
    return {
      gps: sum((d) => d.profile.gps.length),
      sections: sum((d) => (d.sections || []).length),
      sectionM: sum((d) => (d.sections || []).reduce((n, s) => n + (Number(s.sectionLength) || 0), 0)),
      subsections: sum((d) => (d.subsections || []).length),
      executedM: sum((d) => (d.subsections || []).reduce((n, s) => n + s.entries.reduce((m, e) => m + (Number(e.length) || 0), 0), 0)),
      router: sum((d) => (d.profile.blockRouter?.latitude != null ? 1 : 0)),
      rings: sum((d) => (d.equipment || []).filter((e) => e.form === "gp" && (e.prevNode || e.nextNode)).length),
      kml: sum((d) => d.profile.kmlFiles.length),
      refs: sum((d) => (d.subsections || []).reduce((n, s) => n + (s.start?.refs.length || 0) + (s.end?.refs.length || 0), 0)),
      blockInfra: sum((d) => (d.infra || []).filter((i) => i.level === "BLOCK").length),
      gpInfra: sum((d) => (d.infra || []).filter((i) => i.level === "GP").length),
      equipment: sum((d) => (d.equipment || []).length),
      media: sum((d) => (d.media || []).length),
    };
  }, [ready]);
  const countWhere = (fn) => ready.reduce((n, d) => n + fn(d), 0);
  const statusLabel = (key) => (key === "LEGACY" ? "Older (trenching)" : config?.statuses?.[key]?.label || key);
  const restorationLabel = (key) => config?.restorationStates?.[key]?.label || key;
  const legendLabel = (item) => item.label || (item.status ? statusLabel(item.status) : item.restoration ? `Section · ${restorationLabel(item.restoration)}` : "");

  const exportOptions = { layers, filters, config, roadsByBlock };
  const loadingCount = [...selected].filter((id) => !blockData[id] || blockData[id].status === "loading").length;

  // ---- panels

  // The picked blocks' KML files that have layers (folders), with their layer switches
  const kmlWithLayers = ready.flatMap((data) => data.profile.kmlFiles.filter((f) => kmlLayersByFile[f._id]?.length).map((file) => ({ file, block: data.profile.block })));
  // Sections are drawn only along a KML road, never straight
  const offRoad = countWhere((d) => (d.sections || []).filter((s) => !roadsByBlock[d.profile._id]?.sections.has(String(s._id))).length);
  const layerFilters = {
    sections: (
      <Typography variant="caption" component="div" sx={{ color: offRoad ? "warning.dark" : "text.secondary" }}>
        {offRoad
          ? `${offRoad} ${offRoad === 1 ? "section isn't" : "sections aren't"} drawn: no KML road runs between ${offRoad === 1 ? "its" : "their"} nodes. The block's Map tab says why.`
          : "Every section follows the road in its block's KML."}
      </Typography>
    ),
    kml: kmlWithLayers.length ? (
      <Stack spacing={1.25} sx={{ mt: 0.5 }}>
        {kmlWithLayers.map(({ file, block }) => (
          <Box key={file._id}>
            <Typography variant="caption" component="div" sx={{ fontWeight: 700 }} noWrap title={file.name}>
              {file.name}
            </Typography>
            <Typography variant="caption" component="div" sx={{ color: "text.secondary", mb: 0.25 }}>
              {titleCase(block)}
            </Typography>
            <KmlLayerList
              layers={kmlLayersByFile[file._id]}
              hidden={kmlHidden[file._id] || new Set()}
              onChange={(next) => setKmlHidden((previous) => ({ ...previous, [file._id]: next }))}
              fileName={file.name}
            />
          </Box>
        ))}
      </Stack>
    ) : null,
    subsections: (
      <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap" }}>
        {SUB_STATUSES.filter((key) => key !== "LEGACY" || countWhere((d) => (d.subsections || []).filter((s) => subKey(s) === "LEGACY").length)).map((key) => (
          <FilterChip
            key={key}
            label={statusLabel(key)}
            count={countWhere((d) => (d.subsections || []).filter((s) => subKey(s) === key).length)}
            color={STATUS_COLORS[key]}
            on={subStatuses.has(key)}
            onClick={() => setSubStatuses((s) => toggleIn(s, key))}
          />
        ))}
      </Stack>
    ),
    equipment: (
      <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap" }}>
        {EQUIPMENT_FORMS_ON_MAP.map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            count={countWhere((d) => (d.equipment || []).filter((e) => e.form === f.key).length)}
            color={f.key === "misc" ? EQUIPMENT_COLORS.misc : EQUIPMENT_COLORS.router}
            square
            on={equipmentForms.has(f.key)}
            onClick={() => setEquipmentForms((s) => toggleIn(s, f.key))}
          />
        ))}
      </Stack>
    ),
    media: (
      <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap" }}>
        {MEDIA_KINDS.map((k) => (
          <FilterChip
            key={k.key}
            label={k.label}
            count={countWhere((d) => (d.media || []).filter((m) => m.kind === k.key).length)}
            color={k.color}
            on={mediaKinds.has(k.key)}
            onClick={() => setMediaKinds((s) => toggleIn(s, k.key))}
          />
        ))}
      </Stack>
    ),
  };

  const renderLayersPanel = () => (
    <Box sx={{ flex: 1, overflowY: "auto" }}>
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
        <Switch size="small" checked={Boolean(layers.names)} onChange={() => toggleLayer("names")} slotProps={{ input: { "aria-label": "Show names" } }} />
      </Box>
      {LAYER_GROUPS.map((group) => (
        <React.Fragment key={group}>
          <GroupHeading>{group}</GroupHeading>
          {defs
            .filter((d) => d.group === group)
            .map((def) => (
              <LayerRow key={def.key} def={def} zoom={zoom} count={ready.length ? totals[def.key] : undefined} checked={Boolean(layers[def.key])} onChange={() => toggleLayer(def.key)}>
                {layerFilters[def.key]}
              </LayerRow>
            ))}
        </React.Fragment>
      ))}
      <Typography variant="caption" component="p" sx={{ color: "text.secondary", px: 2, py: 1.5 }}>
        Layers with a zoom badge appear once you zoom in that far. Only blocks in view are drawn.
      </Typography>
    </Box>
  );

  const renderLegend = () => {
    const items = defs.filter((d) => legendAll || (layers[d.key] && zoom >= d.minZoom));
    return (
      <Paper
        elevation={4}
        sx={{ position: "absolute", top: 60, right: 10, width: 250, maxHeight: "calc(100% - 120px)", display: "flex", flexDirection: "column", zIndex: 2 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            Legend
          </Typography>
          <Tooltip title={legendAll ? "Show only what's on the map" : "Show every layer"}>
            <Chip size="small" label={legendAll ? "All" : "On map"} variant="outlined" onClick={() => setLegendAll((v) => !v)} sx={{ mr: 0.5, height: 22 }} />
          </Tooltip>
          <IconButton size="small" onClick={() => setLegendOpen(false)} aria-label="Close legend">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ overflowY: "auto", px: 1.5, py: 1 }}>
          {items.length === 0 && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Nothing on the map at this zoom.
            </Typography>
          )}
          {items.map((def) => (
            <Box key={def.key} sx={{ mb: 1 }}>
              <Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.6, display: "block" }}>
                {def.label}
              </Typography>
              {def.legend.map((item, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 20 }}>
                  <Swatch>
                    <LegendSwatch item={item} />
                  </Swatch>
                  <Typography variant="caption">{legendLabel(item)}</Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };

  const renderStatusBar = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 0.5, sm: 1.5 },
        px: 1,
        minHeight: 36,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <Tooltip title={panelOpen ? "Hide the panel" : "Show the panel"}>
        <IconButton size="small" onClick={() => setPanelOpen((v) => !v)} aria-label={panelOpen ? "Hide the panel" : "Show the panel"} sx={statusBarButtonSx}>
          {panelOpen ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary", minWidth: { sm: 150 } }}>
        {cursor ? `${cursor.lat.toFixed(5)}, ${cursor.lng.toFixed(5)}` : "Move over the map"}
      </Typography>
      <Tooltip title={copied ? "Copied" : "Copy coordinates"}>
        <span>
          <IconButton size="small" onClick={copyCursor} disabled={!cursor} aria-label="Copy coordinates" sx={statusBarButtonSx}>
            <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
      <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
        Zoom: {zoom}
      </Typography>
      {loadingCount > 0 && (
        <Typography variant="caption" sx={{ color: "text.secondary", display: { xs: "none", sm: "block" } }}>
          · Loading {loadingCount} {loadingCount === 1 ? "block" : "blocks"}…
        </Typography>
      )}
      <Box sx={{ flex: 1 }} />
      <Tooltip title="Fit the picked blocks">
        <span>
          <IconButton size="small" onClick={() => fitTo([...selected])} disabled={!selected.size} aria-label="Fit the picked blocks" sx={statusBarButtonSx}>
            <CenterFocusStrongOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Legend
      </Typography>
      <Switch size="small" checked={legendOpen} onChange={() => setLegendOpen((v) => !v)} slotProps={{ input: { "aria-label": "Show legend" } }} />
    </Box>
  );

  const selectedData = selectedFeature ? blockData[selectedFeature.blockId]?.data : null;

  const renderMap = () => (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      options={mapOptions}
      onLoad={setMap}
      onUnmount={() => setMap(null)}
      onIdle={onIdle}
      onMouseMove={onMouseMove}
      onMouseOut={() => setCursor(null)}
      onClick={() => setSelectedFeature(null)}
    >
      {inView.map((data) => (
        <MasterMapBlockLayers
          key={data.profile._id}
          data={data}
          kml={visibleKmlByBlock[data.profile._id]}
          roads={roadsByBlock[data.profile._id]}
          show={show}
          filters={filters}
          thick={thick}
          names={names}
          limit={limit}
          onSelect={onSelect}
        />
      ))}
      {selectedFeature && (
        <InfoWindow position={selectedFeature.position} onCloseClick={() => setSelectedFeature(null)}>
          <MasterMapInfo
            selected={selectedFeature}
            data={selectedData}
            roads={roadsByBlock[selectedFeature.blockId]}
            config={config}
            limit={limit}
            onSelect={setSelectedFeature}
            onZoom={zoomTo}
            onViewMedia={(m) => setViewing({ ...m, latitude: m.lat, longitude: m.lng })}
          />
        </InfoWindow>
      )}
    </GoogleMap>
  );

  return (
    <>
      <GlobalStyles styles={{ ".block-map-name": { textShadow: "0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff", whiteSpace: "nowrap" } }} />
      <PageHeader
        title="Master Map"
        subtitle="Every block's network, routes and field work on one map. Pick blocks to show them."
        actions={
          <>
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={!ready.length} onClick={() => exportMasterMapKml(ready, visibleKml, exportOptions)}>
              Export KML
            </Button>
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={!ready.length} onClick={() => exportMasterMapExcel(ready, visibleKml, exportOptions)}>
              Export Excel
            </Button>
          </>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Blocks on the map" value={selected.size} caption={`of ${blocks.length} blocks`} icon={<ViewModuleOutlinedIcon />} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="GPs" value={totals.gps} caption={`${totals.sections} ${totals.sections === 1 ? "section" : "sections"}`} icon={<AccountTreeOutlinedIcon />} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Section length" value={Math.round(totals.sectionM / 100) / 10} suffix="km" caption="Node to node, from the sections" icon={<StraightenOutlinedIcon />} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Executed length" value={Math.round(totals.executedM / 100) / 10} suffix="km" caption={`${totals.subsections} ${totals.subsections === 1 ? "subsection" : "subsections"}`} icon={<TimelineOutlinedIcon />} />
        </Grid>
      </Grid>

      {listError && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={reloadList}>Retry</Button>}>
          {listError}
        </Alert>
      )}

      <Card sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, height: { md: "calc(100vh - 150px)" }, minHeight: { md: 600 }, overflow: "hidden" }}>
        {panelOpen && (
          <Box
            sx={{
              width: { xs: "100%", md: PANEL_WIDTH },
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
              <Tab value="blocks" label={`Blocks${selected.size ? ` (${selected.size})` : ""}`} />
              <Tab value="layers" label="Layers" />
            </Tabs>
            {tab === "blocks" ? (
              list ? (
                <MasterMapBlockTree blocks={blocks} selected={selected} onChange={setSelected} loadState={loadState} onRetry={retryBlock} onFocusBlock={(id) => fitTo([id])} />
              ) : (
                <Box sx={{ p: 2 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} height={32} />
                  ))}
                </Box>
              )
            ) : (
              renderLayersPanel()
            )}
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
            {isLoaded && selected.size === 0 && (
              <Paper elevation={3} sx={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", p: 2.5, maxWidth: 320, textAlign: "center", zIndex: 1 }}>
                <Typography variant="subtitle2">No blocks on the map</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, mb: 1.5 }}>
                  Pick a state, district or blocks to see their network and work.
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setPanelOpen(true);
                    setTab("blocks");
                  }}
                >
                  Pick blocks
                </Button>
              </Paper>
            )}
          </Box>
          {renderStatusBar()}
        </Box>
      </Card>

      {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}
    </>
  );
};

export default MasterMapPage;
