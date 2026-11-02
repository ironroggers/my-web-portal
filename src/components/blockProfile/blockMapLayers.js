import { fmtDistance } from "../../utils/executionFormat";

// Colours, shapes and grouping for the block map's layers (BlockMapPanel). Every kind of
// point has its own colour and shape so nothing on the map needs a click to tell apart.

export const GP_COLOR = "#7c3aed";
// The block router is the block's head node
export const ROUTER_COLOR = "#1e3a8a";

// GPs are diamonds and the block router a square
export const DIAMOND_PATH = "M 0 -9 L 9 0 L 0 9 L -9 0 z";
export const SQUARE_PATH = "M -8 -8 L 8 -8 L 8 8 L -8 8 z";
// Map pin with its tip on the point, for infra captures
export const PIN_PATH = "M 0 0 C -2 -6 -9 -9 -9 -16 A 9 9 0 1 1 9 -16 C 9 -9 2 -6 0 0 z";
// Small square for videos (photos are circles)
export const MEDIA_SQUARE_PATH = "M -6 -6 L 6 -6 L 6 6 L -6 6 z";
// Rounded badge with a short code inside, for equipment sheets
export const BADGE_PATH = "M -10 -8 L 10 -8 Q 13 -8 13 -5 L 13 5 Q 13 8 10 8 L -10 8 Q -13 8 -13 5 L -13 -5 Q -13 -8 -10 -8 z";

// Router equipment (block and GP sheets) and misc equipment (rack, FDMS, FTB, CCU, SPV, earthing, electric meter)
export const EQUIPMENT_COLORS = { router: "#b45309", misc: "#4d7c0f" };
// Previous / next node links on the ring, from the GP equipment sheets
export const RING_COLOR = "#b45309";

export const INFRA_COLORS = { BLOCK: "#0f766e", GP: "#db2777" };

// Subsections by execution status; older subsections without a type of work in brown
export const STATUS_COLORS = {
  NOT_STARTED: "#64748b",
  IN_PROGRESS: "#2563eb",
  PENDING_APPROVAL: "#d97706",
  APPROVED: "#15803d",
  REJECTED: "#b91c1c",
  LEGACY: "#92400e",
};

// Subsections on the block map by type of work. Other work (chamber, blowing, … from before
// the section stages) and older subsections without a type take neutral shades.
export const TYPE_COLORS = {
  HDD: "#c026d3",
  OT: "#a16207",
  CLAMP: "#0891b2",
  OTHER: "#64748b",
  LEGACY: "#78716c",
};
export const DUCTING_TYPES = ["HDD", "OT", "CLAMP"];
export const subTypeKey = (s) => (s.legacy ? "LEGACY" : DUCTING_TYPES.includes(s.typeOfWork) ? s.typeOfWork : "OTHER");

// Sections by restoration state
export const RESTORATION_COLORS = {
  LOCKED: "#94a3b8",
  READY: "#2563eb",
  PENDING_APPROVAL: "#d97706",
  APPROVED: "#15803d",
  REJECTED: "#b91c1c",
};

export const REF_COLOR = "#475569";

// ---- subsections: back-to-back subsections alternate a full and a light shade of their status
// colour and have a cross tick at each end, so two with the same status still read as two

