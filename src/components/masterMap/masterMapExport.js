// Excel and KML exports of what the master map shows: the picked blocks, with the layers
// and filters that are on. The zoom doesn't matter; a layer that's on exports in full.
import * as XLSX from "xlsx";
import { titleCase } from "../execution/execConstants";
import { MEDIA_KIND, RESTORATION_COLORS, STATUS_COLORS, ROUTER_COLOR, GP_COLOR, INFRA_COLORS, EQUIPMENT_COLORS } from "../blockProfile/blockMapLayers";
import { SITE_TYPES } from "../blockProfile/blockProfileConstants";
import { kmlStyleOf } from "../mapViewPage/utils/kmlUtils";
import { EQUIPMENT_FORMS, formFields, miscItemsOf, miscTypeLabel } from "../blockProfile/equipmentForms";
import { EQUIPMENT_FORMS_ON_MAP, kmlColor, pathLengthM, subKey, toPoint } from "./masterMapLayers";

// A section or subsection along its road from the KML, else straight from → to
const roadOf = (roads, kind, item) => roads?.[kind].get(item._id) || (item.from && item.to ? [item.from, item.to] : null);

const today = () => new Date().toISOString().slice(0, 10);
const round = (n, digits = 6) => (Number.isFinite(Number(n)) ? Number(Number(n).toFixed(digits)) : "");
const metres = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n) * 10) / 10 : "");

const fieldValue = (field, value) => {
  if (value === undefined || value === null || value === "") return "";
  if (field.type === "enum") return field.options.find((o) => o.value === String(value))?.label || String(value);
  return value;
};

/** What each export includes, from the panel's switches and filters */
const include = (blocks, { layers, filters }) => ({
  gps: layers.gps,
  sections: layers.sections,
  subsections: layers.subsections,
  infra: layers.blockInfra || layers.gpInfra,
  infraLevel: (level) => (level === "BLOCK" ? layers.blockInfra : layers.gpInfra),
  equipmentForms: layers.equipment ? EQUIPMENT_FORMS_ON_MAP.map((f) => f.key).filter((k) => filters.equipmentForms.has(k)) : [],
  kml: layers.kml,
  media: layers.media,
  subs: (data) => (data.subsections || []).filter((s) => filters.subStatuses.has(subKey(s))),
  mediaOf: (data) => (data.media || []).filter((m) => filters.mediaKinds.has(m.kind)),
  blocks,
});

// ---- Excel

