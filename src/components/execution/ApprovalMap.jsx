import React, { useCallback, useMemo, useState } from "react";
import { Alert, Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { GoogleMap, InfoWindow, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "../mapViewPage/utils/googleMapsLoader";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { fmtAccuracy, fmtDateTime, fmtDistance, fmtLatLong, parseLatLong, pointOf } from "../../utils/executionFormat";
import { MEDIA_KIND, MEDIA_SQUARE_PATH, circleSymbol, groupMedia, isFlagged, symbol } from "../blockProfile/blockMapLayers";
import { InfoTitle, Line2, MediaRow } from "../blockProfile/BlockMapPanel";
import ExecMediaViewer from "./ExecMediaViewer";
import { MediaStrip } from "./MediaPicker";
import { eachCapturedMedia } from "./subsectionMedia";

const COLORS = { plan: "#64748b", start: "#15803d", end: "#b91c1c", ref: "#7c3aed", entry: "#1d4ed8" };
const MAP_STYLE = { width: "100%", height: "100%" };
// Cooperative: the wheel keeps scrolling the page, ctrl or cmd + wheel zooms
const MAP_OPTIONS = { gestureHandling: "cooperative", mapTypeControl: true, streetViewControl: false, fullscreenControl: true, clickableIcons: false };
const DASH = [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: COLORS.plan, scale: 3 }, offset: "0", repeat: "14px" }];

// parseLatLong and pointOf give { lat, lng }; keep only finite points so the map never gets NaN
const toLatLng = (p) => (p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? { lat: p.lat, lng: p.lng } : null);

// The captured media with a usable location, for the map
const capturedMedia = (sub, pitALabel, pitBLabel) => {
  const out = [];
  eachCapturedMedia(sub, pitALabel, pitBLabel, (m, kind, label, description) => {
    const p = toLatLng(pointOf(m));
    if (p) out.push({ ...m, id: m._id || `${kind}:${m.url}`, kind, label, description: description || m.description, ...p });
  });
  return out;
};

const Swatch = ({ color, square, dashed }) => (
  <Box
    sx={{
      width: dashed ? 18 : 10,
      height: dashed ? 0 : 10,
      borderRadius: square || dashed ? 0 : "50%",
      bgcolor: dashed ? "transparent" : color,
      borderTop: dashed ? `2px dashed ${color}` : 0,
      flexShrink: 0,
    }}
  />
);

/** A layer switch: chip with its swatch and count */
const LayerChip = ({ on, onClick, color, label, count, dashed }) => (
  <Chip
    size="small"
    variant={on ? "filled" : "outlined"}
    onClick={onClick}
    aria-pressed={on}
    icon={
      <Box sx={{ ml: "8px !important", opacity: on ? 1 : 0.4, display: "flex" }}>
        <Swatch color={color} dashed={dashed} />
      </Box>
    }
    label={`${label} ${count}`}
    sx={{ height: 26, bgcolor: on ? "action.selected" : undefined, color: on ? "text.primary" : "text.secondary" }}
  />
);

/**
 * C16 map, laid out like the block map: the planned line, the start and end pits with their
 * reference points, the entries along the executed path and every photo and video captured
 * on the mobile app, each a layer that can be switched off. A click shows what was recorded
 * there; a photo opens in the viewer. Google Maps (Q2).
 */
