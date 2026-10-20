import React, { forwardRef, useMemo } from "react";
import { fmtDateTime } from "../../../utils/executionFormat";
import { titleCase } from "../../execution/execConstants";
import { allPoints } from "./blockFeatures";
import { makeProjection, niceMetres } from "./projection";
import { nodeKey } from "./diagramGeometry";

// Block topology plotted from the captured lat/long of every layer (Web Mercator), with
// or without a Google static map behind it. Sized for an A4 landscape page.

const TOPO_W = 1188;
const TOPO_H = 840;
const HEADER = 64;
const PLOT = { x: 16, y: HEADER + 8, w: TOPO_W - 32, h: TOPO_H - HEADER - 24 };

const COLORS = {
  newRoute: "#4c1d95",
  newCasing: "#c4b5fd",
  existing: "#84cc16",
  gp: "#f97316",
  gpStroke: "#7c2d12",
  joint: "#7c2d12",
  structure: "#334155",
  ri: "#db2777",
  landmark: "#64748b",
  crossing: "#0f172a",
};

// Legend rows: BBNL GIS layer names, as in the QGIS layout
const TOPO_LAYERS = [
  { key: "block", label: "block_eqpt" },
  { key: "gp", label: "gp_eqpt" },
  { key: "joint", label: "joint" },
  { key: "structure", label: "structure" },
  { key: "ri", label: "ri" },
  { key: "landmark", label: "landmark" },
  { key: "crossing", label: "crossing" },
  { key: "newRoute", label: "New OFC" },
  { key: "existing", label: "Existing" },
];

const halo = { paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3, strokeLinejoin: "round" };

// Labels: try right, left, above, below; keep the first that doesn't hit another label
const placeLabels = (items) => {
  const placed = [];
  const hit = (b) => placed.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
  return items.map(({ x, y, text }) => {
    const w = text.length * 6.4 + 4;
    const h = 13;
    const options = [
      { x: x + 10, y: y - h / 2, anchor: "start", tx: x + 11, ty: y + 4 },
      { x: x - 10 - w, y: y - h / 2, anchor: "end", tx: x - 11, ty: y + 4 },
      { x: x - w / 2, y: y - 22, anchor: "middle", tx: x, ty: y - 12 },
      { x: x - w / 2, y: y + 9, anchor: "middle", tx: x, ty: y + 20 },
    ];
    const pick = options.find((o) => !hit({ x: o.x, y: o.y, w, h })) || options[0];
    placed.push({ x: pick.x, y: pick.y, w, h });
    return { text, x: pick.tx, y: pick.ty, anchor: pick.anchor };
  });
};