export const exportMasterMapExcel = (blocks, kml, { layers, filters, config, roadsByBlock = {} }) => {
  const on = include(blocks, { layers, filters });
  const statusLabel = (key) => (key === "LEGACY" ? "Older (trenching)" : config?.statuses?.[key]?.label || key);
  const restorationLabel = (key) => config?.restorationStates?.[key]?.label || key || "";
  const where = ({ profile }) => ({ State: profile.state, District: profile.district, Block: titleCase(profile.block) });
  const sheets = [];

  sheets.push([
    "Blocks",
    blocks.map((data) => {
      const { profile } = data;
      const router = toPoint(profile.blockRouter?.latitude, profile.blockRouter?.longitude);
      return {
        ...where(data),
        "Block code": profile.blockCode,
        "Router site type": SITE_TYPES[profile.blockRouter?.siteType] || "",
        "Router address": profile.blockRouter?.address || "",
        "Router latitude": round(router?.lat),
        "Router longitude": round(router?.lng),
        GPs: profile.gps.length,
        Sections: (data.sections || []).length,
        "Section length (m)": metres((data.sections || []).reduce((n, s) => n + (Number(s.sectionLength) || 0), 0)),
        Subsections: (data.subsections || []).length,
        "KML files": profile.kmlFiles.length,
      };
    }),
  ]);

  if (on.gps) {
    sheets.push([
      "GPs",
      blocks.flatMap((data) =>
        data.profile.gps.map((gp) => ({ ...where(data), GP: titleCase(gp.name), "LGD code": gp.lgdCode, Latitude: round(gp.latitude), Longitude: round(gp.longitude) }))
      ),
    ]);
  }

  if (on.sections) {
    sheets.push([
      "Sections",
      blocks.flatMap((data) =>
        (data.sections || []).map((s) => ({
          ...where(data),
          Section: s.name,
          From: s.fromName,
          To: s.toName,
          "Length (m)": metres(s.sectionLength),
          "Main path (m)": metres(s.mainPathLength),
          "Sharing path (m)": metres(s.sharingPathLength),
          "Existing incremental path (m)": metres(s.existingIncrementalPathLength),
          "Road length from KML (m)": roadsByBlock[data.profile._id]?.sections.has(s._id) ? metres(pathLengthM(roadsByBlock[data.profile._id].sections.get(s._id))) : "",
          Route: s.routeType === "EXISTING" ? "Existing" : "New",
          Subsections: s.total,
          Restoration: restorationLabel(s.restorationStatus),
          "From latitude": round(s.from?.lat),
          "From longitude": round(s.from?.lng),
          "To latitude": round(s.to?.lat),
          "To longitude": round(s.to?.lng),
        }))
      ),
    ]);
  }

  if (on.subsections) {
    sheets.push([
      "Subsections",
      blocks.flatMap((data) =>
        on.subs(data).map((s) => ({
          ...where(data),
          Section: s.sectionName,
          Subsection: s.name,
          "Type of work": config?.types?.[s.typeOfWork]?.full || s.typeOfWork || "",
          Status: statusLabel(subKey(s)),
          Road: s.roadName,
          "Planned length (m)": metres(s.subSectionLength),
          Entries: s.entries.length,
          "Executed length (m)": metres(s.entries.reduce((n, e) => n + (Number(e.length) || 0), 0)),
          Crossing: s.crossing,
          Terrain: s.terrain,
          "OFC side": s.ofcSide,
          "Start latitude": round(s.start?.lat ?? s.from?.lat),
          "Start longitude": round(s.start?.lng ?? s.from?.lng),
          "End latitude": round(s.end?.lat ?? s.to?.lat),
          "End longitude": round(s.end?.lng ?? s.to?.lng),
        }))
      ),
    ]);
  }

  if (on.infra) {
    sheets.push([
      "Infra captures",
      blocks.flatMap((data) =>
        (data.infra || [])
          .filter((i) => on.infraLevel(i.level))
          .map((i) => ({
            ...where(data),
            Level: i.level === "BLOCK" ? "Block" : "GP",
            Name: titleCase(i.name),
            "GP LGD code": i.gpLgdCode || "",
            Photos: i.photoCount,
            Latitude: round(i.lat),
            Longitude: round(i.lng),
            Saved: i.updatedAt ? new Date(i.updatedAt).toLocaleString("en-IN") : "",
          }))
      ),
    ]);
  }

  // One sheet per equipment form, with every field of the form
  for (const form of on.equipmentForms) {
    const fields = formFields(form);
    sheets.push([
      EQUIPMENT_FORMS[form].title,
      blocks.flatMap((data) =>
        (data.equipment || [])
          .filter((e) => e.form === form)
          // A misc sheet gives one row per type, with that item's asset code, model and serial no.
          .flatMap((e) =>
            (form === "misc" ? miscItemsOf(e) : [null]).map((item) => ({
              ...where(data),
              Site: titleCase(e.name),
              "GP LGD code": e.gpLgdCode || "",
              ...Object.fromEntries(
                fields.flatMap((f) =>
                  f.type === "miscItems"
                    ? [
                        ["Type", miscTypeLabel(item?.type)],
                        ["Asset code", item?.assetCode || ""],
                        ["Model", item?.model || ""],
                        ["Serial no.", item?.serialNo || ""],
                      ]
                    : [[f.label, fieldValue(f, e[f.key])]]
                )
              ),
              Latitude: round(e.lat),
              Longitude: round(e.lng),
            }))
          )
      ),
    ]);
  }

  if (on.kml) {
    sheets.push([
      "KML features",
      blocks.flatMap((data) =>
        data.profile.kmlFiles.flatMap((file) =>
          (kml[file._id] || []).map((f) => {
            const first = f.type === "marker" ? f.position : f.path?.[0] || f.paths?.[0];
            return {
              ...where(data),
              File: file.name,
              Layer: (f.layerInfo || []).map((l) => l.name).join(" › "),
              Name: f.title || f.properties?.name || "",
              Type: { marker: "Point", polyline: "Line", polygon: "Polygon" }[f.type] || f.type,
              "Length (m)": f.type === "polyline" ? metres(pathLengthM(f.path)) : "",
              Latitude: round(first?.lat),
              Longitude: round(first?.lng),
            };
          })
        )
      ),
    ]);
  }

  if (on.media) {
    sheets.push([
      "Attachments",
      blocks.flatMap((data) =>
        on.mediaOf(data).map((m) => ({
          ...where(data),
          "Captured at": MEDIA_KIND[m.kind]?.label || m.kind,
          Label: m.label,
          Type: m.fileType === "VIDEO" ? "Video" : "Photo",
          Captured: m.capturedAt ? new Date(m.capturedAt).toLocaleString("en-IN") : "",
          Latitude: round(m.lat),
          Longitude: round(m.lng),
          "Accuracy (m)": metres(m.accuracy),
          URL: m.url,
        }))
      ),
    ]);
  }

  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of sheets) {
    const sheet = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([["Nothing to export"]]);
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  }
  XLSX.writeFile(workbook, `master-map_${today()}.xlsx`);
};