const ApprovalMap = ({ sub, pitALabel = "Start", pitBLabel = "End" }) => {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const { config, isDucting } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  const [layers, setLayers] = useState({ plan: true, pits: true, entries: true, media: true });
  const [selected, setSelected] = useState(null);
  const [viewing, setViewing] = useState(null);
  const toggle = (key) => setLayers((l) => ({ ...l, [key]: !l[key] }));

  const shapes = useMemo(() => {
    const plan = [parseLatLong(sub.fromLatLong), parseLatLong(sub.toLatLong)].map(toLatLng).filter(Boolean);
    const pit = (holder) => toLatLng(pointOf(holder?.pit) || pointOf(holder));
    const refs = (holder) =>
      (holder?.pit?.refs || [])
        .map((r, i) => ({ r, i, p: toLatLng(pointOf(r)) }))
        .filter((x) => x.p);
    const entries = (sub.entries || []).map((e, i) => ({ e, i, p: toLatLng(pointOf(e)) })).filter((x) => x.p);
    const media = capturedMedia(sub, pitALabel, pitBLabel);
    return { plan, start: pit(sub.start), end: pit(sub.end), startRefs: refs(sub.start), endRefs: refs(sub.end), entries, media, groups: groupMedia(media) };
  }, [sub, pitALabel, pitBLabel]);

  const all = [
    ...shapes.plan,
    shapes.start,
    shapes.end,
    ...shapes.startRefs.map((x) => x.p),
    ...shapes.endRefs.map((x) => x.p),
    ...shapes.entries.map((x) => x.p),
    ...shapes.media.map((m) => ({ lat: m.lat, lng: m.lng })),
  ].filter(Boolean);

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

  // Entry values in the order of the type's entry form
  const entryFields = config?.entryFields?.[isDucting(sub.typeOfWork) ? sub.typeOfWork : "basic"] || [];

  // ---- info windows
  const pitInfo = (point, title, position) =>
    setSelected({
      position,
      body: (
        <Box sx={{ width: 260 }}>
          <InfoTitle sub={[fmtDateTime(point.at), point.by?.name].filter(Boolean).join(" · ")}>{title}</InfoTitle>
          <Line2>{`${fmtLatLong(position.lat, position.lng)} · ${fmtAccuracy(point.pit?.accuracy ?? point.accuracy, limit)}`}</Line2>
          {point.pit?.copiedFrom && <Line2>Copied from the previous subsection&apos;s end pit</Line2>}
          {point.remarks && <Line2>Note: {point.remarks}</Line2>}
          <Box sx={{ mt: 1 }}>
            <MediaStrip media={{ photos: [...(point.pit?.photos || []), ...(point.photos || [])], video: point.pit?.video || point.video }} size={56} />
          </Box>
        </Box>
      ),
    });

  const refInfo = (r, i, title, position) =>
    setSelected({
      position,
      body: (
        <Box sx={{ width: 260 }}>
          <InfoTitle sub={`${title} · reference point ${i + 1}`}>{r.description || "Reference point"}</InfoTitle>
          <Line2>{[r.tapeDistanceM != null && `Tape ${fmtDistance(r.tapeDistanceM)}`, r.gpsDistanceM != null && `GPS ${fmtDistance(r.gpsDistanceM)}`].filter(Boolean).join(" · ")}</Line2>
          <Line2>{`${fmtLatLong(position.lat, position.lng)} · ${fmtAccuracy(r.accuracy, limit)}`}</Line2>
          {(r.photos?.length > 0 || r.video) && (
            <Box sx={{ mt: 1 }}>
              <MediaStrip media={r} size={56} />
            </Box>
          )}
        </Box>
      ),
    });

  const entryInfo = (e, i, position) =>
    setSelected({
      position,
      body: (
        <Box sx={{ width: 260 }}>
          <InfoTitle sub={[fmtDateTime(e.capturedAt), e.createdBy?.name].filter(Boolean).join(" · ")}>{`Entry #${i + 1}`}</InfoTitle>
          {entryFields
            .filter((f) => e[f.key] !== undefined && e[f.key] !== null && e[f.key] !== "")
            .map((f) => (
              <Line2 key={f.key}>
                {f.label}: {f.kind === "number" ? `${e[f.key]}${f.unit && !/\(/.test(f.label) ? ` ${f.unit}` : ""}` : e[f.key]}
              </Line2>
            ))}
          <Line2>{`${fmtLatLong(position.lat, position.lng)} · ${fmtAccuracy(e.accuracy, limit)}`}</Line2>
          {e.photo && (
            <Box sx={{ mt: 1 }}>
              <MediaStrip media={{ photos: [e.photo] }} size={56} />
            </Box>
          )}
        </Box>
      ),
    });

  const mediaInfo = (group) =>
    setSelected({
      position: group.position,
      body: (
        <Box sx={{ width: 260, maxHeight: 320, overflowY: "auto" }}>
          <InfoTitle sub={fmtLatLong(group.position.lat, group.position.lng)}>
            {group.items.length} {group.items.length === 1 ? "photo or video" : "photos and videos"}
          </InfoTitle>
          {group.items.map((m) => (
            <MediaRow key={m.id} m={m} limit={limit} onOpen={(item) => setViewing(item)} />
          ))}
        </Box>
      ),
    });

  if (loadError) return <Alert severity="warning">Couldn&apos;t load Google Maps.</Alert>;
  if (!all.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No locations to show yet.
      </Typography>
    );
  }

  const refCount = shapes.startRefs.length + shapes.endRefs.length;
  const pitCount = [shapes.start, shapes.end].filter(Boolean).length;
  // Media kinds present, for the legend
  const kinds = [...new Set(shapes.media.map((m) => m.kind))];

  return (
    <Box>
      <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap", mb: 1.25 }}>
        <LayerChip on={layers.plan} onClick={() => toggle("plan")} color={COLORS.plan} dashed label="Planned line" count={shapes.plan.length} />
        <LayerChip on={layers.pits} onClick={() => toggle("pits")} color={COLORS.start} label="Pits & reference points" count={pitCount + refCount} />
        <LayerChip on={layers.entries} onClick={() => toggle("entries")} color={COLORS.entry} label="Entries" count={shapes.entries.length} />
        <LayerChip on={layers.media} onClick={() => toggle("media")} color={MEDIA_KIND.SITE.color} label="Photos & videos" count={shapes.media.length} />
      </Stack>
      <Box sx={{ height: { xs: 300, md: 380 }, borderRadius: 1, overflow: "hidden", bgcolor: "action.hover" }}>
        {!isLoaded ? (
          <Skeleton variant="rectangular" height="100%" />
        ) : (
          <GoogleMap mapContainerStyle={MAP_STYLE} center={all[0]} zoom={16} options={MAP_OPTIONS} onLoad={onLoad} onClick={() => setSelected(null)}>
            {layers.plan && shapes.plan.length === 2 && <Polyline path={shapes.plan} options={{ strokeOpacity: 0, icons: DASH, zIndex: 1 }} />}
            {layers.plan &&
              shapes.plan.map((p, i) => (
                <Marker
                  key={`plan${i}`}
                  position={p}
                  title={i === 0 ? "Planned from" : "Planned to"}
                  icon={circleSymbol(COLORS.plan, 6)}
                  zIndex={2}
                  onClick={() =>
                    setSelected({ position: p, body: <InfoTitle sub={fmtLatLong(p.lat, p.lng)}>{i === 0 ? "Planned from" : "Planned to"}</InfoTitle> })
                  }
                />
              ))}

            {layers.entries && shapes.entries.length > 1 && (
              <Polyline path={shapes.entries.map((x) => x.p)} options={{ strokeColor: COLORS.entry, strokeWeight: 3, strokeOpacity: 0.8, zIndex: 3 }} />
            )}
            {layers.entries &&
              shapes.entries.map(({ e, i, p }) => (
                <Marker key={`e${i}`} position={p} title={`Entry #${i + 1}`} icon={circleSymbol(COLORS.entry, 5)} zIndex={4} onClick={() => entryInfo(e, i, p)} />
              ))}

            {layers.pits &&
              [
                ["start", sub.start, shapes.start, shapes.startRefs, COLORS.start, "A", pitALabel],
                ["end", sub.end, shapes.end, shapes.endRefs, COLORS.end, "B", pitBLabel],
              ].map(([key, point, pit, refs, color, label, title]) =>
                pit ? (
                  <React.Fragment key={key}>
                    {refs.map(({ r, i, p }) => (
                      <React.Fragment key={`${key}r${i}`}>
                        <Polyline path={[pit, p]} options={{ strokeColor: COLORS.ref, strokeWeight: 1.5, strokeOpacity: 0.7, zIndex: 5 }} />
                        <Marker position={p} title={`${title} · reference point ${i + 1}`} icon={circleSymbol(COLORS.ref, 6)} zIndex={6} onClick={() => refInfo(r, i, title, p)} />
                      </React.Fragment>
                    ))}
                    <Marker
                      position={pit}
                      title={title}
                      label={{ text: label, color: "#ffffff", fontWeight: "700" }}
                      icon={circleSymbol(color, 11)}
                      zIndex={10}
                      onClick={() => pitInfo(point, title, pit)}
                    />
                  </React.Fragment>
                ) : null
              )}

            {layers.media &&
              shapes.groups.map((group) => {
                const color = MEDIA_KIND[group.items[0].kind]?.color || "#334155";
                const allVideo = group.items.every((m) => m.fileType === "VIDEO");
                const flagged = group.items.some((m) => isFlagged(m, limit));
                const n = group.items.length;
                const options = { stroke: flagged ? "#f59e0b" : "#ffffff", strokeWeight: flagged ? 3 : 2 };
                return (
                  <Marker
                    key={group.key}
                    position={group.position}
                    icon={allVideo ? symbol(MEDIA_SQUARE_PATH, color, { scale: n > 1 ? 1.25 : 1, ...options }) : circleSymbol(color, n > 1 ? 9 : 6, options)}
                    label={n > 1 ? { text: String(n), color: "#ffffff", fontSize: "10px", fontWeight: "700" } : undefined}
                    zIndex={8}
                    title={`${n} ${n === 1 ? "photo or video" : "photos and videos"}`}
                    onClick={() => mediaInfo(group)}
                  />
                );
              })}

            {selected && (
              <InfoWindow position={selected.position} onCloseClick={() => setSelected(null)}>
                <Box sx={{ maxWidth: 280, color: "text.primary" }}>{selected.body}</Box>
              </InfoWindow>
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
        {kinds.map((k) => (
          <Legend key={k} color={MEDIA_KIND[k]?.color} label={`Photos · ${MEDIA_KIND[k]?.label}`} />
        ))}
      </Stack>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
        Click a pit, reference point, entry or photo to see what was recorded there. Circle: photo · square: video · number: several at one spot · amber ring:
        GPS above ±{limit} m, uploaded or location typed.
      </Typography>
      {viewing && <ExecMediaViewer media={{ ...viewing, latitude: viewing.lat, longitude: viewing.lng }} onClose={() => setViewing(null)} />}
    </Box>
  );
};

const Legend = ({ color, label, dashed }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
    <Swatch color={color} dashed={dashed} />
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
  </Box>
);

export default ApprovalMap;
