import JSZip from "jszip";

import * as toGeoJSON from "@tmcw/togeojson";

// Map features for one GeoJSON geometry: markers, polylines and polygons (multi-parts and
// MultiGeometry split into one feature each). `index` numbers the placemark.
const toMapFeatures = (geometry, properties, index) => {
  if (!geometry) return [];
  const point = (c) => ({ lat: c[1], lng: c[0] });
  const title = (fallback) => properties.name || properties.title || fallback;
  switch (geometry.type) {
    case "Point":
      return [{ type: "marker", id: `marker-${index}`, position: point(geometry.coordinates), properties, title: title(`Point ${index + 1}`) }];
    case "LineString":
      return [{ type: "polyline", id: `line-${index}`, path: geometry.coordinates.map(point), properties, title: title(`Line ${index + 1}`) }];
    case "Polygon":
      // Exterior ring only
      return [{ type: "polygon", id: `polygon-${index}`, paths: geometry.coordinates[0].map(point), properties, title: title(`Polygon ${index + 1}`) }];
    case "MultiLineString":
      return geometry.coordinates.map((line, i) => ({
        type: "polyline",
        id: `multiline-${index}-${i}`,
        path: line.map(point),
        properties,
        title: title(`Multi Line ${index + 1}-${i + 1}`),
      }));
    case "MultiPolygon":
      return geometry.coordinates.map((polygon, i) => ({
        type: "polygon",
        id: `multipolygon-${index}-${i}`,
        paths: polygon[0].map(point),
        properties,
        title: title(`Multi Polygon ${index + 1}-${i + 1}`),
      }));
    case "GeometryCollection":
      // KML MultiGeometry: each part becomes its own feature
      return geometry.geometries.flatMap((part, i) => toMapFeatures(part, properties, `${index}-${i}`));
    default:
      return [];
  }
};

/**
 * KML text -> map features. Each feature also carries `layers`: the ids of the KML folders
 * (layers) it sits in, outermost first, so a map can hide a folder and everything in it.
 * kmlLayers(features) lists those folders.
 */
export const parseKMLContent = (kmlContent) => {
  try {
    const kmlDoc = new DOMParser().parseFromString(kmlContent, "application/xml");
    const tree = toGeoJSON.kmlWithFolders(kmlDoc);
    const features = [];
    let placemarks = 0;
    let folders = 0;
    const walk = (node, ancestors) => {
      for (const child of node.children || []) {
        if (child.type === "folder") {
          const layer = {
            id: `layer-${folders++}`,
            name: String(child.meta?.name || "").trim() || "Untitled layer",
            // <visibility>0</visibility> on the folder: starts hidden
            hidden: String(child.meta?.visibility) === "0",
          };
          walk(child, [...ancestors, layer]);
        } else if (child.type === "Feature") {
          const index = placemarks++;
          toMapFeatures(child.geometry, child.properties || {}, index).forEach((f) =>
            features.push({ ...f, layers: ancestors.map((l) => l.id), layerInfo: ancestors })
          );
        }
      }
    };
    walk(tree, []);
    return features;
  } catch (error) {
    console.error("Error parsing KML:", error);
    return [];
  }
};

/**
 * The KML folders (layers) behind parsed features, in document order:
 * [{ id, name, depth, parentId, count, hidden }]. count includes the folders inside it.
 * Empty when the file has no folders.
 */
