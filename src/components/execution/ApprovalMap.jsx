import React, { useCallback, useMemo } from "react";
import { Alert, Box, Skeleton, Stack, Typography } from "@mui/material";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "../mapViewPage/utils/googleMapsLoader";
import { parseLatLong, pointOf } from "../../utils/executionFormat";

const COLORS = { plan: "#64748b", start: "#15803d", end: "#b91c1c", ref: "#7c3aed", entry: "#1d4ed8" };
const MAP_STYLE = { width: "100%", height: "100%" };
const MAP_OPTIONS = { mapTypeControl: true, streetViewControl: false, fullscreenControl: true, clickableIcons: false };

// parseLatLong and pointOf already give { lat, lng }; keep only finite points so the map never gets NaN
const toLatLng = (p) => (p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat, lng: p.lng } : null);

const circle = (color, scale) => ({
  path: window.google.maps.SymbolPath.CIRCLE,
  scale,
  fillColor: color,
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
});

const Legend = ({ color, label, dashed }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
    <Box sx={{ width: dashed ? 18 : 10, height: dashed ? 0 : 10, borderRadius: dashed ? 0 : "50%", bgcolor: dashed ? "transparent" : color, borderTop: dashed ? `2px dashed ${color}` : 0 }} />
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
  </Box>
);

/**
 * C16 map: planned From → To (dashed), the start and end pits (or points) with their
 * reference points, and the entries in order. Google Maps (Q2).
 */
const ApprovalMap = ({ sub, pitALabel = "Start", pitBLabel = "End" }) => {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const shapes = useMemo(() => {
    const from = parseLatLong(sub.fromLatLong);
    const to = parseLatLong(sub.toLatLong);
    const plan = [from, to].map(toLatLng).filter(Boolean);
    const point = (holder) => toLatLng(pointOf(holder?.pit) || pointOf(holder));
    const refs = (holder) => (holder?.pit?.refs || []).map((r) => toLatLng(pointOf(r))).filter(Boolean);
    const entries = (sub.entries || []).map((e) => toLatLng(pointOf(e))).filter(Boolean);
    return {
      plan,
      start: point(sub.start),
      end: point(sub.end),
      startRefs: refs(sub.start),
      endRefs: refs(sub.end),
      entries,
    };
  }, [sub]);

  const all = [...shapes.plan, shapes.start, shapes.end, ...shapes.startRefs, ...shapes.endRefs, ...shapes.entries].filter(Boolean);

  const onLoad = useCallback(
    (map) => {
      if (!all.length) return;
      const bounds = new window.google.maps.LatLngBounds();
      all.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 48);
      // A single point would zoom in to the maximum
      if (all.length === 1) map.setZoom(18);
    },
    // fit once per subsection
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sub._id]
  );

  if (loadError) return <Alert severity="warning">Couldn&apos;t load Google Maps.</Alert>;
  if (!all.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No locations to show yet.
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ height: { xs: 300, md: 420 }, borderRadius: 1, overflow: "hidden", bgcolor: "action.hover" }}>
        {!isLoaded ? (
          <Skeleton variant="rectangular" height="100%" />
        ) : (
          <GoogleMap mapContainerStyle={MAP_STYLE} center={all[0]} zoom={16} options={MAP_OPTIONS} onLoad={onLoad}>
            {shapes.plan.length === 2 && (
              <Polyline
                path={shapes.plan}
                options={{
                  strokeOpacity: 0,
                  icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: COLORS.plan, scale: 3 }, offset: "0", repeat: "14px" }],
                }}
              />
            )}
            {shapes.plan.map((p, i) => (
              <Marker key={`plan${i}`} position={p} title={i === 0 ? "Planned from" : "Planned to"} icon={circle(COLORS.plan, 6)} />
            ))}
            {shapes.entries.length > 1 && <Polyline path={shapes.entries} options={{ strokeColor: COLORS.entry, strokeWeight: 3, strokeOpacity: 0.8 }} />}
            {shapes.entries.map((p, i) => (
              <Marker key={`e${i}`} position={p} title={`Entry #${i + 1}`} icon={circle(COLORS.entry, 4)} />
            ))}
            {[
              ["start", shapes.start, shapes.startRefs, COLORS.start, "A", pitALabel],
              ["end", shapes.end, shapes.endRefs, COLORS.end, "B", pitBLabel],
            ].map(([key, pit, refs, color, label, title]) =>
              pit ? (
                <React.Fragment key={key}>
                  {refs.map((r, i) => (
                    <React.Fragment key={`${key}r${i}`}>
                      <Polyline path={[pit, r]} options={{ strokeColor: COLORS.ref, strokeWeight: 1.5, strokeOpacity: 0.7 }} />
                      <Marker position={r} title={`${title} · reference point ${i + 1}`} icon={circle(COLORS.ref, 5)} />
                    </React.Fragment>
                  ))}
                  <Marker position={pit} title={title} label={{ text: label, color: "#ffffff", fontWeight: "700" }} icon={circle(color, 11)} zIndex={10} />
                </React.Fragment>
              ) : null
            )}
          </GoogleMap>
        )}
      </Box>
      <Stack direction="row" useFlexGap spacing={2} sx={{ flexWrap: "wrap", mt: 1 }}>
        <Legend color={COLORS.plan} label="Planned from → to" dashed />
        <Legend color={COLORS.start} label={`A · ${pitALabel}`} />
        <Legend color={COLORS.end} label={`B · ${pitBLabel}`} />
        <Legend color={COLORS.ref} label="Reference points" />
        <Legend color={COLORS.entry} label="Entries" />
      </Stack>
    </Box>
  );
};

export default ApprovalMap;
