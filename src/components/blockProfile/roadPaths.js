// Sections and subsections run along roads, not in a straight line. The road comes from
// the block's KML files: a section follows the KML line (or chain of lines) that passes
// both of its end nodes, and a subsection follows that road between its own from and to.
// Without a matching line the maps fall back to a straight, dashed line.

// How far a node may be from the KML line and still be on it
export const ROAD_TOLERANCE_M = 200;
// Line ends this close together are joined into one road
const JOIN_M = 15;

// Metres on a flat local plane: plenty accurate over a block
const toXY = (p, lat0) => ({ x: p.lng * 111320 * Math.cos((lat0 * Math.PI) / 180), y: p.lat * 110540 });
const distM = (a, b) => {
  const lat0 = (a.lat + b.lat) / 2;
  const pa = toXY(a, lat0);
  const pb = toXY(b, lat0);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
};

/** The nearest point of a path to p: { segment, t, point, distM, run (metres from the start) } */
export const projectOnPath = (path, p) => {
  if (!path || path.length < 2 || !p) return null;
  const lat0 = p.lat;
  const q = toXY(p, lat0);
  let best = null;
  let run = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = toXY(path[i - 1], lat0);
    const b = toXY(path[i], lat0);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.min(1, Math.max(0, ((q.x - a.x) * dx + (q.y - a.y) * dy) / len2)) : 0;
    const d = Math.hypot(a.x + t * dx - q.x, a.y + t * dy - q.y);
    const segment = Math.sqrt(len2);
    if (!best || d < best.distM) {
      const from = path[i - 1];
      const to = path[i];
      best = { segment: i - 1, t, distM: d, run: run + t * segment, point: { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t } };
    }
    run += segment;
  }
  return best;
};

/** The part of a path between two projections (from projectOnPath), in the order a → b */
export const slicePath = (path, a, b) => {
  const forward = a.run <= b.run;
  const [s, e] = forward ? [a, b] : [b, a];
  const out = [s.point, ...path.slice(s.segment + 1, e.segment + 1), e.point];
  return forward ? out : out.reverse();
};

export const pathLength = (path) => path.reduce((sum, p, i) => (i ? sum + distM(path[i - 1], p) : 0), 0);

/**
 * The KML lines, plus longer roads made by joining lines whose ends meet, so a route
 * split into pieces still matches. Lines only join where exactly two ends meet: at a
 * junction (a GP or the block router, where several routes start) they stay apart.
 */
export const chainLines = (lines) => {
  const originals = lines.filter((l) => l.path?.length > 1).map((l) => ({ name: l.name, path: l.path }));
  const ends = originals.flatMap((l) => [l.path[0], l.path[l.path.length - 1]]);
  const endsNear = (p) => ends.filter((q) => distM(p, q) <= JOIN_M).length;
  const chains = originals.map((l) => ({ ...l, path: [...l.path] }));
  let joined = true;
  while (joined) {
    joined = false;
    for (let i = 0; i < chains.length && !joined; i += 1) {
      for (let j = 0; j < chains.length && !joined; j += 1) {
        if (i === j) continue;
        const a = chains[i].path;
        const b = chains[j].path;
        const tail = a[a.length - 1];
        if (endsNear(tail) !== 2) continue;
        let merged = null;
        if (distM(tail, b[0]) <= JOIN_M) merged = [...a, ...b.slice(1)];
        else if (distM(tail, b[b.length - 1]) <= JOIN_M) merged = [...a, ...[...b].reverse().slice(1)];
        if (merged) {
          chains[i] = { name: chains[i].name, path: merged, joined: true };
          chains.splice(j, 1);
          joined = true;
        }
      }
    }
  }
  return [...originals, ...chains.filter((c) => c.joined)];
};

/** KML features (from parseKMLContent) -> [{ name, path }] of their lines */
export const kmlLines = (features) => (features || []).filter((f) => f.type === "polyline").map((f) => ({ name: f.title || f.properties?.name || "", path: f.path }));

// [1, 2, 300] < [1, 3, 0]: compares the first value that differs
const lessThan = (x, y) => {
  const i = x.findIndex((v, k) => v !== y[k]);
  return i !== -1 && x[i] < y[i];
};

/**
 * The road a section follows: of the KML lines passing within ROAD_TOLERANCE_M of both
 * ends, the one named like the section, else the closest. Returns the path from → to, or null.
 */
export const matchRoad = (from, to, roads, name) => {
  if (!from || !to) return null;
  let best = null;
  for (const road of roads) {
    const a = projectOnPath(road.path, from);
    const b = projectOnPath(road.path, to);
    if (!a || !b || a.distM > ROAD_TOLERANCE_M || b.distM > ROAD_TOLERANCE_M || Math.abs(a.run - b.run) < 1) continue;
    // A line named like the section wins; then the closest (to the nearest 10 m); then the
    // shortest stretch between the two ends, so a road never loops round through other nodes
    const named = Boolean(name) && road.name.trim().toLowerCase() === name.trim().toLowerCase();
    const score = [named ? 0 : 1, Math.round(Math.max(a.distM, b.distM) / 10), Math.abs(a.run - b.run)];
    if (!best || lessThan(score, best.score)) best = { score, a, b, road };
  }
  return best ? slicePath(best.road.path, best.a, best.b) : null;
};

/**
 * Road paths for a block's sections and subsections.
 * Returns { sections: Map(sectionId -> path), subsections: Map(subsectionId -> path) };
 * anything without a road is missing from the maps and is drawn straight.
 */
export const buildRoadPaths = (sections, subsections, kmlFeatures) => {
  const roads = chainLines(kmlLines(kmlFeatures));
  const sectionPaths = new Map();
  const subPaths = new Map();
  if (!roads.length) return { sections: sectionPaths, subsections: subPaths };
  for (const s of sections || []) {
    const path = matchRoad(s.from, s.to, roads, s.name);
    if (path) sectionPaths.set(String(s._id), path);
  }
  for (const sub of subsections || []) {
    const road = sectionPaths.get(String(sub.sectionId));
    if (!road || !sub.from || !sub.to) continue;
    const a = projectOnPath(road, sub.from);
    const b = projectOnPath(road, sub.to);
    if (a && b && a.distM <= ROAD_TOLERANCE_M && b.distM <= ROAD_TOLERANCE_M && Math.abs(a.run - b.run) >= 1) subPaths.set(String(sub._id), slicePath(road, a, b));
  }
  return { sections: sectionPaths, subsections: subPaths };
};

/** The point halfway along a path, for info windows */
export const midpointOf = (path) => {
  const total = pathLength(path);
  let run = 0;
  for (let i = 1; i < path.length; i += 1) {
    const d = distM(path[i - 1], path[i]);
    if (run + d >= total / 2) {
      const t = d ? (total / 2 - run) / d : 0;
      return { lat: path[i - 1].lat + (path[i].lat - path[i - 1].lat) * t, lng: path[i - 1].lng + (path[i].lng - path[i - 1].lng) * t };
    }
    run += d;
  }
  return path[0];
};