const TopologyMap = forwardRef(({ blockProfile, features, layers, onToggleLayer, withMap, mapImage, onSelect }, ref) => {
  const proj = useMemo(() => makeProjection(allPoints(features), PLOT, { withMap }), [features, withMap]);
  const P = (p) => proj.project(p);
  const on = (k) => layers[k] !== false;
  const f = features;

  const counts = {
    block: f.nodes.filter((n) => n.type === "BHQ").length,
    gp: f.nodes.filter((n) => n.type === "GP").length,
    joint: f.joints.length,
    structure: f.structures.length,
    ri: f.ri.length,
    landmark: f.landmarks.length,
    crossing: f.crossings.length,
    newRoute: f.routes.filter((r) => r.section.routeType !== "EXISTING").length,
    existing: f.routes.filter((r) => r.section.routeType === "EXISTING").length,
  };

  const nodeLabels = placeLabels(
    f.nodes.filter((n) => (n.type === "BHQ" ? on("block") : on("gp"))).map((n) => ({ ...P(n.p), text: titleCase(n.name).toUpperCase() }))
  );
  const scaleM = niceMetres(proj.metresPerUnit * 140);
  const scaleW = scaleM / proj.metresPerUnit;
  const routeD = (r) => r.points.map((p, i) => `${i ? "L" : "M"} ${P(p).x.toFixed(1)} ${P(p).y.toFixed(1)}`).join(" ");
  const legendRows = TOPO_LAYERS;
  const LEG = { w: 214, x: TOPO_W - 16 - 214, y: PLOT.y + 10, row: 21 };

  const swatch = (key, x, y) => {
    switch (key) {
      case "block":
        return <rect x={x - 6} y={y - 6} width={12} height={12} fill="#fff" stroke="#111" strokeWidth={2} />;
      case "gp":
        return <circle cx={x} cy={y} r={6} fill={COLORS.gp} stroke={COLORS.gpStroke} strokeWidth={1.5} />;
      case "joint":
        return <circle cx={x} cy={y} r={4.5} fill={COLORS.joint} stroke="#fff" strokeWidth={1.2} />;
      case "structure":
        return <rect x={x - 4.5} y={y - 4.5} width={9} height={9} fill={COLORS.structure} stroke="#fff" strokeWidth={1.2} />;
      case "ri":
        return <polygon points={`${x},${y - 6} ${x + 5.5},${y + 4.5} ${x - 5.5},${y + 4.5}`} fill={COLORS.ri} stroke="#fff" strokeWidth={1} />;
      case "landmark":
        return <polygon points={`${x},${y - 5} ${x + 5},${y} ${x},${y + 5} ${x - 5},${y}`} fill={COLORS.landmark} stroke="#fff" strokeWidth={1} />;
      case "crossing":
        return <polygon points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`} fill="#fff" stroke={COLORS.crossing} strokeWidth={1.8} />;
      case "newRoute":
        return (
          <g>
            <line x1={x - 10} x2={x + 10} y1={y} y2={y} stroke={COLORS.newCasing} strokeWidth={7} strokeLinecap="round" />
            <line x1={x - 10} x2={x + 10} y1={y} y2={y} stroke={COLORS.newRoute} strokeWidth={3} strokeLinecap="round" />
          </g>
        );
      default:
        return <line x1={x - 10} x2={x + 10} y1={y} y2={y} stroke={COLORS.existing} strokeWidth={2.5} strokeDasharray="5 4" />;
    }
  };

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${TOPO_W} ${TOPO_H}`}
      style={{ display: "block", width: "100%", height: "auto", fontFamily: "Inter, Roboto, Arial, sans-serif" }}
      role="img"
      aria-label="Block topology diagram"
    >
      <rect x={0} y={0} width={TOPO_W} height={TOPO_H} fill="#ffffff" />
      {/* header */}
      <text x={16} y={30} fontSize={20} fontWeight={700} fill="#0f172a">
        {titleCase(blockProfile.block)} · Block topology diagram
      </text>
      <text x={16} y={50} fontSize={11.5} fill="#64748b">
        {[blockProfile.district && `District ${titleCase(blockProfile.district)}`, `LGD ${blockProfile.blockCode}`, `Plotted from captured lat/long · ${fmtDateTime(new Date())} IST`]
          .filter(Boolean)
          .join(" · ")}
      </text>

      {/* plot area: map or plain */}
      <rect x={PLOT.x} y={PLOT.y} width={PLOT.w} height={PLOT.h} fill="#f8fafc" stroke="#e2e8f0" />
      {withMap && (mapImage || proj.map?.url) && (
        <image href={mapImage || proj.map.url} x={PLOT.x} y={PLOT.y} width={PLOT.w} height={PLOT.h} preserveAspectRatio="none" opacity={0.9} />
      )}
      {!withMap &&
        Array.from({ length: 11 }, (_, i) => (
          <line key={`g${i}`} x1={PLOT.x + (PLOT.w * i) / 10} x2={PLOT.x + (PLOT.w * i) / 10} y1={PLOT.y} y2={PLOT.y + PLOT.h} stroke="#eef2f7" />
        ))}

      {/* routes */}
      {f.routes.map((r) => {
        const existing = r.section.routeType === "EXISTING";
        if (existing ? !on("existing") : !on("newRoute")) return null;
        return (
          <g key={r.section._id} onClick={() => onSelect({ kind: "section", section: r.section })} style={{ cursor: "pointer" }}>
            <title>{`${r.section.name} · ${existing ? "existing route" : "new OFC"}`}</title>
            <path d={routeD(r)} stroke="transparent" strokeWidth={14} fill="none" />
            {existing ? (
              <path d={routeD(r)} stroke={COLORS.existing} strokeWidth={2.5} strokeDasharray="8 6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <>
                <path d={routeD(r)} stroke={COLORS.newCasing} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d={routeD(r)} stroke={COLORS.newRoute} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </g>
        );
      })}

      {/* point layers */}
      {on("landmark") &&
        f.landmarks.map((x, i) => (
          <g key={`lm${i}`} onClick={() => onSelect({ kind: "sub", sub: x.sub })} style={{ cursor: "pointer" }}>
            <title>{`${x.ref.description || "Reference point"} · ${x.sub.name}`}</title>
            {swatch("landmark", P(x.p).x, P(x.p).y)}
          </g>
        ))}
      {on("crossing") &&
        f.crossings.map((x, i) => (
          <g key={`cr${i}`} onClick={() => onSelect({ kind: "sub", sub: x.sub })} style={{ cursor: "pointer" }}>
            <title>{`${x.label} crossing · ${x.sub.name}`}</title>
            {swatch("crossing", P(x.p).x, P(x.p).y)}
          </g>
        ))}
      {on("structure") &&
        f.structures.map((x, i) => (
          <g key={`st${i}`} onClick={() => onSelect({ kind: "sub", sub: x.sub })} style={{ cursor: "pointer" }}>
            <title>{`Chamber · ${x.sub.name}`}</title>
            {swatch("structure", P(x.p).x, P(x.p).y)}
          </g>
        ))}
      {on("ri") &&
        f.ri.map((x, i) => (
          <g key={`ri${i}`} onClick={() => onSelect({ kind: "sub", sub: x.sub })} style={{ cursor: "pointer" }}>
            <title>{`Route indicator · ${x.sub.name}`}</title>
            {swatch("ri", P(x.p).x, P(x.p).y)}
          </g>
        ))}
      {on("joint") &&
        f.joints.map((x, i) => (
          <g key={`jt${i}`} onClick={() => onSelect({ kind: "sub", sub: x.sub })} style={{ cursor: "pointer" }}>
            <title>{`Joint (splicing) · ${x.sub.name}`}</title>
            {swatch("joint", P(x.p).x, P(x.p).y)}
          </g>
        ))}

      {/* network */}
      {f.nodes.map((n) => {
        if (n.type === "BHQ" ? !on("block") : !on("gp")) return null;
        const { x, y } = P(n.p);
        return (
          <g key={n.key} onClick={() => onSelect({ kind: "node", node: { type: n.type, code: n.code, name: n.name } })} style={{ cursor: "pointer" }}>
            <title>{`${n.type === "BHQ" ? "Block HQ" : "GP"}: ${titleCase(n.name)} · ${n.code} · ${f.degree.get(nodeKey(n)) || 0} routes`}</title>
            {n.type === "BHQ" ? (
              <rect x={x - 8} y={y - 8} width={16} height={16} fill="#fff" stroke="#111" strokeWidth={2.2} />
            ) : (
              <circle cx={x} cy={y} r={7} fill={COLORS.gp} stroke={COLORS.gpStroke} strokeWidth={1.5} />
            )}
          </g>
        );
      })}
      {nodeLabels.map((l, i) => (
        <text key={`nl${i}`} x={l.x} y={l.y} textAnchor={l.anchor} fontSize={10.5} fontWeight={700} fill="#111827" style={halo}>
          {l.text}
        </text>
      ))}

      {/* north arrow */}
      <g transform={`translate(${PLOT.x + 30}, ${PLOT.y + 34})`}>
        <circle r={18} fill="#fff" fillOpacity={0.85} stroke="#cbd5e1" />
        <polygon points="0,-13 6,6 0,2 -6,6" fill="#111827" />
        <text y={-20} textAnchor="middle" fontSize={11} fontWeight={700} fill="#111827" style={halo}>
          N
        </text>
      </g>

      {/* scale bar */}
      <g transform={`translate(${PLOT.x + 16}, ${PLOT.y + PLOT.h - 22})`}>
        <rect x={-6} y={-16} width={scaleW + 52} height={30} rx={4} fill="#fff" fillOpacity={0.85} />
        <rect x={0} y={0} width={scaleW / 2} height={5} fill="#111827" />
        <rect x={scaleW / 2} y={0} width={scaleW / 2} height={5} fill="#fff" stroke="#111827" strokeWidth={1} />
        <text x={0} y={-4} fontSize={9.5} fill="#111827">
          0
        </text>
        <text x={scaleW} y={-4} fontSize={9.5} fill="#111827" textAnchor="middle">
          {scaleM >= 1000 ? `${scaleM / 1000} km` : `${scaleM} m`}
        </text>
      </g>

      {/* legend: click a row to show or hide the layer */}
      <g>
        <rect x={LEG.x} y={LEG.y} width={LEG.w} height={36 + legendRows.length * LEG.row} rx={6} fill="#fff" fillOpacity={0.95} stroke="#cbd5e1" />
        <text x={LEG.x + 12} y={LEG.y + 22} fontSize={12} fontWeight={700} fill="#0f172a">
          {titleCase(blockProfile.block).slice(0, 22)} topology
        </text>
        {legendRows.map((row, i) => {
          const y = LEG.y + 42 + i * LEG.row;
          const visible = on(row.key);
          return (
            <g key={row.key} onClick={() => onToggleLayer?.(row.key)} style={{ cursor: onToggleLayer ? "pointer" : "default" }} opacity={visible ? 1 : 0.35}>
              <title>{visible ? "Click to hide" : "Click to show"}</title>
              <rect x={LEG.x + 4} y={y - 10} width={LEG.w - 8} height={LEG.row - 1} fill="transparent" />
              {swatch(row.key, LEG.x + 24, y)}
              <text x={LEG.x + 44} y={y + 4} fontSize={11.5} fill="#0f172a">
                {row.label} [{counts[row.key]}]
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
});

TopologyMap.displayName = "TopologyMap";

export default TopologyMap;
