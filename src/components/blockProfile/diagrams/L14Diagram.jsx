import React, { useMemo } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtDistance } from "../../../utils/executionFormat";
import { MEDIA_KIND, STATUS_COLORS } from "../blockMapLayers";
import { fmtChainage, sectionModel, stackRows, subsectionSpans, tickStep } from "./diagramGeometry";

// L14: one section as a straight line from its start node to its end node, with
// chainage in metres. Ducting subsections are coloured spans on the route (by method),
// with their pits; other work sits in its own lane; geotagged attachments above.

const TYPE_COLORS = { HDD: "#0284c7", OT: "#a16207", CLAMP: "#475569", BLOWING: "#0d9488", LEGACY: "#92400e" };
const POINT_WORK = {
  CHAMBER: { color: "#7c3aed", shape: "square" },
  SPLICING: { color: "#ea580c", shape: "circle" },
  ROUTE_MARKER: { color: "#db2777", shape: "triangle" },
};

const VB_W = 1000;
const LEFT = 130;
const RIGHT = 130;
const ROW_H = 26;
const BAR_H = 14;

const Symbol = ({ shape, x, y, size = 6, color, ...rest }) => {
  if (shape === "square") return <rect x={x - size} y={y - size} width={size * 2} height={size * 2} fill={color} stroke="#fff" strokeWidth={1.5} {...rest} />;
  if (shape === "triangle")
    return <polygon points={`${x},${y - size - 1} ${x + size + 1},${y + size} ${x - size - 1},${y + size}`} fill={color} stroke="#fff" strokeWidth={1.5} {...rest} />;
  if (shape === "diamond")
    return <polygon points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`} fill={color} stroke="#fff" strokeWidth={1.5} {...rest} />;
  return <circle cx={x} cy={y} r={size} fill={color} stroke="#fff" strokeWidth={1.5} {...rest} />;
};

const shorten = (text, max) => (String(text).length > max ? `${String(text).slice(0, max - 1)}…` : String(text));

const NodeBox = ({ x, y, align, node, infra, onClick }) => {
  const w = 112;
  const left = align === "left" ? x - w - 8 : x + 8;
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }} role="button" aria-label={`${node.type} ${node.name}`}>
      <title>{`${node.type === "ROUTER" ? "Block router" : "GP"}: ${node.name}`}</title>
      <rect x={left} y={y - 22} width={w} height={44} rx={6} fill={node.type === "ROUTER" ? "#1e3a8a" : "#7c3aed"} />
      <text x={left + w / 2} y={y - 5} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>
        {shorten(node.name || node.code || "", 17)}
      </text>
      <text x={left + w / 2} y={y + 11} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={9.5}>
        {node.type} {node.code}
      </text>
      {infra && (
        <g>
          <circle cx={left + w - 2} cy={y - 20} r={7} fill="#16a34a" stroke="#fff" strokeWidth={1.5} />
          <path d={`M ${left + w - 5.5} ${y - 20} l 2.5 2.5 l 4.5 -5`} stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

const L14Diagram = ({ section, subsections, media, nodeInfo, onSelect }) => {
  const { typeOf, isDucting, statusOf } = useExecutionConfig();

  const layout = useMemo(() => {
    const model = sectionModel(section, subsections);
    const spans = subsectionSpans(model, subsections);
    const routeKey = (s) => (s.sub.legacy || isDucting(s.sub.typeOfWork) || s.sub.typeOfWork === "BLOWING" ? "route" : "point");
    const routeSpans = stackRows(spans.filter((s) => routeKey(s) === "route"));
    const pointSpans = spans.filter((s) => routeKey(s) === "point");
    // Points for other work: each entry where it was recorded, else the span's middle
    const points = pointSpans.flatMap((span) => {
      const at = span.sub.entries.map((e) => model.chainageOf(e)).filter((c) => c !== null);
      return (at.length ? at : [(span.start + span.end) / 2]).map((chainage, i) => ({ span, chainage, i }));
    });
    // Attachments grouped every ~1.5% of the section
    const bucket = Math.max(1, model.length / 66);
    const groups = new Map();
    for (const m of media) {
      const c = model.chainageOf(m) ?? (spans.find((s) => s.sub._id === m.subSectionId)?.start || 0);
      const k = Math.round(c / bucket);
      if (!groups.has(k)) groups.set(k, { chainage: k * bucket, items: [] });
      groups.get(k).items.push(m);
    }
    return { model, spans, routeSpans, points, mediaGroups: [...groups.values()] };
  }, [section, subsections, media, isDucting]);

  const { model, routeSpans, points, mediaGroups } = layout;
  const x = (ch) => LEFT + (Math.min(Math.max(ch, 0), model.length) / model.length) * (VB_W - LEFT - RIGHT);
  const rows = Math.max(1, ...routeSpans.map((s) => s.row + 1));
  const MEDIA_Y = 34;
  const LINE_Y = 96;
  const CROSS_Y = LINE_Y + (rows - 1) * ROW_H + 30;
  const OTHER_Y = CROSS_Y + 40;
  const AXIS_Y = OTHER_Y + 46;
  // Small unlabelled ticks at round distances
  const step = tickStep(model.length);
  const ticks = [];
  for (let c = 0; c <= model.length + 0.001; c += step) ticks.push(c);

  // Labelled marks where a subsection starts or ends (and the two ends of the section)
  const boundaries = [0, model.length, ...routeSpans.flatMap((s) => [s.start, s.end])]
    .map((c) => Math.min(Math.max(c, 0), model.length))
    .sort((a, b) => a - b)
    .filter((c, i, all) => i === 0 || c - all[i - 1] > 0.5);
  // Labels too close to the previous one in a row move down a row
  const LABEL_GAP = 50;
  const rowEnds = [];
  const marks = boundaries.map((c) => {
    const px = LEFT + (c / model.length) * (VB_W - LEFT - RIGHT);
    let row = rowEnds.findIndex((end) => px - end >= LABEL_GAP);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = px;
    return { c, row };
  });
  const labelRows = Math.max(1, ...marks.map((m) => m.row + 1));
  const H = AXIS_Y + 22 + labelRows * 12 + 8;

  const spanOf = (sub) => layout.spans.find((s) => s.sub._id === sub._id);
  const subMedia = (sub) => media.filter((m) => m.subSectionId === sub._id);
  const selectSub = (sub) => onSelect({ kind: "sub", sub, span: spanOf(sub), media: subMedia(sub) });
  const typeColor = (sub) => (sub.legacy ? TYPE_COLORS.LEGACY : TYPE_COLORS[sub.typeOfWork] || "#64748b");

  return (
    <Box>
      <Card sx={{ overflowX: "auto" }}>
        <Box component="svg" viewBox={`0 0 ${VB_W} ${H}`} sx={{ display: "block", width: "100%", minWidth: 880, fontFamily: "inherit" }} role="img" aria-label={`L14 diagram of ${section.name}`}>
          {/* lane labels */}
          {[
            [MEDIA_Y, "Attachments"],
            [CROSS_Y, "Crossings"],
            [OTHER_Y, "Other work"],
          ].map(([y, label]) => (
            <text key={label} x={8} y={y + 4} fontSize={10} fill="#64748b" fontWeight={600}>
              {label}
            </text>
          ))}
          {[MEDIA_Y, CROSS_Y, OTHER_Y].map((y) => (
            <line key={y} x1={x(0)} x2={x(model.length)} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />
          ))}

          {/* route line between the two nodes */}
          <line x1={x(0)} x2={x(model.length)} y1={LINE_Y} y2={LINE_Y} stroke="#94a3b8" strokeWidth={3} />

          {/* ducting and blowing spans */}
          {routeSpans.map((s) => {
            const sub = s.sub;
            const y = LINE_Y + s.row * ROW_H;
            const x1 = x(s.start);
            const w = Math.max(3, x(s.end) - x1);
            const status = sub.legacy ? null : statusOf(sub.executionStatus);
            const label = typeOf(sub.typeOfWork)?.code || "TR";
            return (
              <g key={sub._id} onClick={() => selectSub(sub)} style={{ cursor: "pointer" }} role="button" aria-label={sub.name}>
                <title>{`${sub.name} · ${typeOf(sub.typeOfWork)?.label || "Trenching"} · ${fmtChainage(s.start)} – ${fmtChainage(s.end)}${status ? ` · ${status.label}` : ""}`}</title>
                {s.row > 0 && <line x1={x1} x2={x1} y1={LINE_Y} y2={y} stroke="#cbd5e1" strokeDasharray="2 2" />}
                <rect
                  x={x1}
                  y={y - BAR_H / 2}
                  width={w}
                  height={BAR_H}
                  rx={3}
                  fill={typeColor(sub)}
                  fillOpacity={sub.typeOfWork === "BLOWING" ? 0.55 : 0.9}
                  stroke={s.approx ? "#f59e0b" : "none"}
                  strokeDasharray={s.approx ? "4 2" : undefined}
                  strokeWidth={s.approx ? 1.5 : 0}
                />
                {w > label.length * 7 + 6 && (
                  <text x={x1 + w / 2} y={y + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#fff">
                    {label}
                  </text>
                )}
                {status && <circle cx={x1 + w / 2} cy={y - BAR_H / 2 - 5} r={3.5} fill={STATUS_COLORS[sub.executionStatus] || "#64748b"} />}
                {/* pits */}
                {[
                  [sub.start, "A", "#15803d"],
                  [sub.end, "B", "#b91c1c"],
                ].map(([pit, letter, color]) => {
                  const c = pit ? model.chainageOf(pit) : null;
                  if (c === null) return null;
                  return (
                    <g key={letter}>
                      <circle cx={x(c)} cy={y + BAR_H / 2 + 7} r={6} fill={color} stroke="#fff" strokeWidth={1.5} />
                      <text x={x(c)} y={y + BAR_H / 2 + 10.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fff">
                        {letter}
                      </text>
                    </g>
                  );
                })}
                {/* crossing under the span */}
                {sub.crossing && (
                  <g>
                    <Symbol shape="diamond" x={x1 + w / 2} y={CROSS_Y} size={6} color="#0f172a" />
                    <text x={x1 + w / 2} y={CROSS_Y + 18} textAnchor="middle" fontSize={9} fill="#334155">
                      {sub.crossing}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* other work as symbols */}
          {points.map(({ span, chainage, i }) => {
            const kind = POINT_WORK[span.sub.typeOfWork] || { color: "#64748b", shape: "circle" };
            return (
              <g key={`${span.sub._id}-${i}`} onClick={() => selectSub(span.sub)} style={{ cursor: "pointer" }} role="button" aria-label={span.sub.name}>
                <title>{`${span.sub.name} · ${typeOf(span.sub.typeOfWork)?.label} · ${fmtChainage(chainage)}`}</title>
                <Symbol shape={kind.shape} x={x(chainage)} y={OTHER_Y} size={6} color={kind.color} />
              </g>
            );
          })}

          {/* attachments */}
          {mediaGroups.map((g) => {
            const color = MEDIA_KIND[g.items[0].kind]?.color || "#334155";
            const n = g.items.length;
            return (
              <g
                key={g.chainage}
                onClick={() => onSelect({ kind: "media", items: g.items, title: `${n} ${n === 1 ? "attachment" : "attachments"} near ${fmtChainage(g.chainage)}` })}
                style={{ cursor: "pointer" }}
                role="button"
                aria-label={`${n} attachments`}
              >
                <title>{`${n} ${n === 1 ? "attachment" : "attachments"} · ${fmtChainage(g.chainage)}`}</title>
                <circle cx={x(g.chainage)} cy={MEDIA_Y} r={n > 1 ? 9 : 6} fill={color} stroke="#fff" strokeWidth={1.5} />
                {n > 1 && (
                  <text x={x(g.chainage)} y={MEDIA_Y + 3.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">
                    {n}
                  </text>
                )}
              </g>
            );
          })}

          {/* chainage axis: a mark at every change of subsection */}
          <line x1={x(0)} x2={x(model.length)} y1={AXIS_Y} y2={AXIS_Y} stroke="#475569" />
          {ticks.map((c) => (
            <line key={`t${c}`} x1={x(c)} x2={x(c)} y1={AXIS_Y} y2={AXIS_Y + 3} stroke="#94a3b8" />
          ))}
          {marks.map(({ c }) => (
            <line key={`g${c}`} x1={x(c)} x2={x(c)} y1={LINE_Y + BAR_H / 2} y2={AXIS_Y} stroke="#cbd5e1" strokeDasharray="2 3" />
          ))}
          {marks.slice(1).map(({ c }, i) => {
            const prev = marks[i].c;
            const w = x(c) - x(prev);
            const len = c - prev;
            return w > 34 ? (
              <text key={`len${c}`} x={(x(prev) + x(c)) / 2} y={AXIS_Y - 5} textAnchor="middle" fontSize={9} fill="#64748b">
                {len >= 1000 ? `${(len / 1000).toFixed(2)} km` : `${Math.round(len)} m`}
              </text>
            ) : null;
          })}
          {marks.map(({ c, row }) => (
            <g key={`m${c}`}>
              <line x1={x(c)} x2={x(c)} y1={AXIS_Y - 4} y2={AXIS_Y + 6 + row * 12} stroke="#334155" strokeWidth={1.2} />
              <text x={x(c)} y={AXIS_Y + 17 + row * 12} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#1e293b">
                {fmtChainage(c)}
              </text>
            </g>
          ))}

          {/* end nodes */}
          {section.fromNode && (
            <NodeBox x={x(0)} y={LINE_Y} align="left" node={section.fromNode} infra={nodeInfo(section.fromNode)?.infra} onClick={() => onSelect({ kind: "node", node: section.fromNode })} />
          )}
          {section.toNode && (
            <NodeBox x={x(model.length)} y={LINE_Y} align="right" node={section.toNode} infra={nodeInfo(section.toNode)?.infra} onClick={() => onSelect({ kind: "node", node: section.toNode })} />
          )}
        </Box>
      </Card>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75 }}>
        {fmtDistance(model.length)} · chainage in km+m from {section.fromName || "the start"}
        {model.geo ? ", placed by projecting GPS positions onto the straight line between the two ends." : ". The ends have no coordinates, so subsections are laid end to end in their order."}
        {layout.spans.some((s) => s.approx) && " Spans with an amber outline have no From/To and are placed after the previous one."}
      </Typography>
    </Box>
  );
};

const Item = ({ swatch, label }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
    {swatch}
    <Typography variant="caption">{label}</Typography>
  </Box>
);

/** Legend under the L14 diagram */
export const L14Legend = () => {
  const { typeOf } = useExecutionConfig();
  const bar = (color, opacity = 0.9) => <Box sx={{ width: 22, height: 10, borderRadius: 0.5, bgcolor: color, opacity }} />;
  const svg = (shape, color) => (
    <Box component="svg" viewBox="-8 -8 16 16" sx={{ width: 14, height: 14 }}>
      <Symbol shape={shape} x={0} y={0} size={6} color={color} />
    </Box>
  );
  return (
    <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: "wrap", mt: 1.5 }}>
      {["HDD", "OT", "CLAMP"].map((t) => (
        <Item key={t} swatch={bar(TYPE_COLORS[t])} label={typeOf(t)?.label || t} />
      ))}
      <Item swatch={bar(TYPE_COLORS.BLOWING, 0.55)} label={typeOf("BLOWING")?.label || "Blowing"} />
      <Item swatch={bar(TYPE_COLORS.LEGACY)} label="Older trenching" />
      {Object.entries(POINT_WORK).map(([t, k]) => (
        <Item key={t} swatch={svg(k.shape, k.color)} label={typeOf(t)?.label || t} />
      ))}
      <Item swatch={svg("circle", "#15803d")} label="A · start pit" />
      <Item swatch={svg("circle", "#b91c1c")} label="B · end pit" />
      <Item swatch={svg("diamond", "#0f172a")} label="Crossing" />
      <Item swatch={<Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#16a34a" }} />} label="Infra captured at the end node" />
      <Item swatch={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_COLORS.IN_PROGRESS }} />} label="Dot above a span: status (as on the map)" />
    </Stack>
  );
};

export default L14Diagram;
