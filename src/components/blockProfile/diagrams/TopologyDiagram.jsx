import React, { useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtDistance } from "../../../utils/executionFormat";
import { BAR_ORDER, titleCase } from "../../execution/execConstants";
import { BHQ_COLOR, GP_COLOR, RESTORATION_COLORS, STATUS_COLORS } from "../blockMapLayers";
import { layerNodes, nodeKey } from "./diagramGeometry";

// Block topology: the BHQ and GPs as boxes, one column per hop from the BHQ, and each
// section as a line between its two ends (coloured by restoration, with the subsection
// status split). GPs no section reaches are listed in a last column.

const COL_W = 380;
const NODE_W = 168;
const NODE_H = 54;
const ROW_GAP = 110;
const LABEL_W = 150;
const PAD = 40;

const shorten = (text, max) => (String(text).length > max ? `${String(text).slice(0, max - 1)}…` : String(text));

const NodeShape = ({ node, x, y, infra, onClick }) => {
  const color = node.type === "BHQ" ? BHQ_COLOR : GP_COLOR;
  const noCoords = node.lat == null;
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }} role="button" aria-label={`${node.type} ${node.name}`}>
      <title>{`${node.type === "BHQ" ? "Block HQ" : "GP"}: ${node.name} · ${node.code}${infra ? " · infra captured" : ""}${noCoords ? " · no coordinates" : ""}`}</title>
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={8}
        fill={color}
        stroke={noCoords ? "#f59e0b" : "none"}
        strokeWidth={noCoords ? 2 : 0}
        strokeDasharray={noCoords ? "5 3" : undefined}
      />
      <text x={x + 12} y={y + 21} fill="#fff" fontSize={12.5} fontWeight={700}>
        {shorten(titleCase(node.name), 19)}
      </text>
      <text x={x + 12} y={y + 39} fill="rgba(255,255,255,0.85)" fontSize={10.5}>
        {node.type === "BHQ" ? `BHQ · ${node.code}` : `GP · LGD ${node.code}`}
      </text>
      <circle cx={x + NODE_W - 14} cy={y + 14} r={8} fill={infra ? "#16a34a" : "rgba(255,255,255,0.25)"} stroke="#fff" strokeWidth={1.5} />
      {infra ? (
        <path d={`M ${x + NODE_W - 18} ${y + 14} l 3 3 l 5.5 -6`} stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <line x1={x + NODE_W - 17.5} x2={x + NODE_W - 10.5} y1={y + 14} y2={y + 14} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
      )}
    </g>
  );
};

// Small status split of the section's subsections, centred on (cx, cy)
const MiniBar = ({ counts, cx, cy }) => {
  const total = BAR_ORDER.reduce((n, k) => n + (counts?.[k] || 0), 0);
  if (!total) return null;
  const w = 64;
  let left = cx - w / 2;
  return (
    <g>
      <rect x={cx - w / 2 - 1} y={cy - 4} width={w + 2} height={8} rx={2} fill="#fff" />
      {BAR_ORDER.filter((k) => counts[k]).map((k) => {
        const width = (counts[k] / total) * w;
        const r = <rect key={k} x={left} y={cy - 3} width={width} height={6} fill={STATUS_COLORS[k]} />;
        left += width;
        return r;
      })}
    </g>
  );
};

