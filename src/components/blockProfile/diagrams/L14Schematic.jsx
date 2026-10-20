import React, { forwardRef, useMemo } from "react";
import { fmtDateTime } from "../../../utils/executionFormat";
import { titleCase } from "../../execution/execConstants";
import { L14_H as H, L14_W as W, buildL14 } from "./l14Layout";

// L-14: the whole block as a right-angled schematic. Nodes keep their relative
// geographic order (west → east, north → south) on a grid; each section is drawn as a
// straight or L-shaped line with its length in metres. Exchange as a rack symbol, GPs
// as triangles, BJC (branch) and SJC (straight) joint closures as diamonds.
// Sized for an A4 landscape page.

const C = { route: "#4c1d95", bjc: "#ea580c", sjc: "#4ade80", sjcStroke: "#15803d", gp: "#111827" };

const halo = { paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 4, strokeLinejoin: "round" };

const FREE = ["down", "up", "right", "left"];
const STEP = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] };

const Triangle = ({ x, y }) => <polygon points={`${x},${y - 9} ${x + 9},${y + 7} ${x - 9},${y + 7}`} fill={C.gp} />;
const Diamond = ({ x, y, fill, stroke }) => <polygon points={`${x},${y - 9} ${x + 9},${y} ${x},${y + 9} ${x - 9},${y}`} fill={fill} stroke={stroke} strokeWidth={1.5} />;

