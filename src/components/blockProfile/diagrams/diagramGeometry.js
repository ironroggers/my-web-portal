import { titleCase } from "../../execution/execConstants";

// Geometry for the block diagrams: chainage along a section (L14) and the layered
// layout of the block topology. Points are { lat, lng }.

const M_PER_DEG_LAT = 110540;
const mPerDegLng = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

// Metres east / north of `origin`
const toXY = (p, origin) => ({ x: (p.lng - origin.lng) * mPerDegLng(origin.lat), y: (p.lat - origin.lat) * M_PER_DEG_LAT });

export const distanceM = (a, b) => {
  const d = toXY(b, a);
  return Math.hypot(d.x, d.y);
};

/**
 * Where `p` falls along the straight line a → b: t (0–1, clamped) and how far off the
 * line it is in metres.
 */
export const projectOnto = (p, a, b) => {
  const B = toXY(b, a);
  const P = toXY(p, a);
  const len2 = B.x * B.x + B.y * B.y;
  if (!len2) return { t: 0, offsetM: Math.hypot(P.x, P.y) };
  const t = Math.min(1, Math.max(0, (P.x * B.x + P.y * B.y) / len2));
  return { t, offsetM: Math.abs(P.x * B.y - P.y * B.x) / Math.sqrt(len2) };
};

/**
 * The section's chainage model: length in metres (the planned section length, else the
 * straight-line distance) and chainageOf(point). Without both end points, subsections
 * are laid end to end in their order instead (approximate: flagged on the diagram).
 */
export const sectionModel = (section, subsections) => {
  const straight = section.from && section.to ? distanceM(section.from, section.to) : 0;
  const ducting = subsections.filter((s) => s.subSectionLength > 0);
  const laidLength = ducting.reduce((sum, s) => sum + (s.subSectionLength || 0), 0);
  const length = section.sectionLength > 0 ? section.sectionLength : straight || laidLength || 100;
  const geo = Boolean(section.from && section.to && straight > 0);
  const chainageOf = (p) => (geo && p ? projectOnto(p, section.from, section.to).t * length : null);
  return { length, geo, chainageOf };
};

/**
 * Spans [{ sub, start, end, approx }] for the section's subsections in chainage order.
 * A subsection without usable From/To follows the previous one (approx: true).
 */
export const subsectionSpans = (model, subsections) => {
  let cursor = 0;
  return [...subsections]
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    .map((sub) => {
      const a = model.chainageOf(sub.from);
      const b = model.chainageOf(sub.to);
      if (a !== null && b !== null) {
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        cursor = Math.max(cursor, end);
        return { sub, start, end, approx: false };
      }
      const start = cursor;
      const end = Math.min(model.length, start + (sub.subSectionLength || 0));
      cursor = end;
      return { sub, start, end, approx: true };
    })
    .sort((x, y) => x.start - y.start || x.end - y.end);
};

// Greedy rows so overlapping spans don't sit on top of each other
export const stackRows = (spans, minGap = 0) => {
  const rowEnds = [];
  return spans.map((span) => {
    let row = rowEnds.findIndex((end) => end + minGap <= span.start);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(span.end);
    } else rowEnds[row] = span.end;
    return { ...span, row };
  });
};

// A round step for chainage ticks: 1, 2, 5 × 10^n metres, about `count` ticks
export const tickStep = (length, count = 8) => {
  const raw = length / count;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) || pow * 10;
};

// "1+250" style chainage (km+m), as on route diagrams
export const fmtChainage = (m) => {
  const v = Math.max(0, Math.round(m));
  return `${Math.floor(v / 1000)}+${String(v % 1000).padStart(3, "0")}`;
};

// ---- topology

export const nodeTitle = (node) => titleCase(node?.name) || node?.code || "Node";

export const nodeKey = (node) => (node ? `${node.type}:${node.code}` : "");

/**
 * Layered layout of the block network from the block router: each column is one hop further.
 * nodes: [{ key, type, code, name, … }], sections with fromNode / toNode.
 * Returns { columns: [[key]], unlinked: [key] }.
 */
export const layerNodes = (nodes, sections, rootKey) => {
  const adj = new Map(nodes.map((n) => [n.key, new Set()]));
  for (const s of sections) {
    const a = nodeKey(s.fromNode);
    const b = nodeKey(s.toNode);
    if (adj.has(a) && adj.has(b) && a !== b) {
      adj.get(a).add(b);
      adj.get(b).add(a);
    }
  }
  const level = new Map();
  const roots = adj.has(rootKey) ? [rootKey] : [];
  // Start from the block router; then any other connected part from its first node
  for (const n of nodes) if (!roots.includes(n.key) && adj.get(n.key).size) roots.push(n.key);
  for (const root of roots) {
    if (level.has(root)) continue;
    const base = level.size ? Math.max(...level.values()) + 1 : 0;
    level.set(root, base);
    const queue = [root];
    while (queue.length) {
      const cur = queue.shift();
      for (const next of adj.get(cur)) {
        if (!level.has(next)) {
          level.set(next, level.get(cur) + 1);
          queue.push(next);
        }
      }
    }
  }
  const columns = [];
  for (const n of nodes) {
    if (!level.has(n.key)) continue;
    const l = level.get(n.key);
    (columns[l] ||= []).push(n.key);
  }
  return { columns: columns.filter(Boolean), unlinked: nodes.filter((n) => !level.has(n.key)).map((n) => n.key) };
};
