// Excel and KML exports of what the master map shows: the picked blocks, with the layers
// and filters that are on. The zoom doesn't matter; a layer that's on exports in full.
import * as XLSX from "xlsx";
import { titleCase } from "../execution/execConstants";
import { MEDIA_KIND, RESTORATION_COLORS, STATUS_COLORS, ROUTER_COLOR, GP_COLOR, INFRA_COLORS, EQUIPMENT_COLORS, REF_COLOR, RING_COLOR } from "../blockProfile/blockMapLayers";
import { SITE_TYPES, routerName } from "../blockProfile/blockProfileConstants";
import { kmlStyleOf } from "../mapViewPage/utils/kmlUtils";
import { EQUIPMENT_FORMS, formFields, miscItemsOf, miscTypeLabel } from "../blockProfile/equipmentForms";
import { EQUIPMENT_FORMS_ON_MAP, kmlColor, pathLengthM, subKey, toPoint } from "./masterMapLayers";

// A section or subsection along its road from the KML; one without a road isn't exported as a line
const roadOf = (roads, kind, item) => roads?.[kind].get(String(item._id)) || null;

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
          "Road length from KML (m)": roadOf(roadsByBlock[data.profile._id], "sections", s) ? metres(pathLengthM(roadOf(roadsByBlock[data.profile._id], "sections", s))) : "",
          "Not on the KML road because": roadsByBlock[data.profile._id]?.problems.get(String(s._id)) || "",
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

// One "Label: value" line per value that's set, for a placemark's description
const lines = (pairs) =>
  pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => (k ? `${k}: ${v}` : String(v)))
    .join("\n");

