import React, { memo, useMemo } from "react";
import { Marker, Polygon, Polyline } from "@react-google-maps/api";
import { titleCase } from "../execution/execConstants";
import { miscBadge } from "../blockProfile/equipmentForms";
import { routerName } from "../blockProfile/blockProfileConstants";
import {
  BADGE_PATH,
  DIAMOND_PATH,
  EQUIPMENT_COLORS,
  GP_COLOR,
  INFRA_COLORS,
  MEDIA_KIND,
  MEDIA_SQUARE_PATH,
  PIN_PATH,
  REF_COLOR,
  RESTORATION_COLORS,
  RING_COLOR,
  ROUTER_COLOR,
  SQUARE_PATH,
  STATUS_COLORS,
  circleSymbol,
  groupMedia,
  isFlagged,
  symbol,
} from "../blockProfile/blockMapLayers";
import { kmlColor, subKey, toPoint } from "./masterMapLayers";
import { midpointOf } from "../blockProfile/roadPaths";
import { kmlPointIcon, kmlStyleOf } from "../mapViewPage/utils/kmlUtils";

const DASH = (color, scale = 2.5) => [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: color, scale }, offset: "0", repeat: "12px" }];
// Dashed line with an arrow halfway, pointing clockwise (previous → next node)
const ringIcons = (color) => [
  { icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: color, scale: 2 }, offset: "0", repeat: "10px" },
  {
    icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: color, strokeOpacity: 1, fillColor: color, fillOpacity: 1 },
    offset: "50%",
  },
];
const equipmentCode = (e) => (e.form === "misc" ? miscBadge(e) : "R");
const equipmentColor = (e) => (e.form === "misc" ? EQUIPMENT_COLORS.misc : EQUIPMENT_COLORS.router);
const at = (e) => e.latLng.toJSON();

/**
 * Everything of one block on the master map. `show` says which layers draw at the current
 * zoom (MasterMapPage applies the panel switches and each layer's minimum zoom); clicks
 * report { kind, position, … } to `onSelect`, which opens the info card.
 */
