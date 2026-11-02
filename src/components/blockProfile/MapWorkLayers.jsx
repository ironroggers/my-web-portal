import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { Marker, Polyline } from "@react-google-maps/api";
import { STAGE_LAYER, STATUS_COLORS, arrowIcons, beadIcons, subsectionLabel, subsectionPath, symbol } from "./blockMapLayers";
import { midpointOf } from "./roadPaths";

// Drawing shared by the block map (BlockMapPanel) and the master map (MasterMapBlockLayers):
// subsection labels and the section stage records (ducting, coupling, chamber, blowing,
// route marker), so a block looks the same on both.

const HIDDEN_ICON = () => ({ path: window.google.maps.SymbolPath.CIRCLE, scale: 0 });
const latLng = (p) => ({ lat: p.lat, lng: p.lng });

/** The subsection's name and length at the middle of its line, on a white halo */
export const SubsectionLabel = ({ subsection, path, onClick }) => {
  if (!path?.length) return null;
  return (
    <Marker
      position={midpointOf(path)}
      icon={HIDDEN_ICON()}
      label={{ text: subsectionLabel(subsection), className: "block-map-name", color: "#111827", fontSize: "11px", fontWeight: "700" }}
      zIndex={8}
      onClick={() => onClick(midpointOf(path))}
    />
  );
};

const statusColor = (r) => STATUS_COLORS[r.status] || STATUS_COLORS.IN_PROGRESS;

/**
 * A block's stage records. `visible` is the set of stages to draw, `statuses` the record
 * statuses to keep. Duct runs follow their subsection, blowing runs the KML road between
 * their two chambers (a straight line without one). Clicks call onPick(record, position).
 */
export const StageRecordLayers = ({ records, subsections, roads, visible, statuses, onPick }) => {
  const subById = useMemo(() => new Map((subsections || []).map((s) => [String(s._id), s])), [subsections]);
  const shown = (records || []).filter((r) => visible.has(r.stage) && statuses.has(r.status));
  const at = (e) => e.latLng.toJSON();

  return shown.map((r) => {
    const color = statusColor(r);
    const title = `${STAGE_LAYER[r.stage]?.label}: ${r.name}`;
    if (r.stage === "DUCTING") {
      const sub = subById.get(String(r.links?.subSection));
      const path = sub && subsectionPath(sub, roads);
      return path ? (
        <Polyline key={r._id} path={path} options={{ strokeOpacity: 0, icons: beadIcons(color), zIndex: 6 }} onClick={(e) => onPick(r, at(e))} />
      ) : null;
    }
    if (r.stage === "BLOWING") {
      if (!r.fromPoint || !r.toPoint) return null;
      const road = roads?.route(r.fromPoint, r.toPoint);
      const path = road ? [r.fromPoint, ...road, r.toPoint] : [r.fromPoint, r.toPoint];
      return (
        <Polyline
          key={r._id}
          path={path}
          options={{ strokeColor: color, strokeOpacity: 0.9, strokeWeight: 2, icons: arrowIcons(color), zIndex: 6 }}
          onClick={(e) => onPick(r, at(e))}
        />
      );
    }
    if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return null;
    const position = latLng(r);
    const chamber = r.stage === "CHAMBER";
    return (
      <Marker
        key={r._id}
        position={position}
        icon={symbol(STAGE_LAYER[r.stage].path, color)}
        label={chamber && r.type ? { text: r.type, color: "#ffffff", fontSize: "9px", fontWeight: "700" } : undefined}
        zIndex={chamber ? 13 : 12}
        title={title}
        onClick={() => onPick(r, position)}
      />
    );
  });
};

// ---- legend swatches

/** A stage's swatch: its line pattern or point shape */
export const StageSwatch = ({ stage, color = STATUS_COLORS.APPROVED }) => {
  const layer = STAGE_LAYER[stage];
  if (layer.shape === "beads") {
    return (
      <Box component="svg" viewBox="0 0 24 10" sx={{ width: 24, height: 10 }}>
        {[4, 12, 20].map((x) => (
          <circle key={x} cx={x} cy={5} r={3} fill={color} stroke="#fff" strokeWidth="1" />
        ))}
      </Box>
    );
  }
  if (layer.shape === "arrows") {
    return (
      <Box component="svg" viewBox="0 0 24 10" sx={{ width: 24, height: 10 }}>
        <line x1="0" y1="5" x2="24" y2="5" stroke={color} strokeWidth="2" />
        <path d="M 10 1 L 15 5 L 10 9" fill="none" stroke={color} strokeWidth="2" />
      </Box>
    );
  }
  return (
    <Box component="svg" viewBox="-12 -12 24 24" sx={{ width: 18, height: 18 }}>
      <path d={layer.path} fill={color} stroke="#fff" strokeWidth="2" />
    </Box>
  );
};

/** A subsection boundary: a dark tick across the line */
export const TickSwatch = ({ color = STATUS_COLORS.IN_PROGRESS }) => (
  <Box component="svg" viewBox="0 0 24 14" sx={{ width: 24, height: 14 }}>
    <line x1="0" y1="7" x2="24" y2="7" stroke={color} strokeWidth="3" />
    <line x1="12" y1="1" x2="12" y2="13" stroke="#fff" strokeWidth="5" />
    <line x1="12" y1="2" x2="12" y2="12" stroke="#111827" strokeWidth="2.5" />
  </Box>
);
