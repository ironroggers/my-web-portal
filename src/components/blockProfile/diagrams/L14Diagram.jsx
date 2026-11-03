import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Card,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtDistance } from "../../../utils/executionFormat";
import StatusPill from "../../common/StatusPill";
import { MEDIA_KIND, STATUS_COLORS } from "../blockMapLayers";
import { nodeTitle, fmtChainage, sectionModel, stackRows, subsectionSpans, tickStep } from "./diagramGeometry";

// L14: one section as a straight line from its start node to its end node, with chainage in
// metres. Each kind of data has its own lane: attachments, the route (ducting and blowing
// spans with their pits), crossings, other work, and the chainage axis. Zooming re-lays the
// strip out at the new width, so text stays the same size and crowded data spreads apart.

const TYPE_COLORS = { HDD: "#0284c7", OT: "#a16207", CLAMP: "#475569", BLOWING: "#0d9488", LEGACY: "#92400e" };
const POINT_WORK = {
  CHAMBER: { color: "#7c3aed", shape: "square" },
  SPLICING: { color: "#ea580c", shape: "circle" },
  ROUTE_MARKER: { color: "#db2777", shape: "triangle" },
};
const TONES = { neutral: "default", info: "info", warning: "warning", success: "success", error: "error" };

const LABEL_W = { xs: 84, sm: 112 };
const PAD = 32;
const MIN_ZOOM = 1;
const MAX_ZOOM = 32;
const ZOOM_STEP = 1.5;
const ROW_H = 54;
const BAR_H = 20;
const CLUSTER_PX = 28;
const LANE = { media: 48, cross: 58, other: 44, axis: 62 };

const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
const lengthLabel = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
const shorten = (text, max) => (String(text).length > max ? `${String(text).slice(0, max - 1)}…` : String(text));

