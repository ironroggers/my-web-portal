import { routerName } from "../blockProfileConstants";
import { nodeKey, projectOnto } from "./diagramGeometry";

// The block's diagram features from the map data (GET /api/block-profiles/:id/map):
// network nodes, each section's route through its captured points, and the point
// layers (joints, structures, route indicators, landmarks, crossings).
//
// Joint closures aren't recorded on their own yet, so they are derived:
//   BJC  where three or more routes meet (a branch)
//   SJC  each Splicing point recorded along a section (a straight joint)

const DUCT_ON_ROUTE = new Set(["HDD", "OT", "CLAMP", "BLOWING"]);

const mid = (a, b) => ({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 });

export const buildFeatures = (blockProfile, data) => {
  const nodes = [];
  const router = blockProfile.blockRouter;
  if (router?.latitude != null && router?.longitude != null) {
    nodes.push({ key: `ROUTER:${blockProfile.blockCode}`, type: "ROUTER", code: blockProfile.blockCode, name: routerName(blockProfile), p: { lat: router.latitude, lng: router.longitude } });
  }
  for (const gp of blockProfile.gps || []) {
    if (gp.latitude != null && gp.longitude != null) nodes.push({ key: `GP:${gp.lgdCode}`, type: "GP", code: gp.lgdCode, name: gp.name, p: { lat: gp.latitude, lng: gp.longitude } });
  }
  const nodeByKey = new Map(nodes.map((n) => [n.key, n]));
  const sections = data?.sections || [];
  const subs = data?.subsections || [];

  // Each section's route: its start node, the captured pits and entries in order, its end node
  const routes = sections
    .map((s) => {
      const a = nodeByKey.get(nodeKey(s.fromNode))?.p || s.from;
      const b = nodeByKey.get(nodeKey(s.toNode))?.p || s.to;
      if (!a || !b) return null;
      const captured = subs
        .filter((x) => x.sectionId === s._id && (x.legacy || DUCT_ON_ROUTE.has(x.typeOfWork)) && x.typeOfWork !== "BLOWING")
        .flatMap((x) => [x.start, ...x.entries, x.end].filter(Boolean))
        .map((p) => ({ lat: p.lat, lng: p.lng, t: projectOnto(p, a, b).t }))
        .filter((p) => p.t > 0.002 && p.t < 0.998)
        .sort((u, v) => u.t - v.t);
      return { section: s, from: s.fromNode, to: s.toNode, points: [a, ...captured.map(({ lat, lng }) => ({ lat, lng })), b], a, b };
    })
    .filter(Boolean);

  const pointsOf = (typeOfWork) =>
    subs
      .filter((x) => x.typeOfWork === typeOfWork)
      .flatMap((sub) => sub.entries.map((e, i) => ({ p: { lat: e.lat, lng: e.lng }, sub, i })));

  const joints = pointsOf("SPLICING");
  const structures = pointsOf("CHAMBER");
  const ri = pointsOf("ROUTE_MARKER");
  const landmarks = subs.flatMap((sub) =>
    ["start", "end"].flatMap((which) => (sub[which]?.refs || []).map((r, i) => ({ p: { lat: r.lat, lng: r.lng }, sub, ref: r, i, which })))
  );
  const crossings = subs
    .filter((sub) => sub.crossing && sub.from && sub.to)
    .map((sub) => ({ p: mid(sub.from, sub.to), sub, label: sub.crossing }));

  // Degree of each node in the network, for BJCs
  const degree = new Map();
  for (const r of routes) {
    for (const k of [nodeKey(r.from), nodeKey(r.to)]) degree.set(k, (degree.get(k) || 0) + 1);
  }
  const branches = nodes.filter((n) => n.type === "GP" && (degree.get(n.key) || 0) >= 3);

  return { nodes, nodeByKey, routes, joints, structures, ri, landmarks, crossings, degree, branches };
};