const placemark = ({ name, description, style, inlineStyle, point, path, polygon }) => {
  const geometry = point
    ? `<Point><coordinates>${coords([point])}</coordinates></Point>`
    : path
      ? `<LineString><tessellate>1</tessellate><coordinates>${coords(path)}</coordinates></LineString>`
      : `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coords([...polygon, polygon[0]])}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
  return `<Placemark><name>${esc(name)}</name>${description ? `<description>${esc(description)}</description>` : ""}${style ? `<styleUrl>#${style}</styleUrl>` : ""}${inlineStyle || ""}${geometry}</Placemark>`;
};

// A folder; `open` shows its contents in Google Earth's list straight away
const folder = (name, items, { open = false, description } = {}) =>
  items.filter(Boolean).length
    ? `<Folder><name>${esc(name)}</name>${open ? "<open>1</open>" : ""}${description ? `<description>${esc(description)}</description>` : ""}${items.filter(Boolean).join("")}</Folder>`
    : "";

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

const PIT_COLORS = { A: "#15803d", B: "#b91c1c" };

// Shared by every export: one style per kind of thing
const baseStyles = () => [
  pointStyle("gp", GP_COLOR),
  pointStyle("router", ROUTER_COLOR, 1.1),
  pointStyle("infra-BLOCK", INFRA_COLORS.BLOCK),
  pointStyle("infra-GP", INFRA_COLORS.GP),
  pointStyle("equipment-router", EQUIPMENT_COLORS.router),
  pointStyle("equipment-misc", EQUIPMENT_COLORS.misc),
  pointStyle("pit-A", PIT_COLORS.A, 1),
  pointStyle("pit-B", PIT_COLORS.B, 1),
  pointStyle("ref", REF_COLOR, 0.6),
  lineStyle("ref-line", REF_COLOR, 1.5, "b3"),
  lineStyle("ring", RING_COLOR, 3),
  ...Object.entries(RESTORATION_COLORS).map(([key, color]) => lineStyle(`section-${key}`, color, 6, "99")),
  ...Object.entries(STATUS_COLORS).flatMap(([key, color]) => [lineStyle(`sub-${key}`, color, 3), pointStyle(`entry-${key}`, color, 0.5)]),
  ...Object.entries(MEDIA_KIND).map(([key, k]) => pointStyle(`media-${key}`, k.color, 0.7)),
];

/** Ring links from the GP equipment sheets (previous → next node), along the KML road */
const ringLinksOf = (data, roads) => {
  const { profile } = data;
  const equipment = (data.equipment || []).filter((e) => Number.isFinite(e.lat));
  const router = toPoint(profile.blockRouter?.latitude, profile.blockRouter?.longitude);
  const position = (code) => {
    if (code === profile.blockCode) {
      const e = equipment.find((x) => x.form === "block");
      return e ? { lat: e.lat, lng: e.lng } : router;
    }
    const e = equipment.find((x) => x.form === "gp" && x.gpLgdCode === code);
    if (e) return { lat: e.lat, lng: e.lng };
    const gp = (profile.gps || []).find((g) => g.lgdCode === code);
    return gp ? toPoint(gp.latitude, gp.longitude) : null;
  };
  const nameOf = (code) => (code === profile.blockCode ? routerName(profile) : titleCase((profile.gps || []).find((g) => g.lgdCode === code)?.name || code));
  const links = new Map();
  const add = (from, to, distanceM) => {
    if (!from || !to || from === to || links.has(`${from}>${to}`)) return;
    const path = roads?.route(position(from), position(to));
    if (path) links.set(`${from}>${to}`, { name: `${nameOf(from)} → ${nameOf(to)}`, path, distanceM });
  };
  equipment
    .filter((e) => e.form === "gp")
    .forEach((e) => {
      add(e.prevNode, e.gpLgdCode, e.prevNodeDistanceM);
      add(e.gpLgdCode, e.nextNode, e.nextNodeDistanceM);
    });
  return [...links.values()];
};

/**
 * One block as a KML folder: its uploaded KML files with their own layers, then the
 * network, ring links, sections (each with its subsections, pits, entries and reference
 * points), infra, equipment and attachments. `on` says which of them go in.
 */
const blockFolder = (data, kml, { on, config, roads, styles, kmlStyles }) => {
  const { profile } = data;
  const statusLabel = (key) => (key === "LEGACY" ? "Older (trenching)" : config?.statuses?.[key]?.label || key);
  const restorationLabel = (key) => config?.restorationStates?.[key]?.label || key || "";
  const typeLabel = (key) => config?.types?.[key]?.full || key || "";
  const router = toPoint(profile.blockRouter?.latitude, profile.blockRouter?.longitude);
  const parts = [];

  if (on.kml) {
    parts.push(
      folder(
        "Uploaded KML",
        profile.kmlFiles.map((file, index) => {
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
      )
    );
  }

  const network = [];
  if (on.router && router) {
    network.push(placemark({ name: routerName(profile), description: lines([["", SITE_TYPES[profile.blockRouter?.siteType]], ["", profile.blockRouter?.address], ["Block LGD", profile.blockCode]]), style: "router", point: router }));
  }
  if (on.gps) {
    network.push(
      folder(
        "Gram Panchayats",
        profile.gps
          .map((gp) => ({ gp, point: toPoint(gp.latitude, gp.longitude) }))
          .filter(({ point }) => point)
          .map(({ gp, point }) => placemark({ name: titleCase(gp.name), description: lines([["LGD", gp.lgdCode], ["Ring", gp.ringCode]]), style: "gp", point }))
      )
    );
  }
  parts.push(folder("Network", network));

  if (on.rings) {
    parts.push(
      folder(
        "Ring links",
        ringLinksOf(data, roads).map((link) =>
          placemark({ name: link.name, description: link.distanceM != null ? `Optical length ${metres(link.distanceM)} m` : "Optical length not entered", style: "ring", path: link.path })
        )
      )
    );
  }

  // A subsection: planned line, executed path, pits, entries and reference points
  const subFolder = (s) => {
    const key = subKey(s) || "NOT_STARTED";
    const description = lines([
      ["Type of work", typeLabel(s.typeOfWork)],
      ["Status", statusLabel(subKey(s))],
      ["Road", s.roadName],
      ["Entered length", s.subSectionLength ? `${metres(s.subSectionLength)} m` : ""],
      ["Calculated length", s.calculatedLength != null ? `${s.calculatedLength} m` : ""],
      ["Executed", `${metres(s.entries.reduce((n, e) => n + (Number(e.length) || 0), 0))} m in ${s.entries.length} ${s.entries.length === 1 ? "entry" : "entries"}`],
    ]);
    const planned = roads?.subsections.get(String(s._id));
    const executed = [s.start, ...s.entries, s.end].filter(Boolean);
    const pitTitle = (which) => config?.types?.[s.typeOfWork]?.[which === "A" ? "pitA" : "pitB"] || (which === "A" ? "Start" : "End");
    const pits = [
      ["A", s.start],
      ["B", s.end],
    ].filter(([, pit]) => pit);
    const refs = pits.flatMap(([which, pit]) =>
      pit.refs.map((r, i) => [
        placemark({
          name: `${which} · ${r.description || `Reference ${i + 1}`}`,
          description: lines([["Tape", r.tapeDistanceM != null ? `${r.tapeDistanceM} m` : ""], ["GPS", r.gpsDistanceM != null ? `${r.gpsDistanceM} m` : ""]]),
          style: "ref",
          point: r,
        }),
        placemark({ name: `${which} · ${r.description || `Reference ${i + 1}`} (tape)`, style: "ref-line", path: [pit, r] }),
      ]).flat()
    );
    let run = 0;
    return folder(
      s.name || "Subsection",
      [
        planned ? placemark({ name: "Planned line (along the KML road)", description, style: `sub-${key}`, path: planned }) : "",
        executed.length > 1 ? placemark({ name: "Executed path", description, style: `sub-${key}`, path: executed }) : "",
        ...pits.map(([which, pit]) => placemark({ name: `${which} · ${pitTitle(which)}`, description: lines([["At", pit.at ? new Date(pit.at).toLocaleString("en-IN") : ""]]), style: `pit-${which}`, point: pit })),
        folder(
          "Entries",
          s.entries.map((e, i) => {
            run += Number(e.length) || 0;
            return placemark({
              name: `#${i + 1} · ${metres(run)} m`,
              description: lines([
                ["Length", e.length != null ? `${e.length} m` : ""],
                ["Depth", e.depth != null ? `${e.depth} m` : ""],
                ["Offset", e.offset != null ? `${e.offset} m` : ""],
                ["Side", e.side],
                ["Protection", e.protection],
                ["Landmark", e.landmark],
                ["Remarks", e.remarks],
                ["Captured", e.capturedAt ? new Date(e.capturedAt).toLocaleString("en-IN") : ""],
              ]),
              style: `entry-${key}`,
              point: e,
            });
          })
        ),
        folder("Reference points", refs),
      ],
      { description }
    );
  };

  const subs = on.subsections ? on.subs(data) : [];
  if (on.sections || on.subsections) {
    const sectionIds = new Set((data.sections || []).map((s) => String(s._id)));
    const sectionFolders = (data.sections || []).map((s) => {
      const road = roads?.sections.get(String(s._id));
      const description = lines([
        ["", `${s.fromName || ""} → ${s.toName || ""}`],
        ["Length", s.sectionLength ? `${metres(s.sectionLength)} m` : ""],
        ["Road length from the KML", road ? `${metres(pathLengthM(road))} m` : ""],
        ["Not on the KML road", road ? "" : roads?.problems.get(String(s._id))],
        ["Restoration", restorationLabel(s.restorationStatus)],
      ]);
      const mine = subs.filter((sub) => String(sub.sectionId) === String(s._id));
      return folder(
        s.name,
        [on.sections && road ? placemark({ name: "Route (along the KML road)", description, style: `section-${s.restorationStatus || "LOCKED"}`, path: road }) : "", folder("Subsections", mine.map(subFolder))],
        { description }
      );
    });
    const orphans = subs.filter((sub) => !sectionIds.has(String(sub.sectionId)));
    parts.push(folder("Sections", [...sectionFolders, folder("Other subsections", orphans.map(subFolder))]));
  }

  if (on.infra) {
    const infra = (data.infra || []).filter((i) => Number.isFinite(i.lat) && on.infraLevel(i.level));
    const infraMark = (i) => placemark({ name: titleCase(i.name), description: lines([["Photos", i.photoCount], ["GP LGD", i.gpLgdCode]]), style: `infra-${i.level}`, point: i });
    parts.push(folder("Infra captures", [folder("Block", infra.filter((i) => i.level === "BLOCK").map(infraMark)), folder("GPs", infra.filter((i) => i.level === "GP").map(infraMark))]));
  }
  if (on.equipmentForms.length) {
    const equipment = (data.equipment || []).filter((e) => Number.isFinite(e.lat) && on.equipmentForms.includes(e.form));
    parts.push(
      folder(
        "Equipment",
        on.equipmentForms.map((form) =>
          folder(
            EQUIPMENT_FORMS[form].title,
            equipment
              .filter((e) => e.form === form)
              .map((e) => placemark({ name: titleCase(e.name), description: lines([["Asset code", e.assetCode], ["GP LGD", e.gpLgdCode]]), style: form === "misc" ? "equipment-misc" : "equipment-router", point: e }))
          )
        )
      )
    );
  }
  if (on.media) {
    const media = on.mediaOf(data);
    parts.push(
      folder(
        "Attachments",
        Object.entries(MEDIA_KIND).map(([kind, k]) =>
          folder(
            k.label,
            media
              .filter((m) => m.kind === kind)
              .map((m) =>
                placemark({
                  name: m.label || k.label,
                  description: lines([["", m.fileType === "VIDEO" ? "Video" : "Photo"], ["Captured", m.capturedAt ? new Date(m.capturedAt).toLocaleString("en-IN") : ""], ["", m.url]]),
                  style: `media-${kind}`,
                  point: m,
                })
              )
          )
        )
      )
    );
  }

  return folder(`${titleCase(profile.block)} (${profile.blockCode})`, parts, { open: true });
};

