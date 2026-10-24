// Layers, zoom rules and pure helpers for the master map (MasterMapPage). Colours and
// shapes come from the block map (blockMapLayers.js) so a block looks the same on both.
import {
  EQUIPMENT_COLORS,
  GP_COLOR,
  INFRA_COLORS,
  MEDIA_KINDS,
  REF_COLOR,
  RESTORATION_COLORS,
  RING_COLOR,
  ROUTER_COLOR,
  STATUS_COLORS,
} from "../blockProfile/blockMapLayers";

// Blocks drawn at once. Each picked block loads its own layers, so this keeps the map fast.
export const MAX_BLOCKS = 50;
// Requests in flight while picked blocks load
export const LOAD_CONCURRENCY = 4;

// Names show next to points from this zoom in; further out they'd overlap
export const NAME_ZOOM = 12;
// Below this, lines are drawn thin so a district reads as a network, not a smear
export const THICK_LINE_ZOOM = 11;

export const KML_COLORS = ["#f97316", "#ca8a04", "#e11d48", "#0e7490", "#65a30d", "#78350f"];
export const kmlColor = (index) => KML_COLORS[index % KML_COLORS.length];

export const SUB_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "PENDING_APPROVAL", "APPROVED", "REJECTED", "LEGACY"];
export const subKey = (s) => (s.legacy ? "LEGACY" : s.executionStatus);
export const EQUIPMENT_FORMS_ON_MAP = [
  { key: "block", label: "Block router" },
  { key: "gp", label: "GP router" },
  { key: "misc", label: "Misc" },
];
export const EQUIPMENT_TITLES = { block: "Block equipment", gp: "GP equipment", misc: "Misc equipment" };

/**
 * Every layer: where it sits in the panel, the zoom it appears from, whether it starts on
 * and its legend. The panel, the legend card and the map all read this list.
 * Legend shapes: dot, square, diamond, pin, line (dashed / thick), badge (text).
 */
export const layerDefs = () => [
  {
    key: "router",
    group: "Network",
    label: "Block router",
    minZoom: 0,
    on: true,
    legend: [{ shape: "square", color: ROUTER_COLOR, label: "Block router (head node)" }],
  },
  {
    key: "gps",
    group: "Network",
    label: "Gram Panchayats",
    minZoom: 10,
    on: true,
    legend: [{ shape: "diamond", color: GP_COLOR, label: "Gram Panchayat" }],
  },
  {
    key: "rings",
    group: "Network",
    label: "Ring links",
    minZoom: 10,
    on: true,
    legend: [{ shape: "line", color: RING_COLOR, dashed: true, label: "Ring link, previous → next node" }],
  },
  {
    key: "kml",
    group: "Routes",
    label: "KML routes",
    minZoom: 0,
    on: true,
    legend: [{ shape: "line", color: KML_COLORS[0], label: "KML route (one colour per file)" }],
  },
  {
    key: "sections",
    group: "Routes",
    label: "Sections",
    minZoom: 0,
    on: true,
    legend: [
      ...Object.entries(RESTORATION_COLORS).map(([key, color]) => ({ shape: "line", color, thick: true, restoration: key })),
      { shape: "line", color: RESTORATION_COLORS.LOCKED, dashed: true, label: "No road in the KML: drawn straight" },
    ],
  },
  {
    key: "subsections",
    group: "Routes",
    label: "Subsections",
    minZoom: 13,
    on: true,
    legend: [
      ...SUB_STATUSES.map((key) => ({ shape: "line", color: STATUS_COLORS[key], status: key })),
      { shape: "line", color: "#475569", dashed: true, label: "Planned line, along the road" },
      { shape: "line", color: "#475569", label: "Executed path" },
      { shape: "dot", color: "#15803d", label: "A · start pit / point" },
      { shape: "dot", color: "#b91c1c", label: "B · end pit / point" },
    ],
  },
  {
    key: "refs",
    group: "Routes",
    label: "Reference points",
    minZoom: 15,
    on: false,
    legend: [{ shape: "dot", color: REF_COLOR, size: 9, label: "Reference point" }],
  },
  {
    key: "blockInfra",
    group: "Infra",
    label: "Block infra capture",
    minZoom: 13,
    on: true,
    legend: [{ shape: "pin", color: INFRA_COLORS.BLOCK, label: "Block infra capture" }],
  },
  {
    key: "gpInfra",
    group: "Infra",
    label: "GP infra capture",
    minZoom: 13,
    on: true,
    legend: [{ shape: "pin", color: INFRA_COLORS.GP, label: "GP infra capture" }],
  },
  {
    key: "equipment",
    group: "Infra",
    label: "Equipment",
    minZoom: 13,
    on: true,
    legend: [
      { shape: "badge", color: EQUIPMENT_COLORS.router, text: "R", label: "Router (block or GP sheet)" },
      { shape: "badge", color: EQUIPMENT_COLORS.misc, text: "FD", label: "Misc: RA rack, FD FDMS, FT FTB, CC CCU, SP SPV" },
    ],
  },
  {
    key: "media",
    group: "Attachments",
    label: "Geotagged photos and videos",
    minZoom: 15,
    on: false,
    legend: MEDIA_KINDS.map((k) => ({ shape: "dot", color: k.color, label: k.label })),
  },
];