const MasterMapBlockLayers = ({ data, kml, roads, show, filters, thick, names, limit, onSelect }) => {
  const { profile } = data;
  const block = { blockId: profile._id, block: profile.block, district: profile.district, state: profile.state };
  const pick = (kind, position, extra) => onSelect({ kind, position, ...block, ...extra });

  const router = useMemo(() => toPoint(profile.blockRouter?.latitude, profile.blockRouter?.longitude), [profile.blockRouter]);
  const routerTitle = routerName(profile);
  const gps = useMemo(
    () => (profile.gps || []).map((gp) => ({ gp, point: toPoint(gp.latitude, gp.longitude) })).filter(({ point }) => point),
    [profile.gps]
  );
  const equipment = useMemo(() => (data.equipment || []).filter((e) => Number.isFinite(e.lat)), [data.equipment]);
  const infra = useMemo(() => (data.infra || []).filter((i) => Number.isFinite(i.lat)), [data.infra]);
  const sections = useMemo(() => (data.sections || []).filter((s) => s.from && s.to), [data.sections]);

  // Where a ring node is: its equipment sheet's location, else the router / GP coordinates.
  // A link runs along the KML road between its nodes; without one it isn't drawn.
  const ringLinks = useMemo(() => {
    if (!show.rings || !roads) return [];
    const position = (code) => {
      if (code === profile.blockCode) {
        const e = equipment.find((x) => x.form === "block");
        return e ? { lat: e.lat, lng: e.lng } : router;
      }
      const e = equipment.find((x) => x.form === "gp" && x.gpLgdCode === code);
      if (e) return { lat: e.lat, lng: e.lng };
      return gps.find(({ gp }) => gp.lgdCode === code)?.point || null;
    };
    const nameOf = (code) => (code === profile.blockCode ? routerTitle : (profile.gps || []).find((g) => g.lgdCode === code)?.name || code);
    const links = new Map();
    const add = (from, to, distanceM) => {
      if (!from || !to || from === to) return;
      const key = `${from}>${to}`;
      const existing = links.get(key);
      if (existing) {
        if (existing.distanceM == null) existing.distanceM = distanceM;
        return;
      }
      const path = roads.route(position(from), position(to));
      if (path) links.set(key, { key, path, fromName: nameOf(from), toName: nameOf(to), distanceM });
    };
    equipment
      .filter((e) => e.form === "gp")
      .forEach((e) => {
        add(e.prevNode, e.gpLgdCode, e.prevNodeDistanceM);
        add(e.gpLgdCode, e.nextNode, e.nextNodeDistanceM);
      });
    return [...links.values()];
  }, [show.rings, roads, equipment, gps, router, profile.blockCode, profile.gps, routerTitle]);

  const mediaGroups = useMemo(() => {
    if (!show.media) return [];
    const visible = (data.media || []).filter((m) => filters.mediaKinds.has(m.kind));
    return groupMedia(visible);
  }, [show.media, data.media, filters.mediaKinds]);

  const nameLabel = (text) => (names ? { text: titleCase(text), className: "block-map-name", color: "#111827", fontSize: "11px", fontWeight: "600" } : undefined);

  const renderSubsection = (s) => {
    const color = STATUS_COLORS[subKey(s)] || STATUS_COLORS.NOT_STARTED;
    const executed = [s.start, ...s.entries, s.end].filter(Boolean).map((p) => ({ lat: p.lat, lng: p.lng }));
    // The planned line follows the road from the KML; without one only the field work shows
    const planned = roads?.subsections.get(String(s._id));
    const mid = planned ? midpointOf(planned) : executed[0];
    const sub = (what, position) => pick("subsection", position, { item: s, what });
    return (
      <React.Fragment key={s._id}>
        {planned && <Polyline path={planned} options={{ strokeOpacity: 0, icons: DASH(color), zIndex: 3 }} onClick={() => sub("Planned line", mid)} />}
        {executed.length > 1 && (
          <Polyline path={executed} options={{ strokeColor: color, strokeWeight: 4, strokeOpacity: 0.9, zIndex: 4 }} onClick={(e) => sub("Executed path", at(e))} />
        )}
        {show.entries &&
          s.entries.map((p, i) => (
            <Marker key={`e${i}`} position={p} icon={circleSymbol(color, 3, { strokeWeight: 1 })} zIndex={5} onClick={() => sub(`Entry #${i + 1}`, p)} />
          ))}
        {[
          ["A", s.start, "#15803d"],
          ["B", s.end, "#b91c1c"],
        ].map(([label, pit, pitColor]) =>
          pit ? (
            <React.Fragment key={label}>
              {show.refs &&
                pit.refs.map((r, i) => (
                  <React.Fragment key={`${label}r${i}`}>
                    <Polyline path={[pit, r]} options={{ strokeColor: REF_COLOR, strokeWeight: 1.5, strokeOpacity: 0.7, zIndex: 5 }} />
                    <Marker position={r} icon={circleSymbol(REF_COLOR, 4, { strokeWeight: 1 })} zIndex={6} onClick={() => pick("ref", r, { item: r, subsection: s })} />
                  </React.Fragment>
                ))}
              <Marker
                position={pit}
                label={{ text: label, color: "#ffffff", fontSize: "11px", fontWeight: "700" }}
                icon={circleSymbol(pitColor, 8, { stroke: color, strokeWeight: 3 })}
                zIndex={7}
                onClick={() => sub(label === "A" ? "Start" : "End", pit)}
              />
            </React.Fragment>
          ) : null
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      {show.kml &&
        profile.kmlFiles.map((file, index) =>
          (kml[file._id] || []).map((f) => {
            // The KML's own colours; the file's colour for what it leaves unstyled
            const st = kmlStyleOf(f, kmlColor(index));
            const onClick = (e) => pick("kml", f.type === "marker" ? f.position : at(e), { item: f, file });
            if (f.type === "polyline") {
              return (
                <Polyline
                  key={`${file._id}:${f.id}`}
                  path={f.path}
                  // Thinner when zoomed out, so a district reads as a network
                  options={{ strokeColor: st.strokeColor, strokeOpacity: st.strokeOpacity, strokeWeight: thick ? st.strokeWeight : Math.min(st.strokeWeight, 2), zIndex: 1 }}
                  onClick={onClick}
                />
              );
            }
            if (f.type === "polygon") {
              return (
                <Polygon
                  key={`${file._id}:${f.id}`}
                  paths={f.paths}
                  options={{ strokeColor: st.strokeColor, strokeOpacity: st.strokeOpacity, strokeWeight: 2, fillColor: st.fillColor, fillOpacity: st.fillOpacity, zIndex: 0 }}
                  onClick={onClick}
                />
              );
            }
            return show.kmlPoints ? (
              <Marker key={`${file._id}:${f.id}`} position={f.position} icon={kmlPointIcon(f, kmlColor(index), 20)} zIndex={2} title={f.title} onClick={onClick} />
            ) : null;
          })
        )}

      {show.sections &&
        sections.map((s) => {
          const color = RESTORATION_COLORS[s.restorationStatus] || RESTORATION_COLORS.LOCKED;
          const road = roads?.sections.get(String(s._id));
          // Only along the road from the KML: a section is never the straight line between its nodes
          return road ? (
            <Polyline
              key={s._id}
              path={road}
              options={{ strokeColor: color, strokeWeight: thick ? 8 : 3, strokeOpacity: thick ? 0.35 : 0.6, zIndex: 1 }}
              onClick={(e) => pick("section", at(e), { item: s })}
            />
          ) : null;
        })}

      {show.subsections && (data.subsections || []).filter((s) => filters.subStatuses.has(subKey(s))).map(renderSubsection)}

      {ringLinks.map((link) => (
        <Polyline key={link.key} path={link.path} options={{ strokeOpacity: 0, icons: ringIcons(RING_COLOR), zIndex: 2 }} onClick={(e) => pick("ring", at(e), { item: link })} />
      ))}

      {show.gps &&
        gps.map(({ gp, point }) => (
          <Marker
            key={gp.lgdCode}
            position={point}
            title={`GP: ${titleCase(gp.name)} (LGD ${gp.lgdCode})`}
            icon={symbol(DIAMOND_PATH, GP_COLOR, { labelBelow: 21 })}
            label={nameLabel(gp.name)}
            zIndex={9}
            onClick={() => pick("gp", point, { item: gp })}
          />
        ))}
      {show.router && router && (
        <Marker
          position={router}
          title={`${titleCase(profile.block)} block router`}
          icon={symbol(SQUARE_PATH, ROUTER_COLOR, { labelBelow: 20 })}
          // Zoomed out the router stands for the whole block, so it carries the block's name
          label={{
            text: names ? routerTitle : titleCase(profile.block),
            className: "block-map-name",
            color: "#111827",
            fontSize: "11px",
            fontWeight: "600",
          }}
          zIndex={10}
          onClick={() => pick("router", router, { item: profile.blockRouter, blockCode: profile.blockCode })}
        />
      )}

      {infra
        .filter((i) => (i.level === "BLOCK" ? show.blockInfra : show.gpInfra))
        .map((i) => (
          <Marker
            key={i._id}
            position={{ lat: i.lat, lng: i.lng }}
            icon={symbol(PIN_PATH, INFRA_COLORS[i.level])}
            zIndex={11}
            title={`${i.level === "BLOCK" ? "Block infra capture" : "GP infra capture"}: ${titleCase(i.name)}`}
            onClick={() => pick("infra", { lat: i.lat, lng: i.lng }, { item: i })}
          />
        ))}

      {show.equipment &&
        equipment
          .filter((e) => filters.equipmentForms.has(e.form))
          .map((e) => (
            <Marker
              key={e._id}
              position={{ lat: e.lat, lng: e.lng }}
              icon={symbol(BADGE_PATH, equipmentColor(e))}
              label={{ text: equipmentCode(e), color: "#ffffff", fontSize: "10px", fontWeight: "700" }}
              zIndex={12}
              title={`${titleCase(e.name)}${e.assetCode ? ` · ${e.assetCode}` : ""}`}
              onClick={() => pick("equipment", { lat: e.lat, lng: e.lng }, { item: e })}
            />
          ))}

      {mediaGroups.map((group) => {
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
            onClick={() => pick("media", group.position, { item: group })}
          />
        );
      })}
    </>
  );
};

export default memo(MasterMapBlockLayers);