const Symbol = ({ shape, x, y, size = 6, color, ...rest }) => {
  if (shape === "square") return <rect x={x - size} y={y - size} width={size * 2} height={size * 2} fill={color} stroke="#fff" strokeWidth={1.5} {...rest} />;
  if (shape === "triangle")
    return <polygon points={`${x},${y - size - 1} ${x + size + 1},${y + size} ${x - size - 1},${y + size}`} fill={color} stroke="#fff" strokeWidth={1.5} {...rest} />;
  if (shape === "diamond")
    return <polygon points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`} fill={color} stroke="#fff" strokeWidth={1.5} {...rest} />;
  return <circle cx={x} cy={y} r={size} fill={color} stroke="#fff" strokeWidth={1.5} {...rest} />;
};

// Items to place along the strip, each in the first row with room, up to `max` rows; the rest are dropped
const placeInRows = (items, gap, max) => {
  const ends = [];
  return items.flatMap((item) => {
    let row = ends.findIndex((end) => item.px - end >= gap);
    if (row === -1) {
      if (ends.length >= max) return [];
      row = ends.length;
    }
    ends[row] = item.px;
    return [{ ...item, row }];
  });
};

const NodeChip = ({ node, infra, align, onClick }) => (
  <ButtonBase
    onClick={onClick}
    aria-label={`${node.type} ${node.name}`}
    sx={{ display: "block", textAlign: align, px: 1.25, py: 0.5, borderRadius: 1, bgcolor: node.type === "ROUTER" ? "#1e3a8a" : node.type === "BJC" ? "#c2410c" : "#7c3aed", color: "#fff", minWidth: 0, maxWidth: "48%" }}
  >
    <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
      {nodeTitle(node)}
    </Typography>
    <Typography variant="caption" noWrap component="div" sx={{ opacity: 0.85 }}>
      {[node.type, node.code, infra ? "infra captured" : ""].filter(Boolean).join(" · ")}
    </Typography>
  </ButtonBase>
);

const L14Diagram = ({ section, subsections, media, nodeInfo, onSelect }) => {
  const { typeOf, isDucting, statusOf } = useExecutionConfig();
  const viewportRef = useRef(null);
  const anchorRef = useRef(null);
  const dragRef = useRef(null);
  const [viewW, setViewW] = useState(800);
  const [zoom, setZoom] = useState(1);

  const layout = useMemo(() => {
    const model = sectionModel(section, subsections);
    const spans = subsectionSpans(model, subsections);
    const routeKey = (s) => (s.sub.legacy || isDucting(s.sub.typeOfWork) || s.sub.typeOfWork === "BLOWING" ? "route" : "point");
    const routeSpans = stackRows(spans.filter((s) => routeKey(s) === "route"));
    // Points for other work: each entry where it was recorded, else the span's middle
    const points = spans
      .filter((s) => routeKey(s) === "point")
      .flatMap((span) => {
        const at = span.sub.entries.map((e) => model.chainageOf(e)).filter((c) => c !== null);
        return (at.length ? at : [(span.start + span.end) / 2]).map((chainage, i) => ({ span, chainage, i }));
      });
    const placed = media
      .map((m) => ({ m, chainage: model.chainageOf(m) ?? (spans.find((s) => s.sub._id === m.subSectionId)?.start || 0) }))
      .sort((a, b) => a.chainage - b.chainage);
    return { model, spans, routeSpans, points, placed };
  }, [section, subsections, media, isDucting]);
  const { model, spans, routeSpans, points, placed } = layout;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setViewW(el.clientWidth || 800));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ---- zoom: `ratio` of the strip stays under `offset` px of the viewport
  const trackW = Math.round(viewW * zoom);
  const zoomTo = (next, offset = viewW / 2) => {
    const el = viewportRef.current;
    const target = clampZoom(next);
    if (!el || target === zoom) return;
    anchorRef.current = { ratio: (el.scrollLeft + offset) / trackW, offset };
    setZoom(target);
  };
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (el && anchorRef.current) {
      el.scrollLeft = anchorRef.current.ratio * trackW - anchorRef.current.offset;
      anchorRef.current = null;
    }
  }, [trackW]);

  // Ctrl or Cmd + wheel, and trackpad pinch, zoom at the pointer; a plain wheel scrolls the page
  const zoomToRef = useRef(zoomTo);
  zoomToRef.current = zoomTo;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomToRef.current(zoomRef.current * Math.exp(-e.deltaY * 0.01), e.clientX - el.getBoundingClientRect().left);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Drag to pan; a drag doesn't count as a click on what it started on
  const onPointerDown = (e) => {
    if (e.button === 0 && zoom > 1) dragRef.current = { x: e.clientX, left: viewportRef.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    if (drag.moved) viewportRef.current.scrollLeft = drag.left - dx;
  };
  const endDrag = () => {
    const moved = dragRef.current?.moved;
    dragRef.current = null;
    if (moved) dragRef.moved = true;
  };
  const onClickCapture = (e) => {
    if (dragRef.moved) {
      dragRef.moved = false;
      e.stopPropagation();
    }
  };

  // ---- geometry at this zoom
  const inner = trackW - PAD * 2;
  const x = (ch) => PAD + (Math.min(Math.max(ch, 0), model.length) / model.length) * inner;
  const rows = Math.max(1, ...routeSpans.map((s) => s.row + 1));
  const crossings = routeSpans.filter((s) => s.sub.crossing);
  const lanes = [
    { key: "media", label: "Attachments", h: LANE.media },
    { key: "route", label: "Route", h: rows * ROW_H + 8 },
    ...(crossings.length ? [{ key: "cross", label: "Crossings", h: LANE.cross }] : []),
    ...(points.length ? [{ key: "other", label: "Other work", h: LANE.other }] : []),
    { key: "axis", label: "Chainage", h: LANE.axis },
  ];
  let top = 0;
  const laneAt = {};
  lanes.forEach((l) => {
    laneAt[l.key] = { y: top, h: l.h, mid: top + l.h / 2 };
    top += l.h;
  });
  const H = top;

  const step = tickStep(model.length, Math.max(4, Math.floor(trackW / 90)));
  const ticks = [];
  for (let c = 0; c <= model.length + 0.001; c += step) ticks.push(c);

  // Attachments near each other at this zoom share a bubble
  const clusters = [];
  placed.forEach(({ m, chainage }) => {
    const last = clusters[clusters.length - 1];
    if (last && x(chainage) - x(last.start) < CLUSTER_PX) {
      last.items.push(m);
      last.end = chainage;
    } else clusters.push({ start: chainage, end: chainage, items: [m] });
  });

  // Chainage of each subsection joint, under the round ticks
  const joints = placeInRows(
    [...new Set([0, model.length, ...routeSpans.flatMap((s) => [s.start, s.end])].map((c) => Math.round(Math.min(Math.max(c, 0), model.length))))]
      .sort((a, b) => a - b)
      .map((c) => ({ c, px: x(c) })),
    46,
    1
  );
  const crossLabels = placeInRows(
    [...crossings].map((s) => ({ s, px: x((s.start + s.end) / 2) })).sort((a, b) => a.px - b.px),
    112,
    2
  );

  const subMedia = (sub) => media.filter((m) => m.subSectionId === sub._id);
  const selectSub = (sub) => onSelect({ kind: "sub", sub, span: spans.find((s) => s.sub._id === sub._id), media: subMedia(sub) });
  const typeColor = (sub) => (sub.legacy ? TYPE_COLORS.LEGACY : TYPE_COLORS[sub.typeOfWork] || "#64748b");

  // A table row brings its span into view
  const showSpan = (span) => {
    selectSub(span.sub);
    const el = viewportRef.current;
    if (el) el.scrollTo({ left: (x(span.start) + x(span.end)) / 2 - viewW / 2, behavior: "smooth" });
  };

  const button = (title, icon, onClick, disabled) => (
    <Tooltip title={title}>
      <span>
        <IconButton size="small" onClick={onClick} disabled={disabled} aria-label={title}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Box>
      <Card>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, p: 1.25, borderBottom: 1, borderColor: "divider" }}>
          {section.fromNode ? (
            <NodeChip node={section.fromNode} infra={nodeInfo(section.fromNode)?.infra} align="left" onClick={() => onSelect({ kind: "node", node: section.fromNode })} />
          ) : (
            <Box />
          )}
          {section.toNode && <NodeChip node={section.toNode} infra={nodeInfo(section.toNode)?.infra} align="right" onClick={() => onSelect({ kind: "node", node: section.toNode })} />}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.5, borderBottom: 1, borderColor: "divider" }}>
          {button("Zoom out", <RemoveIcon fontSize="small" />, () => zoomTo(zoom / ZOOM_STEP), zoom <= MIN_ZOOM)}
          <Typography variant="body2" sx={{ minWidth: 48, textAlign: "center", fontVariantNumeric: "tabular-nums" }} aria-live="polite">
            {Math.round(zoom * 100)}%
          </Typography>
          {button("Zoom in", <AddIcon fontSize="small" />, () => zoomTo(zoom * ZOOM_STEP), zoom >= MAX_ZOOM)}
          <Button size="small" startIcon={<FitScreenIcon />} onClick={() => zoomTo(1)} disabled={zoom === 1}>
            Fit
          </Button>
          <Typography variant="caption" sx={{ color: "text.secondary", ml: "auto", display: { xs: "none", md: "block" } }}>
            Ctrl or ⌘ + scroll, or pinch, to zoom · drag to move along the route
          </Typography>
        </Box>
        <Box sx={{ display: "flex" }}>
          <Box sx={{ width: LABEL_W, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
            {lanes.map((l, i) => (
              <Box key={l.key} sx={{ height: l.h, display: "flex", alignItems: "center", px: 1.25, bgcolor: i % 2 ? "transparent" : "action.hover", borderBottom: i < lanes.length - 1 ? 1 : 0, borderColor: "divider", boxSizing: "border-box" }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                  {l.label}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onClickCapture={onClickCapture}
            sx={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden", cursor: zoom > 1 ? "grab" : "default", touchAction: "pan-x pan-y", userSelect: "none" }}
          >
            <svg width={trackW} height={H} style={{ display: "block", fontFamily: "inherit" }} role="img" aria-label={`Chainage of ${section.name}`}>
              {/* lanes */}
              {lanes.map((l, i) => (
                <g key={l.key}>
                  {i % 2 === 0 && <rect x={0} y={laneAt[l.key].y} width={trackW} height={l.h} fill="#64748b" fillOpacity={0.05} />}
                  {i < lanes.length - 1 && <line x1={0} x2={trackW} y1={laneAt[l.key].y + l.h - 0.5} y2={laneAt[l.key].y + l.h - 0.5} stroke="#e2e8f0" />}
                </g>
              ))}

              {/* round distances through every lane */}
              {ticks.map((c) => (
                <line key={`g${c}`} x1={x(c)} x2={x(c)} y1={0} y2={laneAt.axis.y} stroke="#e2e8f0" strokeDasharray="2 4" />
              ))}

              {/* attachments */}
              {clusters.map((g) => {
                const n = g.items.length;
                const cx = x((g.start + g.end) / 2);
                const color = MEDIA_KIND[g.items[0].kind]?.color || "#334155";
                const label = `${n} ${n === 1 ? "attachment" : "attachments"} near ${fmtChainage(g.start)}`;
                return (
                  <g key={g.start} onClick={() => onSelect({ kind: "media", items: g.items, title: label })} style={{ cursor: "pointer" }} role="button" aria-label={label}>
                    <title>{label}</title>
                    <circle cx={cx} cy={laneAt.media.mid} r={n > 1 ? 11 : 7} fill={color} stroke="#fff" strokeWidth={1.5} />
                    {n > 1 && (
                      <text x={cx} y={laneAt.media.mid + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">
                        {n}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* route line, one for each row of spans */}
              {Array.from({ length: rows }, (_, row) => {
                const y = laneAt.route.y + 22 + row * ROW_H;
                return <line key={row} x1={x(0)} x2={x(model.length)} y1={y} y2={y} stroke="#cbd5e1" strokeWidth={2} />;
              })}

              {/* ducting and blowing spans */}
              {routeSpans.map((s) => {
                const sub = s.sub;
                const y = laneAt.route.y + 22 + s.row * ROW_H;
                const x1 = x(s.start);
                const w = Math.max(4, x(s.end) - x1);
                const status = sub.legacy ? null : statusOf(sub.executionStatus);
                const code = typeOf(sub.typeOfWork)?.code || "TR";
                const length = lengthLabel(s.end - s.start);
                // As much as fits: name and length, then the type and length, then the type
                const label = [`${sub.name} · ${length}`, `${code} · ${length}`, code].find((t) => t.length * 6.2 + 14 < w);
                return (
                  <g key={sub._id} onClick={() => selectSub(sub)} style={{ cursor: "pointer" }} role="button" aria-label={sub.name}>
                    <title>{`${sub.name} · ${typeOf(sub.typeOfWork)?.label || "Trenching"} · ${fmtChainage(s.start)} – ${fmtChainage(s.end)} · ${length}${status ? ` · ${status.label}` : ""}`}</title>
                    <rect
                      x={x1 + 0.75}
                      y={y - BAR_H / 2}
                      width={Math.max(3, w - 1.5)}
                      height={BAR_H}
                      rx={3}
                      fill={typeColor(sub)}
                      fillOpacity={sub.typeOfWork === "BLOWING" ? 0.6 : 0.92}
                      stroke={s.approx ? "#f59e0b" : "none"}
                      strokeDasharray={s.approx ? "4 2" : undefined}
                      strokeWidth={s.approx ? 1.5 : 0}
                    />
                    {label && (
                      <text x={x1 + w / 2} y={y + 3.5} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#fff">
                        {label}
                      </text>
                    )}
                    {status && <circle cx={x1 + w - 7} cy={y - BAR_H / 2} r={4} fill={STATUS_COLORS[sub.executionStatus] || "#64748b"} stroke="#fff" strokeWidth={1.25} />}
                    {[
                      [sub.start, "A", "#15803d"],
                      [sub.end, "B", "#b91c1c"],
                    ].map(([pit, letter, color]) => {
                      const c = pit ? model.chainageOf(pit) : null;
                      if (c === null) return null;
                      return (
                        <g key={letter}>
                          <circle cx={x(c)} cy={y + BAR_H / 2 + 9} r={6.5} fill={color} stroke="#fff" strokeWidth={1.5} />
                          <text x={x(c)} y={y + BAR_H / 2 + 12} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#fff">
                            {letter}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* crossings */}
              {crossings.length > 0 &&
                crossings.map((s) => {
                  const cx = x((s.start + s.end) / 2);
                  const y = laneAt.cross.y + 13;
                  return (
                    <g key={s.sub._id} onClick={() => selectSub(s.sub)} style={{ cursor: "pointer" }} role="button" aria-label={`Crossing ${s.sub.crossing}`}>
                      <title>{`${s.sub.crossing} · ${s.sub.name} · ${fmtChainage((s.start + s.end) / 2)}`}</title>
                      <Symbol shape="diamond" x={cx} y={y} size={6} color="#0f172a" />
                    </g>
                  );
                })}
              {crossLabels.map(({ s, px, row }) => (
                <text key={s.sub._id} x={px} y={laneAt.cross.y + 32 + row * 13} textAnchor="middle" fontSize={10} fill="#334155" style={{ pointerEvents: "none" }}>
                  {shorten(s.sub.crossing, 20)}
                </text>
              ))}

              {/* other work */}
              {points.length > 0 &&
                points.map(({ span, chainage, i }) => {
                  const kind = POINT_WORK[span.sub.typeOfWork] || { color: "#64748b", shape: "circle" };
                  return (
                    <g key={`${span.sub._id}-${i}`} onClick={() => selectSub(span.sub)} style={{ cursor: "pointer" }} role="button" aria-label={span.sub.name}>
                      <title>{`${span.sub.name} · ${typeOf(span.sub.typeOfWork)?.label} · ${fmtChainage(chainage)}`}</title>
                      <Symbol shape={kind.shape} x={x(chainage)} y={laneAt.other.mid} size={7} color={kind.color} />
                    </g>
                  );
                })}

              {/* chainage axis: round distances, and each subsection joint below */}
              <line x1={x(0)} x2={x(model.length)} y1={laneAt.axis.y + 10} y2={laneAt.axis.y + 10} stroke="#475569" />
              {ticks.map((c) => (
                <g key={`t${c}`}>
                  <line x1={x(c)} x2={x(c)} y1={laneAt.axis.y + 10} y2={laneAt.axis.y + 15} stroke="#475569" />
                  <text x={x(c)} y={laneAt.axis.y + 27} textAnchor="middle" fontSize={10} fill="#64748b">
                    {fmtChainage(c)}
                  </text>
                </g>
              ))}
              {joints.map(({ c, px }) => (
                <g key={`j${c}`}>
                  <line x1={px} x2={px} y1={laneAt.axis.y + 6} y2={laneAt.axis.y + 10} stroke="#1e293b" strokeWidth={1.5} />
                  <text x={px} y={laneAt.axis.y + 47} textAnchor="middle" fontSize={10} fontWeight={600} fill="#1e293b">
                    {fmtChainage(c)}
                  </text>
                </g>
              ))}
            </svg>
          </Box>
        </Box>
      </Card>

      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75 }}>
        {fmtDistance(model.length)} · chainage in km+m from {section.fromName || "the start"}. Grey figures are round distances, dark ones where a subsection starts or ends.
        {model.geo ? " Placed by projecting GPS positions onto the straight line between the two ends." : " The ends have no coordinates, so subsections are laid end to end in their order."}
        {spans.some((s) => s.approx) && " Spans with an amber outline have no From/To and are placed after the previous one."}
      </Typography>

      {spans.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 720 }} aria-label="Subsections by chainage">
              <TableHead>
                <TableRow>
                  <TableCell>Subsection</TableCell>
                  <TableCell>Work</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell align="right">Length</TableCell>
                  <TableCell>Crossing</TableCell>
                  <TableCell align="right">Attachments</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {spans.map((s) => {
                  const status = s.sub.legacy ? null : statusOf(s.sub.executionStatus);
                  return (
                    <TableRow key={s.sub._id} hover onClick={() => showSpan(s)} sx={{ cursor: "pointer" }}>
                      <TableCell sx={{ fontWeight: 600 }}>{s.sub.name}</TableCell>
                      <TableCell>{typeOf(s.sub.typeOfWork)?.label || "Older trenching"}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{fmtChainage(s.start)}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{fmtChainage(s.end)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {lengthLabel(s.end - s.start)}
                      </TableCell>
                      <TableCell>{s.sub.crossing || "—"}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {subMedia(s.sub).length}
                      </TableCell>
                      <TableCell>{status ? <StatusPill label={status.label} tone={TONES[status.tone] || "default"} /> : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
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
      <Item swatch={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_COLORS.IN_PROGRESS }} />} label="Dot on a span: status (as on the map)" />
    </Stack>
  );
};

export default L14Diagram;
