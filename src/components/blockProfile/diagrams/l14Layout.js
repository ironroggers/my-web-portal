import { nodeKey, projectOnto } from "./diagramGeometry";
import { worldPx } from "./projection";

// Layout of the L-14 schematic (L14Schematic.jsx): nodes on a grid that keeps their
// geographic order, sections as straight or L-shaped lines, SJCs along them.

export const L14_W = 1188;
export const L14_H = 840;
const PLOT = { x: 110, y: 170, w: L14_W - 110 - 280, h: L14_H - 170 - 90 };

// Group sorted values that are close together, so nearly-aligned nodes share a line
const ranks = (values, tolerance) => {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const groups = [];
  for (const v of sorted) {
    const last = groups[groups.length - 1];
    if (last && v - last.max <= tolerance) last.max = v;
    else groups.push({ min: v, max: v });
  }
  return (v) => groups.findIndex((g) => v >= g.min && v <= g.max);
};

const segOverlap = (s, t) => {
  // Same axis and overlapping (collinear) segments
  if (s.x1 === s.x2 && t.x1 === t.x2 && s.x1 === t.x1) {
    const [a1, a2] = [Math.min(s.y1, s.y2), Math.max(s.y1, s.y2)];
    const [b1, b2] = [Math.min(t.y1, t.y2), Math.max(t.y1, t.y2)];
    return Math.min(a2, b2) - Math.max(a1, b1) > 1;
  }
  if (s.y1 === s.y2 && t.y1 === t.y2 && s.y1 === t.y1) {
    const [a1, a2] = [Math.min(s.x1, s.x2), Math.max(s.x1, s.x2)];
    const [b1, b2] = [Math.min(t.x1, t.x2), Math.max(t.x1, t.x2)];
    return Math.min(a2, b2) - Math.max(a1, b1) > 1;
  }
  return false;
};
const onSegment = (p, s) =>
  (s.x1 === s.x2 && Math.abs(p.x - s.x1) < 1 && p.y > Math.min(s.y1, s.y2) + 1 && p.y < Math.max(s.y1, s.y2) - 1) ||
  (s.y1 === s.y2 && Math.abs(p.y - s.y1) < 1 && p.x > Math.min(s.x1, s.x2) + 1 && p.x < Math.max(s.x1, s.x2) - 1);
const segsOf = (path) => path.slice(1).map((p, i) => ({ x1: path[i].x, y1: path[i].y, x2: p.x, y2: p.y }));
const pathLength = (path) => segsOf(path).reduce((n, s) => n + Math.abs(s.x2 - s.x1) + Math.abs(s.y2 - s.y1), 0);
const pointAlong = (path, t) => {
  let left = pathLength(path) * t;
  for (const s of segsOf(path)) {
    const len = Math.abs(s.x2 - s.x1) + Math.abs(s.y2 - s.y1);
    if (left <= len) {
      const k = len ? left / len : 0;
      return { x: s.x1 + (s.x2 - s.x1) * k, y: s.y1 + (s.y2 - s.y1) * k };
    }
    left -= len;
  }
  return path[path.length - 1];
};