export const LAYER_GROUPS = ["Network", "Routes", "Infra", "Attachments"];

// ---- block tree (State → District → Block)

const groupBy = (items, key) => {
  const groups = new Map();
  for (const item of items) {
    const value = item[key] || `No ${key}`;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(item);
  }
  return groups;
};

/** [{ id, name, districts: [{ id, name, blocks }] }], filtered by a search over all three names */
export const buildTree = (blocks, query = "") => {
  const q = query.trim().toLowerCase();
  const matches = (b) => !q || [b.state, b.district, b.block, b.blockCode].some((v) => String(v || "").toLowerCase().includes(q));
  return [...groupBy(blocks.filter(matches), "state")].map(([state, inState]) => ({
    id: `s:${state}`,
    name: state,
    districts: [...groupBy(inState, "district")].map(([district, inDistrict]) => ({
      id: `d:${state}/${district}`,
      name: district,
      blocks: inDistrict,
    })),
  }));
};

/** "all" | "some" | "none" of these blocks picked */
export const pickState = (blocks, selected) => {
  const n = blocks.filter((b) => selected.has(b._id)).length;
  return n === 0 ? "none" : n === blocks.length ? "all" : "some";
};

/** Picks or unpicks a group of blocks; picking stops at MAX_BLOCKS. Returns { next, capped }. */
export const togglePick = (selected, blocks) => {
  const next = new Set(selected);
  if (pickState(blocks, selected) === "all") {
    blocks.forEach((b) => next.delete(b._id));
    return { next, capped: false };
  }
  let capped = false;
  for (const b of blocks) {
    if (next.has(b._id)) continue;
    if (next.size >= MAX_BLOCKS) {
      capped = true;
      break;
    }
    next.add(b._id);
  }
  return { next, capped };
};

// ---- bounds, as plain { south, west, north, east } so they compare without the Maps API

export const boundsOf = (points) => {
  let b = null;
  for (const p of points) {
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    if (!b) b = { south: p.lat, north: p.lat, west: p.lng, east: p.lng };
    else {
      b.south = Math.min(b.south, p.lat);
      b.north = Math.max(b.north, p.lat);
      b.west = Math.min(b.west, p.lng);
      b.east = Math.max(b.east, p.lng);
    }
  }
  return b;
};

export const padBounds = (b, ratio = 0.2) => {
  if (!b) return null;
  const dLat = (b.north - b.south) * ratio;
  const dLng = (b.east - b.west) * ratio;
  return { south: b.south - dLat, north: b.north + dLat, west: b.west - dLng, east: b.east + dLng };
};

export const intersects = (a, b) => Boolean(a && b && a.south <= b.north && a.north >= b.south && a.west <= b.east && a.east >= b.west);

export const toPoint = (latitude, longitude) =>
  latitude != null && longitude != null && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    ? { lat: Number(latitude), lng: Number(longitude) }
    : null;

export const featurePoints = (feature) => (feature.type === "marker" ? [feature.position] : feature.path || (feature.paths || []).flat());

/** Every point a block draws, for its bounds */
export const blockPoints = (data, kmlFeatures = []) => {
  if (!data) return [];
  const { profile } = data;
  return [
    toPoint(profile.blockRouter?.latitude, profile.blockRouter?.longitude),
    ...(profile.gps || []).map((gp) => toPoint(gp.latitude, gp.longitude)),
    ...(data.infra || []),
    ...(data.equipment || []),
    ...(data.sections || []).flatMap((s) => [s.from, s.to]),
    ...(data.subsections || []).flatMap((s) => [s.from, s.to, s.start, s.end]),
    ...kmlFeatures.flatMap(featurePoints),
  ].filter(Boolean);
};

/** Metres along a path */
export const pathLengthM = (path) => {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const k = Math.PI / 180;
    const x = Math.sin(((b.lat - a.lat) * k) / 2) ** 2 + Math.cos(a.lat * k) * Math.cos(b.lat * k) * Math.sin(((b.lng - a.lng) * k) / 2) ** 2;
    total += 2 * 6371000 * Math.asin(Math.sqrt(x));
  }
  return total;
};

// ---- view state in the URL (?blocks=…), panel preferences in localStorage

const PREFS_KEY = "portal.masterMap.prefs";

export const readPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
  } catch {
    return {};
  }
};

export const writePrefs = (prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Remembering the panel is best-effort
  }
};
