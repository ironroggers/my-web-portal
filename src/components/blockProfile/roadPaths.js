// Sections, subsections and ring links run along roads, never in a straight line. The road
// comes from the block's KML (the ring BR → GP1 → … → GPn → BR): every KML line goes into
// one road network, lines that meet are joined, each node snaps to the nearest road and a
// section is the shortest way along that network between its two nodes. What the KML
// can't route stays off the map, with the reason in `problems`.

// How far a node may be from the KML road and still be on it
export const ROAD_TOLERANCE_M = 200;
// A line that stops this close to another joins it (a route split into pieces, a branch)
const JOIN_M = 25;
// Points closer than this (in degrees, about 1 m) are one point of the network
const MERGE_DEG = 1e-5;
// A route this many times longer than the straight distance went the long way round the
// ring, past a gap in the KML, so it isn't the section's road
const MAX_DETOUR = 5;
// A section's road that comes within this of where another node meets the road goes through it
const PASS_M = 30;

// Metres on a flat local plane: plenty accurate over a block
const toXY = (p, lat0) => ({ x: p.lng * 111320 * Math.cos((lat0 * Math.PI) / 180), y: p.lat * 110540 });
const distM = (a, b) => {
  const lat0 = (a.lat + b.lat) / 2;
  const pa = toXY(a, lat0);
  const pb = toXY(b, lat0);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
};
const isPoint = (p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng);

/** The nearest point of segment a–b to p: { t, distM, point } */
const projectOnSegment = (p, a, b) => {
  const q = toXY(p, p.lat);
  const pa = toXY(a, p.lat);
  const pb = toXY(b, p.lat);
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.min(1, Math.max(0, ((q.x - pa.x) * dx + (q.y - pa.y) * dy) / len2)) : 0;
  return { t, distM: Math.hypot(pa.x + t * dx - q.x, pa.y + t * dy - q.y), point: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t } };
};

