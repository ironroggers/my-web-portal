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

// Router equipment (block and GP sheets) and misc equipment (rack, FDMS, FTB, CCU, SPV)
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

// Sections by restoration state
export const RESTORATION_COLORS = {
  LOCKED: "#94a3b8",
  READY: "#2563eb",
  PENDING_APPROVAL: "#d97706",
  APPROVED: "#15803d",
  REJECTED: "#b91c1c",
};

export const REF_COLOR = "#475569";

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