export const buildL14 = (features) => {
  const linked = new Set(features.routes.flatMap((r) => [nodeKey(r.from), nodeKey(r.to)]));
  const nodes = features.nodes.filter((n) => linked.has(n.key));
  if (!nodes.length) return { nodes: [], edges: [], sjcs: [], unlinked: features.nodes.length };

  // Grid from geographic order
  const w = new Map(nodes.map((n) => [n.key, worldPx(n.p)]));
  const xs = nodes.map((n) => w.get(n.key).x);
  const ys = nodes.map((n) => w.get(n.key).y);
  const spanX = Math.max(...xs) - Math.min(...xs) || 1;
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;
  const colOf = ranks(xs, spanX * 0.07);
  const rowOf = ranks(ys, spanY * 0.07);
  const taken = new Set();
  const cell = new Map();
  for (const n of [...nodes].sort((a, b) => (a.type === "BHQ" ? -1 : b.type === "BHQ" ? 1 : 0))) {
    let c = colOf(w.get(n.key).x);
    const r = rowOf(w.get(n.key).y);
    while (taken.has(`${c},${r}`)) c += 1;
    taken.add(`${c},${r}`);
    cell.set(n.key, { c, r });
  }
  const cols = Math.max(...[...cell.values()].map((v) => v.c)) || 1;
  const rows = Math.max(...[...cell.values()].map((v) => v.r)) || 1;
  const cw = Math.min(260, PLOT.w / cols);
  const rh = Math.min(200, PLOT.h / rows);
  const pos = new Map(
    [...cell.entries()].map(([k, { c, r }]) => [k, { x: Math.round(PLOT.x + (PLOT.w - cw * cols) / 2 + c * cw), y: Math.round(PLOT.y + (PLOT.h - rh * rows) / 2 + r * rh) }])
  );

  // Edges: straight when aligned, else the L that overlaps least and avoids other nodes
  const used = [];
  const edges = features.routes
    .filter((r) => pos.has(nodeKey(r.from)) && pos.has(nodeKey(r.to)))
    .map((r) => {
      const A = pos.get(nodeKey(r.from));
      const B = pos.get(nodeKey(r.to));
      const candidates =
        A.x === B.x || A.y === B.y
          ? [[A, B]]
          : [
              [A, { x: B.x, y: A.y }, B],
              [A, { x: A.x, y: B.y }, B],
            ];
      const others = [...pos.entries()].filter(([k]) => k !== nodeKey(r.from) && k !== nodeKey(r.to)).map(([, p]) => p);
      const score = (path) => {
        const segs = segsOf(path);
        return segs.reduce((n, s) => n + used.filter((u) => segOverlap(u, s)).length * 10 + others.filter((p) => onSegment(p, s)).length * 25, 0);
      };
      const path = candidates.sort((a, b) => score(a) - score(b))[0];
      used.push(...segsOf(path));
      // Length label on the longest leg
      const legs = segsOf(path);
      const leg = legs.sort((a, b) => Math.abs(b.x2 - b.x1) + Math.abs(b.y2 - b.y1) - (Math.abs(a.x2 - a.x1) + Math.abs(a.y2 - a.y1)))[0];
      const horizontal = leg.y1 === leg.y2;
      const label = { x: (leg.x1 + leg.x2) / 2 + (horizontal ? 0 : 8), y: (leg.y1 + leg.y2) / 2 + (horizontal ? -8 : 4), anchor: horizontal ? "middle" : "start" };
      return { route: r, path, label, existing: r.section.routeType === "EXISTING" };
    });

  // SJCs along their section, at the share of the way they were recorded
  const edgeBySection = new Map(edges.map((e) => [e.route.section._id, e]));
  const sjcs = features.joints
    .map((j) => {
      const e = edgeBySection.get(j.sub.sectionId);
      if (!e) return null;
      const t = projectOnto(j.p, e.route.a, e.route.b).t;
      return { ...pointAlong(e.path, Math.min(0.92, Math.max(0.08, t))), joint: j };
    })
    .filter(Boolean);

  // Which sides of each node are taken by lines (for placing triangles, spurs and labels)
  const sides = new Map(nodes.map((n) => [n.key, new Set()]));
  for (const e of edges) {
    const [p0, p1] = [e.path[0], e.path[1]];
    const [q0, q1] = [e.path[e.path.length - 1], e.path[e.path.length - 2]];
    const dir = (from, to) => (to.x > from.x ? "right" : to.x < from.x ? "left" : to.y > from.y ? "down" : "up");
    sides.get(nodeKey(e.route.from))?.add(dir(p0, p1));
    sides.get(nodeKey(e.route.to))?.add(dir(q0, q1));
  }

  return {
    nodes: nodes.map((n) => ({ ...n, ...pos.get(n.key), sides: sides.get(n.key), branch: (features.degree.get(n.key) || 0) >= 3 })),
    edges,
    sjcs,
    unlinked: features.nodes.length - nodes.length,
  };
};