const L14Schematic = forwardRef(({ blockProfile, features, onSelect }, ref) => {
  const l14 = useMemo(() => buildL14(features), [features]);

  const nodeLabel = (n, x, y, dir) => {
    const name = n.type === "BHQ" ? `${titleCase(n.name)}` : titleCase(n.name);
    const [dx, dy] = STEP[dir] || [0, 1];
    const tx = x + dx * 16;
    const ty = y + dy * 22 + (dy === 0 ? 4 : dy > 0 ? 4 : 0);
    return (
      <text x={tx} y={ty} textAnchor={dx > 0 ? "start" : dx < 0 ? "end" : "middle"} fontSize={11} fontWeight={700} fill="#111827" style={halo}>
        {name}
      </text>
    );
  };

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto", fontFamily: "Inter, Roboto, Arial, sans-serif" }} role="img" aria-label="L-14 diagram">
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
      {/* title box */}
      <rect x={W / 2 - 230} y={22} width={460} height={40} rx={4} fill="#ecfdf5" stroke="#86efac" />
      <text x={W / 2} y={47} textAnchor="middle" fontSize={17} fontWeight={700} fill="#14532d">
        L-14 · Block {titleCase(blockProfile.block)}
      </text>
      <text x={W / 2} y={84} textAnchor="middle" fontSize={11} fill="#64748b">
        {[titleCase(blockProfile.district), `LGD ${blockProfile.blockCode}`, `Span lengths in metres · ${fmtDateTime(new Date())} IST`].filter(Boolean).join(" · ")}
      </text>

      {/* routes */}
      {l14.edges.map((e) => {
        const d = e.path.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
        return (
          <g key={e.route.section._id} onClick={() => onSelect({ kind: "section", section: e.route.section })} style={{ cursor: "pointer" }}>
            <title>{`${e.route.section.name} · ${e.existing ? "existing route" : "new route"}`}</title>
            <path d={d} stroke="transparent" strokeWidth={16} fill="none" />
            <path d={d} stroke={C.route} strokeWidth={2.4} fill="none" strokeDasharray={e.existing ? "9 6" : undefined} strokeLinejoin="miter" />
            <text x={e.label.x} y={e.label.y} textAnchor={e.label.anchor} fontSize={11.5} fill="#111827" style={halo}>
              {e.route.section.sectionLength > 0 ? Math.round(e.route.section.sectionLength) : "—"}
            </text>
          </g>
        );
      })}

      {/* SJCs */}
      {l14.sjcs.map((s, i) => (
        <g key={`sjc${i}`} onClick={() => onSelect({ kind: "sub", sub: s.joint.sub })} style={{ cursor: "pointer" }}>
          <title>{`SJC · splicing · ${s.joint.sub.name}`}</title>
          <Diamond x={s.x} y={s.y} fill={C.sjc} stroke={C.sjcStroke} />
        </g>
      ))}

      {/* nodes */}
      {l14.nodes.map((n) => {
        const free = FREE.filter((d) => !n.sides.has(d));
        const select = () => onSelect({ kind: "node", node: { type: n.type, code: n.code, name: n.name } });
        if (n.type === "BHQ") {
          // Label on a free side (above first), else diagonally up-left, clear of every line
          const labelDir = free.includes("up") ? "up" : free[0];
          return (
            <g key={n.key} onClick={select} style={{ cursor: "pointer" }}>
              <title>{`Exchange: ${n.name}`}</title>
              <rect x={n.x - 16} y={n.y - 11} width={32} height={22} fill="#fff" stroke="#111827" strokeWidth={2} />
              <line x1={n.x - 10} x2={n.x + 10} y1={n.y - 3} y2={n.y - 3} stroke="#111827" strokeWidth={2} />
              <line x1={n.x - 10} x2={n.x + 10} y1={n.y + 3} y2={n.y + 3} stroke="#111827" strokeWidth={1} />
              {labelDir ? (
                nodeLabel(n, n.x + STEP[labelDir][0] * 10, n.y + STEP[labelDir][1] * 6, labelDir)
              ) : (
                <text x={n.x - 22} y={n.y - 20} textAnchor="end" fontSize={11} fontWeight={700} fill="#111827" style={halo}>
                  {titleCase(n.name)}
                </text>
              )}
            </g>
          );
        }
        if (n.branch) {
          // A branch: BJC on the route, the GP on a short spur
          const dir = free[0] || "down";
          const [dx, dy] = STEP[dir];
          const gx = n.x + dx * 46;
          const gy = n.y + dy * 46;
          return (
            <g key={n.key} onClick={select} style={{ cursor: "pointer" }}>
              <title>{`BJC at ${titleCase(n.name)} · ${n.code}`}</title>
              <line x1={n.x} y1={n.y} x2={gx} y2={gy} stroke={C.route} strokeWidth={2.4} />
              <Diamond x={n.x} y={n.y} fill={C.bjc} stroke="#9a3412" />
              <Triangle x={gx} y={gy} />
              {nodeLabel(n, gx, gy, dir)}
            </g>
          );
        }
        const dir = free[0] || "down";
        return (
          <g key={n.key} onClick={select} style={{ cursor: "pointer" }}>
            <title>{`GP: ${titleCase(n.name)} · LGD ${n.code}`}</title>
            <Triangle x={n.x} y={n.y} />
            {nodeLabel(n, n.x, n.y, dir)}
          </g>
        );
      })}

      {/* legend */}
      <g transform={`translate(${W - 230}, ${H - 250})`}>
        <rect x={0} y={0} width={200} height={190} rx={8} fill="#fff" stroke="#cbd5e1" />
        <text x={14} y={24} fontSize={13} fontWeight={700} fill="#0f172a">
          Legend
        </text>
        <line x1={14} x2={44} y1={46} y2={46} stroke={C.route} strokeWidth={2.4} />
        <text x={54} y={50} fontSize={11.5} fill="#0f172a">
          New route
        </text>
        <line x1={14} x2={44} y1={70} y2={70} stroke={C.route} strokeWidth={2.4} strokeDasharray="7 5" />
        <text x={54} y={74} fontSize={11.5} fill="#0f172a">
          Existing route
        </text>
        <Diamond x={29} y={96} fill={C.bjc} stroke="#9a3412" />
        <text x={54} y={100} fontSize={11.5} fill="#0f172a">
          BJC (branch)
        </text>
        <Diamond x={29} y={120} fill={C.sjc} stroke={C.sjcStroke} />
        <text x={54} y={124} fontSize={11.5} fill="#0f172a">
          SJC (splicing)
        </text>
        <Triangle x={29} y={145} />
        <text x={54} y={149} fontSize={11.5} fill="#0f172a">
          GP
        </text>
        <rect x={19} y={160} width={20} height={14} fill="#fff" stroke="#111827" strokeWidth={1.6} />
        <text x={54} y={172} fontSize={11.5} fill="#0f172a">
          Exchange (BHQ)
        </text>
      </g>
      <text x={16} y={H - 16} fontSize={10.5} fill="#64748b">
        Schematic, not to scale. BJC: where three or more routes meet. SJC: splicing points recorded along a section.
        {l14.unlinked ? ` ${l14.unlinked} GP${l14.unlinked === 1 ? "" : "s"} without a section not shown.` : ""}
      </text>
    </svg>
  );
});

L14Schematic.displayName = "L14Schematic";

export default L14Schematic;