const downloadKml = (name, body, styles, fileName) => {
  const document = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(name)}</name>${styles.join("")}${body}</Document></kml>`;
  const url = URL.createObjectURL(new Blob([document], { type: "application/vnd.google-earth.kml+xml" }));
  const link = Object.assign(window.document.createElement("a"), { href: url, download: fileName });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportMasterMapKml = (blocks, kml, { layers, filters, config, roadsByBlock = {} }) => {
  const on = { ...include(blocks, { layers, filters }), router: layers.router, rings: layers.rings };
  const styles = baseStyles();
  const kmlStyles = new Set();
  const body = blocks.map((data) => blockFolder(data, kml, { on, config, roads: roadsByBlock[data.profile._id], styles, kmlStyles })).join("");
  downloadKml(`Master Map ${today()}`, body, styles, `master-map_${today()}.kml`);
};

/**
 * The block's final KML: the KML files as uploaded, with their own layers (folders) and
 * styles, plus everything recorded on the block, each kind in its own folder. Every layer
 * goes in, whatever is switched on in the map's panel.
 */
export const exportBlockKml = (data, kml, { config, roads }) => {
  const on = {
    router: true,
    gps: true,
    rings: true,
    sections: true,
    subsections: true,
    infra: true,
    infraLevel: () => true,
    equipmentForms: EQUIPMENT_FORMS_ON_MAP.map((f) => f.key),
    kml: true,
    media: true,
    subs: (d) => d.subsections || [],
    mediaOf: (d) => d.media || [],
  };
  const styles = baseStyles();
  const body = blockFolder(data, kml, { on, config, roads, styles, kmlStyles: new Set() });
  const slug = `${data.profile.block || "block"}-${data.profile.blockCode || ""}`.replace(/[^\w-]+/g, "_");
  downloadKml(`${titleCase(data.profile.block)} (${data.profile.blockCode}) · ${today()}`, body, styles, `${slug}_${today()}.kml`);
};