// A colour mixed towards white
export const lighten = (hex, amount = 0.45) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, "0")).join("")}`;
};

// Odd-numbered subsections in each section (in route order) take the light shade
export const lightSubsections = (subsections) => {
  const bySection = new Map();
  const light = new Set();
  for (const s of subsections) {
    const n = bySection.get(s.sectionId) || 0;
    if (n % 2) light.add(String(s._id));
    bySection.set(s.sectionId, n + 1);
  }
  return light;
};

// A dark tick across the line at both ends, on a white halo; a symbol on a line turns with it
const TICK = "M -1 0 L 1 0";
export const boundaryTicks = () =>
  ["0", "100%"].flatMap((offset) => [
    { icon: { path: TICK, strokeColor: "#ffffff", strokeOpacity: 1, strokeWeight: 6, scale: 8 }, offset },
    { icon: { path: TICK, strokeColor: "#111827", strokeOpacity: 1, strokeWeight: 3, scale: 7 }, offset },
  ]);

// "SS-3 · 420 m"; labels show from this zoom in
export const SUB_LABEL_ZOOM = 14;
export const subsectionLabel = (s) => {
  const length = s.subSectionLength ?? s.calculatedLength;
  return [s.name || "Subsection", length != null ? fmtDistance(length) : ""].filter(Boolean).join(" · ");
};

/** The subsection's executed path (start, entries, end), else its planned road line */
export const subsectionPath = (s, roads) => {
  const executed = [s.start, ...(s.entries || []), s.end].filter(Boolean).map((p) => ({ lat: p.lat, lng: p.lng }));
  return executed.length > 1 ? executed : roads?.subsections.get(String(s._id)) || null;
};

// ---- section stages, coloured by the record's status like subsections

export const HEXAGON_PATH = "M -11 0 L -6 -9 L 6 -9 L 11 0 L 6 9 L -6 9 z";
export const TRIANGLE_PATH = "M 0 -8 L 8 6 L -8 6 z";
// A route marker post
export const POST_PATH = "M -3.5 -10 L 3.5 -10 L 3.5 9 L -3.5 9 z";

// line: tube (ducting), arrows (blowing); point shapes: hexagon (chamber, with its type),
// triangle (coupling), post (route marker)
export const STAGE_LAYERS = [
  { stage: "DUCTING", key: "ducting", label: "Ducting", shape: "tube", note: "Duct run: hollow tube around its subsection" },
  { stage: "COUPLING", key: "coupling", label: "Coupling", shape: "triangle", path: TRIANGLE_PATH, note: "Coupling at the pit where two ducts meet" },
  { stage: "CHAMBER", key: "chamber", label: "Chamber", shape: "hexagon", path: HEXAGON_PATH, note: "Chamber, with its type (MH, HH, LC)" },
  { stage: "BLOWING", key: "blowing", label: "Blowing", shape: "arrows", note: "Cable blown from one chamber to the next" },
  { stage: "ROUTE_MARKER", key: "routeMarker", label: "Route marker", shape: "post", path: POST_PATH, note: "Route marker" },
];
export const STAGE_LAYER = Object.fromEntries(STAGE_LAYERS.map((l) => [l.stage, l]));
export const STAGE_STATUSES = ["IN_PROGRESS", "PENDING_APPROVAL", "APPROVED", "REJECTED"];

// A duct run is a hollow tube around its subsection's line: casing and core widths in pixels
export const DUCT_TUBE = { outer: 13, inner: 7 };
// Arrows from the From chamber to the To chamber
export const arrowIcons = (color) => [
  { icon: { path: window.google.maps.SymbolPath.FORWARD_OPEN_ARROW, strokeColor: color, strokeOpacity: 1, strokeWeight: 2.5, scale: 2.5 }, offset: "20px", repeat: "70px" },
];

// Geotagged attachments by where they were captured
export const MEDIA_KINDS = [
  { key: "BLOCK_INFRA", label: "Block infra", color: "#0f766e" },
  { key: "GP_INFRA", label: "GP infra", color: "#db2777" },
  { key: "SITE", label: "Site condition", color: "#0891b2" },
  { key: "START", label: "Start", color: "#65a30d" },
  { key: "ENTRY", label: "Entries", color: "#2563eb" },
  { key: "END", label: "End", color: "#c2410c" },
  { key: "RESTORATION", label: "Restoration", color: "#a21caf" },
  { key: "EQUIPMENT", label: "Equipment", color: "#b45309" },
];
export const MEDIA_KIND = Object.fromEntries(MEDIA_KINDS.map((k) => [k.key, k]));

// Looked at twice by an approver: GPS kept above the limit, gallery upload, typed location
export const isFlagged = (m, limit) =>
  Boolean(m.accuracyAboveLimit || m.source === "UPLOAD" || m.locationSource === "MANUAL" || (m.locationSource === "GPS" && Number(m.accuracy) > limit));

// Attachments taken within about a metre of each other share one marker
export const groupMedia = (media) => {
  const groups = new Map();
  for (const m of media) {
    const key = `${m.lat.toFixed(5)},${m.lng.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, { key, position: { lat: m.lat, lng: m.lng }, items: [] });
    groups.get(key).items.push(m);
  }
  return [...groups.values()];
};

// labelBelow: put the marker's label (a name) under the shape instead of on it
export const symbol = (path, color, { scale = 1, stroke = "#ffffff", strokeWeight = 2, anchor, labelBelow } = {}) => ({
  path,
  scale,
  fillColor: color,
  fillOpacity: 1,
  strokeColor: stroke,
  strokeWeight,
  ...(anchor ? { anchor } : {}),
  ...(path === PIN_PATH ? { labelOrigin: new window.google.maps.Point(0, -16) } : {}),
  ...(labelBelow ? { labelOrigin: new window.google.maps.Point(0, labelBelow) } : {}),
});

export const circleSymbol = (color, scale, options = {}) => symbol(window.google.maps.SymbolPath.CIRCLE, color, { scale, ...options });