// ---- KML

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// "#rrggbb" -> KML's "aabbggrr"
const kmlHex = (hex, alpha = "ff") => {
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return `${alpha}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`;
};

const coords = (points) => points.map((p) => `${p.lng},${p.lat},0`).join(" ");

// alpha byte for an opacity 0..1
const alphaOf = (opacity) => Math.round(Math.min(1, Math.max(0, opacity)) * 255).toString(16).padStart(2, "0");

const placemark = ({ name, description, style, inlineStyle, point, path, polygon }) => {
  const geometry = point
    ? `<Point><coordinates>${coords([point])}</coordinates></Point>`
    : path
      ? `<LineString><tessellate>1</tessellate><coordinates>${coords(path)}</coordinates></LineString>`
      : `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coords([...polygon, polygon[0]])}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
  return `<Placemark><name>${esc(name)}</name>${description ? `<description>${esc(description)}</description>` : ""}${style ? `<styleUrl>#${style}</styleUrl>` : ""}${inlineStyle || ""}${geometry}</Placemark>`;
};

const folder = (name, items) => (items.length ? `<Folder><name>${esc(name)}</name>${items.join("")}</Folder>` : "");

// KML features nested in their layers (folders) again, from feature.layerInfo
const layerFolders = (features, render, depth = 0) => {
  const groups = new Map();
  const here = [];
  for (const f of features) {
    const layer = f.layerInfo?.[depth];
    if (!layer) {
      here.push(...render(f));
      continue;
    }
    if (!groups.has(layer.id)) groups.set(layer.id, { name: layer.name, items: [] });
    groups.get(layer.id).items.push(f);
  }
  return [...here, ...[...groups.values()].map((g) => folder(g.name, layerFolders(g.items, render, depth + 1))).filter(Boolean)];
};

const lineStyle = (id, color, width, alpha = "ff") => `<Style id="${id}"><LineStyle><color>${kmlHex(color, alpha)}</color><width>${width}</width></LineStyle><PolyStyle><color>${kmlHex(color, "33")}</color></PolyStyle></Style>`;
const pointStyle = (id, color, scale = 0.9) =>
  `<Style id="${id}"><IconStyle><color>${kmlHex(color)}</color><scale>${scale}</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle></Style>`;

export const exportMasterMapKml = (blocks, kml, { layers, filters, config, roadsByBlock = {} }) => {
  const on = include(blocks, { layers, filters });
  const statusLabel = (key) => (key === "LEGACY" ? "Older (trenching)" : config?.statuses?.[key]?.label || key);

  const styles = [
    pointStyle("gp", GP_COLOR),
    pointStyle("router", ROUTER_COLOR, 1.1),
    pointStyle("infra-BLOCK", INFRA_COLORS.BLOCK),
    pointStyle("infra-GP", INFRA_COLORS.GP),
    pointStyle("equipment-router", EQUIPMENT_COLORS.router),
    pointStyle("equipment-misc", EQUIPMENT_COLORS.misc),
    ...Object.entries(RESTORATION_COLORS).map(([key, color]) => lineStyle(`section-${key}`, color, 6, "99")),
    ...Object.entries(STATUS_COLORS).map(([key, color]) => lineStyle(`sub-${key}`, color, 3)),
    ...Object.entries(MEDIA_KIND).map(([key, k]) => pointStyle(`media-${key}`, k.color, 0.7)),
  ];
  const kmlStyles = new Set();

  const blockFolders = blocks.map((data) => {
    const { profile } = data;
    const roads = roadsByBlock[profile._id];
    const router = toPoint(profile.blockRouter?.latitude, profile.blockRouter?.longitude);
    const parts = [];

    if (layers.router && router) {
      const description = [SITE_TYPES[profile.blockRouter?.siteType], profile.blockRouter?.address].filter(Boolean).join(" · ");
      parts.push(placemark({ name: "Block router", description, style: "router", point: router }));
    }
    if (on.gps) {
      parts.push(
        folder(
          "GPs",
          profile.gps
            .map((gp) => ({ gp, point: toPoint(gp.latitude, gp.longitude) }))
            .filter(({ point }) => point)
            .map(({ gp, point }) => placemark({ name: titleCase(gp.name), description: `LGD ${gp.lgdCode}`, style: "gp", point }))
        )
      );
    }
    if (on.sections) {
      parts.push(
        folder(
          "Sections",
          (data.sections || [])
            .filter((s) => s.from && s.to)
            .map((s) =>
              placemark({
                name: s.name,
                description: [`${s.fromName || ""} → ${s.toName || ""}`, s.sectionLength ? `${s.sectionLength} m` : ""].filter(Boolean).join(" · "),
                style: `section-${s.restorationStatus || "LOCKED"}`,
                path: roadOf(roads, "sections", s),
              })
            )
        )
      );
    }
    if (on.subsections) {
      parts.push(
        folder(
          "Subsections",
          on.subs(data).flatMap((s) => {
            const style = `sub-${subKey(s) || "NOT_STARTED"}`;
            const description = [config?.types?.[s.typeOfWork]?.full, statusLabel(subKey(s)), s.roadName].filter(Boolean).join(" · ");
            const executed = [s.start, ...s.entries, s.end].filter(Boolean);
            return [
              s.from && s.to ? placemark({ name: `${s.name} (planned)`, description, style, path: roadOf(roads, "subsections", s) }) : "",
              executed.length > 1 ? placemark({ name: `${s.name} (executed)`, description, style, path: executed }) : "",
            ].filter(Boolean);
          })
        )
      );
    }
    if (on.infra) {
      parts.push(
        folder(
          "Infra captures",
          (data.infra || [])
            .filter((i) => Number.isFinite(i.lat) && on.infraLevel(i.level))
            .map((i) => placemark({ name: titleCase(i.name), description: `${i.level === "BLOCK" ? "Block" : "GP"} infra · ${i.photoCount} photos`, style: `infra-${i.level}`, point: i }))
        )
      );
    }
    if (on.equipmentForms.length) {
      parts.push(
        folder(
          "Equipment",
          (data.equipment || [])
            .filter((e) => Number.isFinite(e.lat) && on.equipmentForms.includes(e.form))
            .map((e) =>
              placemark({
                name: [EQUIPMENT_FORMS[e.form].title, titleCase(e.name)].join(" · "),
                description: e.assetCode,
                style: e.form === "misc" ? "equipment-misc" : "equipment-router",
                point: e,
              })
            )
        )
      );
    }
    if (on.kml) {
      parts.push(
        ...profile.kmlFiles.map((file, index) => {
          const style = `kml-${index % 6}`;
          if (!kmlStyles.has(style)) {
            kmlStyles.add(style);
            styles.push(lineStyle(style, kmlColor(index), 4), pointStyle(`${style}-pt`, kmlColor(index), 0.7));
          }
          const render = (f) => {
            const name = f.title || f.properties?.name || "";
            // A feature the source KML styled keeps its own colours
            const st = kmlStyleOf(f, kmlColor(index));
            const own = st.styled
              ? `<Style><LineStyle><color>${kmlHex(st.strokeColor, alphaOf(st.strokeOpacity))}</color><width>${st.strokeWeight}</width></LineStyle>` +
                `<PolyStyle><color>${kmlHex(st.fillColor, alphaOf(st.fillOpacity))}</color></PolyStyle>` +
                `<IconStyle><color>${kmlHex(st.point.color, alphaOf(st.point.opacity))}</color><scale>${st.point.scale}</scale>${st.point.iconUrl ? `<Icon><href>${esc(st.point.iconUrl)}</href></Icon>` : ""}</IconStyle></Style>`
              : "";
            const ref = (id) => (own ? undefined : id);
            if (f.type === "marker") return [placemark({ name, style: ref(`${style}-pt`), inlineStyle: own, point: f.position })];
            if (f.type === "polyline") return [placemark({ name, style: ref(style), inlineStyle: own, path: f.path })];
            if (f.type === "polygon") return [placemark({ name, style: ref(style), inlineStyle: own, polygon: f.paths })];
            return [];
          };
          // The file's own layers (folders) stay as folders
          return folder(file.name, layerFolders(kml[file._id] || [], render));
        })
      );
    }
    if (on.media) {
      parts.push(
        folder(
          "Attachments",
          on.mediaOf(data).map((m) =>
            placemark({ name: m.label || MEDIA_KIND[m.kind]?.label, description: `${m.fileType === "VIDEO" ? "Video" : "Photo"} · ${m.url}`, style: `media-${m.kind}`, point: m })
          )
        )
      );
    }

    return folder(`${titleCase(profile.block)} (${profile.blockCode})`, parts.filter(Boolean));
  });

  const document = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Master Map ${today()}</name>${styles.join("")}${blockFolders.join("")}</Document></kml>`;

  const url = URL.createObjectURL(new Blob([document], { type: "application/vnd.google-earth.kml+xml" }));
  const link = Object.assign(window.document.createElement("a"), { href: url, download: `master-map_${today()}.kml` });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