export const kmlLayers = (features) => {
  const byId = new Map();
  for (const f of features || []) {
    (f.layerInfo || []).forEach((layer, depth) => {
      if (!byId.has(layer.id)) byId.set(layer.id, { ...layer, depth, parentId: depth ? f.layerInfo[depth - 1].id : null, count: 0 });
      byId.get(layer.id).count += 1;
    });
  }
  return [...byId.values()].sort((a, b) => Number(a.id.slice(6)) - Number(b.id.slice(6)));
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const color = (value, fallback) => (HEX.test(String(value || "")) ? value : fallback);
const opacity = (value, fallback) => (Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : fallback);

/**
 * How the KML file itself styles a feature (its <Style> / <StyleMap>, shared or inline),
 * as map options; anything the KML leaves out comes from `fallback` (the file's colour).
 *   line:   { strokeColor, strokeOpacity, strokeWeight }
 *   polygon: the line options plus { fillColor, fillOpacity }
 *   point:  { color, opacity, scale, iconUrl } (iconUrl only for an image on the web)
 * `styled` says whether the KML gave this feature any colour of its own.
 */
export const kmlStyleOf = (feature, fallback = "#00FF00") => {
  const p = feature?.properties || {};
  const width = Number(p["stroke-width"]);
  const strokeColor = color(p.stroke, fallback);
  return {
    styled: HEX.test(String(p.stroke || "")) || HEX.test(String(p.fill || "")) || HEX.test(String(p["icon-color"] || "")),
    strokeColor,
    strokeOpacity: opacity(p["stroke-opacity"], 0.85),
    // KML widths are pixels; keep thin lines visible and wide ones sane
    strokeWeight: Number.isFinite(width) && width > 0 ? Math.min(Math.max(width, 1.5), 12) : 4,
    fillColor: color(p.fill, strokeColor),
    fillOpacity: opacity(p["fill-opacity"], 0.2),
    point: {
      color: color(p["icon-color"], fallback),
      opacity: opacity(p["icon-opacity"], 1),
      scale: Number.isFinite(Number(p["icon-scale"])) && Number(p["icon-scale"]) > 0 ? Math.min(Number(p["icon-scale"]), 3) : 1,
      iconUrl: /^https?:\/\//i.test(String(p.icon || "")) ? p.icon : null,
    },
  };
};

/**
 * A Google Maps marker icon for a KML point: the KML's own image when it links one on the
 * web, else a ring in its icon colour. `size` is the base size in pixels.
 */
export const kmlPointIcon = (feature, fallback, size = 24) => {
  const { point } = kmlStyleOf(feature, fallback);
  const px = Math.round(size * point.scale);
  if (point.iconUrl) return { url: point.iconUrl, scaledSize: new window.google.maps.Size(px, px) };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="${point.color}" fill-opacity="${point.opacity}" stroke="#ffffff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#ffffff"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(px, px),
    anchor: new window.google.maps.Point(px / 2, px / 2),
  };
};

/** Whether a feature is in a hidden layer (or one inside a hidden layer) */
export const inHiddenLayer = (feature, hidden) => Boolean(hidden?.size) && (feature.layers || []).some((id) => hidden.has(id));

/** The layers a file starts with hidden: those its KML marks invisible */
export const initiallyHiddenLayers = (features) => kmlLayers(features).filter((l) => l.hidden).map((l) => l.id);

const extractKMLFromKMZ = async (file) => {
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    // Look for KML files in the zip
    const kmlFiles = Object.keys(zipContent.files).filter(
      (filename) =>
        filename.toLowerCase().endsWith(".kml") &&
        !zipContent.files[filename].dir
    );

    if (kmlFiles.length === 0) {
      throw new Error("No KML files found in the KMZ archive");
    }

    // Use the first KML file found
    const kmlFile = zipContent.files[kmlFiles[0]];
    const kmlContent = await kmlFile.async("text");

    return {
      name: file.name,
      content: kmlContent,
      originalFileName: kmlFiles[0],
    };
  } catch (error) {
    throw new Error(`Error extracting KMZ file: ${error.message}`);
  }
};

// Function to fetch KML/KMZ content from URL
export const fetchKMLContentFromURL = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if it's a KMZ file based on URL or content type
    const contentType = response.headers.get("content-type") || "";
    const isKMZ =
      url.toLowerCase().includes(".kmz") ||
      contentType.includes("application/vnd.google-earth.kmz") ||
      contentType.includes("application/zip");

    if (isKMZ) {
      // Handle KMZ file
      const arrayBuffer = await response.arrayBuffer();
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(arrayBuffer);

      // Look for KML files in the zip
      const kmlFiles = Object.keys(zipContent.files).filter(
        (filename) =>
          filename.toLowerCase().endsWith(".kml") &&
          !zipContent.files[filename].dir
      );

      if (kmlFiles.length === 0) {
        throw new Error("No KML files found in the KMZ archive");
      }

      // Use the first KML file found
      const kmlFile = zipContent.files[kmlFiles[0]];
      const kmlContent = await kmlFile.async("text");
      return kmlContent;
    } else {
      // Handle KML file
      const kmlContent = await response.text();
      return kmlContent;
    }
  } catch (error) {
    console.error("Error fetching KML content from URL:", error);
    throw error;
  }
};

export { extractKMLFromKMZ };