const TopologyDiagram = ({ blockProfile, sections, infraFor, onSelect }) => {
  const { restorationOf } = useExecutionConfig();

  const graph = useMemo(() => {
    const nodes = [
      ...(blockProfile.bhq?.code
        ? [{ key: `BHQ:${blockProfile.bhq.code}`, type: "BHQ", code: blockProfile.bhq.code, name: blockProfile.bhq.name, lat: blockProfile.bhq.latitude, lng: blockProfile.bhq.longitude }]
        : []),
      ...(blockProfile.gps || []).map((gp) => ({ key: `GP:${gp.lgdCode}`, type: "GP", code: gp.lgdCode, name: gp.name, lat: gp.latitude, lng: gp.longitude })),
    ];
    const byKey = new Map(nodes.map((n) => [n.key, n]));
    const { columns, unlinked } = layerNodes(nodes, sections, `BHQ:${blockProfile.bhq?.code}`);
    const allColumns = unlinked.length ? [...columns, unlinked] : columns;
    const tallest = Math.max(1, ...allColumns.map((c) => c.length));
    const pos = new Map();
    allColumns.forEach((col, ci) => {
      const offset = ((tallest - col.length) * ROW_GAP) / 2;
      col.forEach((key, ri) => pos.set(key, { x: PAD + ci * COL_W, y: PAD + 20 + offset + ri * ROW_GAP }));
    });
    // Sections between the same two nodes fan out
    const pairs = new Map();
    const edges = sections
      .map((s) => ({ s, a: nodeKey(s.fromNode), b: nodeKey(s.toNode) }))
      .filter((e) => pos.has(e.a) && pos.has(e.b) && e.a !== e.b)
      .map((e) => {
        const pair = [e.a, e.b].sort().join("|");
        const i = pairs.get(pair) || 0;
        pairs.set(pair, i + 1);
        return { ...e, pair, i };
      })
      .map((e) => ({ ...e, n: pairs.get(e.pair) }));
    return {
      nodes,
      byKey,
      pos,
      edges,
      unlinkedColumn: unlinked.length ? allColumns.length - 1 : -1,
      width: PAD * 2 + (allColumns.length - 1) * COL_W + NODE_W,
      height: PAD * 2 + 30 + tallest * ROW_GAP,
      unplaced: sections.filter((s) => !pos.has(nodeKey(s.fromNode)) || !pos.has(nodeKey(s.toNode))),
    };
  }, [blockProfile, sections]);

  const centre = (key) => {
    const p = graph.pos.get(key);
    return { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 };
  };

  // Each section's curve, and where its label goes: on the curve's middle, moved down
  // (with a leader line) when it would cover another label or a node
  const curves = graph.edges.map(({ s, a: from, b: to, i, n }) => {
    const p = centre(from);
    const q = centre(to);
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular bend: fan out parallel sections, and bow sections within a column
    const bend = (i - (n - 1) / 2) * 110 + (Math.abs(dx) < 1 ? 70 : 0);
    const cx = (p.x + q.x) / 2 + (-dy / len) * bend;
    const cy = (p.y + q.y) / 2 + (dx / len) * bend;
    const mx = 0.25 * p.x + 0.5 * cx + 0.25 * q.x;
    const my = 0.25 * p.y + 0.5 * cy + 0.25 * q.y;
    return { s, p, q, cx, cy, mx, my, color: RESTORATION_COLORS[s.restorationStatus] || RESTORATION_COLORS.LOCKED };
  });
  const boxes = [...graph.pos.values()].map((pt) => ({ x: pt.x + NODE_W / 2, y: pt.y + NODE_H / 2, w: NODE_W, h: NODE_H }));
  const overlaps = (x, y) => boxes.some((o) => Math.abs(o.x - x) < (o.w + LABEL_W) / 2 + 6 && Math.abs(o.y - y) < (o.h + 46) / 2 + 6);
  [...curves]
    .sort((u, v) => u.my - v.my || u.mx - v.mx)
    .forEach((c) => {
      let ly = c.my;
      for (let step = 0; step < 60 && overlaps(c.mx, ly); step += 1) ly += 8;
      c.lx = c.mx;
      c.ly = ly;
      boxes.push({ x: c.mx, y: ly, w: LABEL_W, h: 46 });
    });
  const height = Math.max(graph.height, ...curves.map((c) => c.ly + 40));

  return (
    <Box>
      <Box sx={{ overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper", maxHeight: 720 }}>
        <Box component="svg" viewBox={`0 0 ${graph.width} ${height}`} sx={{ display: "block", width: Math.max(graph.width, 600), maxWidth: "none", mx: "auto" }} role="img" aria-label="Block topology">
          {graph.unlinkedColumn >= 0 && (
            <text x={PAD + graph.unlinkedColumn * COL_W} y={PAD} fontSize={11} fontWeight={700} fill="#64748b">
              Not linked by a section
            </text>
          )}

          {curves.map(({ s, p, q, cx, cy, color }) => (
            <g key={s._id} onClick={() => onSelect({ kind: "section", section: s })} style={{ cursor: "pointer" }} role="button" aria-label={s.name}>
              <title>{`${s.name} · ${fmtDistance(s.sectionLength)} · ${s.total} subsections · restoration ${restorationOf(s.restorationStatus).label}`}</title>
              <path d={`M ${p.x} ${p.y} Q ${cx} ${cy} ${q.x} ${q.y}`} stroke="transparent" strokeWidth={16} fill="none" />
              <path d={`M ${p.x} ${p.y} Q ${cx} ${cy} ${q.x} ${q.y}`} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" />
            </g>
          ))}
          {curves.map(({ s, mx, my, lx, ly, color }) => (
            <g key={`label-${s._id}`} onClick={() => onSelect({ kind: "section", section: s })} style={{ cursor: "pointer" }} role="button" aria-label={s.name}>
              <title>{`${s.name} · ${fmtDistance(s.sectionLength)}`}</title>
              {(lx !== mx || ly !== my) && <line x1={mx} y1={my} x2={lx} y2={ly} stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />}
              {(lx !== mx || ly !== my) && <circle cx={mx} cy={my} r={3} fill={color} />}
              <rect x={lx - LABEL_W / 2} y={ly - 27} width={LABEL_W} height={46} rx={5} fill="#fff" stroke={lx !== mx || ly !== my ? color : "#e2e8f0"} />
              <text x={lx} y={ly - 12} textAnchor="middle" fontSize={10} fill="#0f172a" fontWeight={600}>
                {shorten(s.name || "Section", 26)}
              </text>
              <text x={lx} y={ly + 15} textAnchor="middle" fontSize={9.5} fill="#475569">
                {s.sectionLength > 0 ? fmtDistance(s.sectionLength) : "length not set"} · {s.total} {s.total === 1 ? "subsection" : "subsections"}
              </text>
              <MiniBar counts={s.counts} cx={lx} cy={ly + 2} />
            </g>
          ))}

          {graph.nodes
            .filter((node) => graph.pos.has(node.key))
            .map((node) => {
              const p = graph.pos.get(node.key);
              return <NodeShape key={node.key} node={node} x={p.x} y={p.y} infra={infraFor(node)} onClick={() => onSelect({ kind: "node", node })} />;
            })}
        </Box>
      </Box>
      {graph.unplaced.length > 0 && (
        <Typography variant="caption" sx={{ color: "warning.dark", display: "block", mt: 0.75 }}>
          {graph.unplaced.length} {graph.unplaced.length === 1 ? "section isn't" : "sections aren't"} drawn: an end isn&apos;t one of this block&apos;s BHQ or GPs.
        </Typography>
      )}
    </Box>
  );
};

const Item = ({ swatch, label }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
    {swatch}
    <Typography variant="caption">{label}</Typography>
  </Box>
);

/** Legend under the topology diagram */
export const TopologyLegend = () => {
  const { restorationOf } = useExecutionConfig();
  return (
    <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: "wrap", mt: 1.5 }}>
      <Item swatch={<Box sx={{ width: 18, height: 12, borderRadius: 0.5, bgcolor: BHQ_COLOR }} />} label="Block HQ" />
      <Item swatch={<Box sx={{ width: 18, height: 12, borderRadius: 0.5, bgcolor: GP_COLOR }} />} label="GP" />
      <Item swatch={<Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#16a34a" }} />} label="Infra captured (– not yet)" />
      <Item swatch={<Box sx={{ width: 18, height: 12, borderRadius: 0.5, border: "2px dashed #f59e0b" }} />} label="No coordinates" />
      {Object.entries(RESTORATION_COLORS).map(([k, color]) => (
        <Item key={k} swatch={<Box sx={{ width: 22, height: 0, borderTop: `4px solid ${color}` }} />} label={`Section · ${restorationOf(k).label}`} />
      ))}
      <Item swatch={<Box sx={{ display: "flex", height: 6, width: 26 }}>{BAR_ORDER.map((k) => <Box key={k} sx={{ flex: 1, bgcolor: STATUS_COLORS[k] }} />)}</Box>} label="Subsections by status" />
    </Stack>
  );
};

export default TopologyDiagram;