/** The nearest point of a path to p: { segment, t, point, distM, run (metres from the start) } */
export const projectOnPath = (path, p) => {
  if (!path || path.length < 2 || !p) return null;
  let best = null;
  let run = 0;
  for (let i = 1; i < path.length; i += 1) {
    const s = projectOnSegment(p, path[i - 1], path[i]);
    const segment = distM(path[i - 1], path[i]);
    if (!best || s.distM < best.distM) best = { segment: i - 1, t: s.t, distM: s.distM, run: run + s.t * segment, point: s.point };
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

/** KML features (from parseKMLContent) -> [{ name, path }] of their lines */
export const kmlLines = (features) => (features || []).filter((f) => f.type === "polyline").map((f) => ({ name: f.title || f.properties?.name || "", path: f.path }));

// Smallest-first queue of [cost, node] for the shortest-route search
class Heap {
  constructor() {
    this.items = [];
  }
  get size() {
    return this.items.length;
  }
  push(item) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent][0] <= a[i][0]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * The road network of a block's KML features: { nodes, adj, segments }. Lines are joined
 * where they share a point, and where one stops within JOIN_M of another line (or of
 * itself further along, as a ring whose two ends don't quite meet at the block router).
 */
export const buildRoadNetwork = (features) => {
  const nodes = [];
  const adj = [];
  // [a, b, line, run at a] for every stretch between two points of a line
  const segments = [];
  const ids = new Map();
  const newNode = (p) => {
    nodes.push({ lat: p.lat, lng: p.lng });
    adj.push([]);
    return nodes.length - 1;
  };
  const nodeAt = (p) => {
    const key = `${Math.round(p.lat / MERGE_DEG)},${Math.round(p.lng / MERGE_DEG)}`;
    if (!ids.has(key)) ids.set(key, newNode(p));
    return ids.get(key);
  };
  const link = (a, b) => {
    if (a === b) return;
    const w = distM(nodes[a], nodes[b]);
    adj[a].push({ to: b, w });
    adj[b].push({ to: a, w });
  };

  const ends = [];
  kmlLines(features).forEach((line, lineIndex) => {
    const path = (line.path || []).filter(isPoint);
    if (path.length < 2) return;
    const lineIds = path.map(nodeAt);
    let run = 0;
    for (let i = 1; i < lineIds.length; i += 1) {
      if (lineIds[i] === lineIds[i - 1]) continue;
      link(lineIds[i - 1], lineIds[i]);
      segments.push([lineIds[i - 1], lineIds[i], lineIndex, run]);
      run += distM(nodes[lineIds[i - 1]], nodes[lineIds[i]]);
    }
    ends.push({ id: lineIds[0], line: lineIndex, run: 0 }, { id: lineIds[lineIds.length - 1], line: lineIndex, run });
  });

  const network = { nodes, adj, segments };
  for (const end of ends) {
    if (adj[end.id].length !== 1) continue;
    // Its own line right next to it doesn't count, only a stretch well along it
    const near = nearestSegment(network, nodes[end.id], JOIN_M, ([a, b, line, run]) => a !== end.id && b !== end.id && (line !== end.line || Math.abs(run - end.run) > 3 * JOIN_M));
    if (!near) continue;
    const [a, b] = segments[near.index];
    if (near.t <= 0) link(end.id, a);
    else if (near.t >= 1) link(end.id, b);
    else {
      const joint = newNode(near.point);
      link(joint, a);
      link(joint, b);
      link(end.id, joint);
    }
  }
  return network;
};

/** The nearest stretch of road to p within maxM (that passes `accept`): { index, t, distM, point } */
const nearestSegment = ({ nodes, segments }, p, maxM, accept) => {
  const dLat = maxM / 110540;
  const dLng = maxM / (111320 * Math.max(0.1, Math.cos((p.lat * Math.PI) / 180)));
  let best = null;
  segments.forEach((segment, index) => {
    const a = nodes[segment[0]];
    const b = nodes[segment[1]];
    if (p.lat < Math.min(a.lat, b.lat) - dLat || p.lat > Math.max(a.lat, b.lat) + dLat) return;
    if (p.lng < Math.min(a.lng, b.lng) - dLng || p.lng > Math.max(a.lng, b.lng) + dLng) return;
    if (accept && !accept(segment)) return;
    const s = projectOnSegment(p, a, b);
    if (s.distM <= maxM && (!best || s.distM < best.distM)) best = { index, ...s };
  });
  return best;
};

/**
 * The way along the road network from → to: { path } or { problem } saying why there's
 * none. `names` label the two ends in the problem.
 */
export const routeAlongRoads = (network, from, to, names = ["The start", "The end"]) => {
  if (!network?.segments.length) return { problem: "No KML road for this block yet. Upload the block's ring KML." };
  if (!isPoint(from) || !isPoint(to)) return { problem: "Its end points have no coordinates." };
  const { nodes, adj, segments } = network;
  const s = nearestSegment(network, from, ROAD_TOLERANCE_M);
  const g = nearestSegment(network, to, ROAD_TOLERANCE_M);
  const far = [!s && names[0], !g && names[1]].filter(Boolean);
  if (far.length) return { problem: `${far.join(" and ")} ${far.length > 1 ? "are" : "is"} more than ${ROAD_TOLERANCE_M} m from every KML road.` };

  const [sa, sb] = segments[s.index];
  const [ga, gb] = segments[g.index];
  const sLen = distM(nodes[sa], nodes[sb]);
  const gLen = distM(nodes[ga], nodes[gb]);
  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  const heap = new Heap();
  dist[sa] = s.t * sLen;
  dist[sb] = Math.min(dist[sb], (1 - s.t) * sLen);
  heap.push([dist[sa], sa]);
  heap.push([dist[sb], sb]);
  // On the same stretch of road the way is straight along it
  let best = s.index === g.index ? Math.abs(s.t - g.t) * sLen : Infinity;
  let last = -1;
  while (heap.size) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    if (d >= best) break;
    for (const [node, rest] of [
      [ga, g.t * gLen],
      [gb, (1 - g.t) * gLen],
    ]) {
      if (u === node && d + rest < best) {
        best = d + rest;
        last = u;
      }
    }
    for (const { to: v, w } of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        prev[v] = u;
        heap.push([dist[v], v]);
      }
    }
  }
  if (!Number.isFinite(best)) return { problem: "The KML roads near its two ends aren't connected." };

  const middle = [];
  for (let u = last; u !== -1; u = prev[u]) middle.push(nodes[u]);
  const path = [s.point, ...middle.reverse(), g.point].filter((p, i, all) => i === 0 || p.lat !== all[i - 1].lat || p.lng !== all[i - 1].lng);
  const straight = distM(from, to);
  if (best > MAX_DETOUR * straight && best - straight > 1000) {
    return { problem: `The KML road only connects its ends the long way round (${(best / 1000).toFixed(1)} km for ${(straight / 1000).toFixed(1)} km apart). The KML likely has a gap here.` };
  }
  return { path: path.length > 1 ? path : [s.point, g.point] };
};

/**
 * Road paths for a block's sections and subsections, from its road network.
 * Returns { sections, subsections: Map(id -> path), problems: Map(id -> why it has no
 * road), route(a, b) -> path | null }. Anything without a road isn't drawn.
 */
export const buildRoadPaths = (sections, subsections, network) => {
  const sectionPaths = new Map();
  const subPaths = new Map();
  const problems = new Map();
  const routes = new Map();
  const route = (a, b) => {
    if (!isPoint(a) || !isPoint(b)) return null;
    const key = `${a.lat},${a.lng}>${b.lat},${b.lng}`;
    if (!routes.has(key)) routes.set(key, routeAlongRoads(network, a, b).path || null);
    return routes.get(key);
  };

  // The block's nodes (router and GPs), from the sections' ends. A section's road runs from
  // one node to the next: one through another node went the long way round the ring.
  const stops = new Map();
  for (const [point, name] of (sections || []).flatMap((s) => [
    [s.from, s.fromName],
    [s.to, s.toName],
  ])) {
    const key = isPoint(point) && `${point.lat},${point.lng}`;
    if (!key || stops.has(key)) continue;
    // How far the node is from the road: it may stand back from it
    const onRoad = network?.segments.length ? nearestSegment(network, point, ROAD_TOLERANCE_M) : null;
    if (onRoad) stops.set(key, { point, name, offM: onRoad.distM });
  }
  for (const s of sections || []) {
    const id = String(s._id);
    const result = routeAlongRoads(network, s.from, s.to, [s.fromName || "The from node", s.toName || "The to node"]);
    const passed = result.path
      ? [...stops.values()]
          .filter(({ point }) => distM(point, s.from) > PASS_M && distM(point, s.to) > PASS_M)
          .filter(({ point, offM }) => projectOnPath(result.path, point).distM <= offM + PASS_M)
          .map(({ name }) => name || "another node")
      : [];
    if (passed.length) problems.set(id, `The KML road between its nodes runs through ${passed.join(", ")}: the ring KML likely has a gap here.`);
    else if (result.path) sectionPaths.set(id, result.path);
    else problems.set(id, result.problem);
  }
  for (const sub of subsections || []) {
    const id = String(sub._id);
    // Along its section's road where both ends are on it; else its own way along the roads
    const road = sectionPaths.get(String(sub.sectionId));
    const a = road && isPoint(sub.from) ? projectOnPath(road, sub.from) : null;
    const b = road && isPoint(sub.to) ? projectOnPath(road, sub.to) : null;
    if (a && b && a.distM <= ROAD_TOLERANCE_M && b.distM <= ROAD_TOLERANCE_M && Math.abs(a.run - b.run) >= 1) {
      subPaths.set(id, slicePath(road, a, b));
      continue;
    }
    const result = routeAlongRoads(network, sub.from, sub.to, ["Its from point", "Its to point"]);
    if (result.path) subPaths.set(id, result.path);
    else problems.set(id, result.problem);
  }
  return { sections: sectionPaths, subsections: subPaths, problems, route };
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
