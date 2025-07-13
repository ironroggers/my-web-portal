import JSZip from "jszip";

import * as toGeoJSON from "@tmcw/togeojson";

export const parseKMLContent = (kmlContent) => {
  try {
    // Parse KML string to DOM
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlContent, "application/xml");

    // Convert KML to GeoJSON
    const geoJson = toGeoJSON.kml(kmlDoc);

    // Process features for rendering
    const features = [];

    if (geoJson.features) {
      geoJson.features.forEach((feature, index) => {
        const geometry = feature.geometry;
        const properties = feature.properties || {};

        switch (geometry.type) {
          case "Point":
            features.push({
              type: "marker",
              id: `marker-${index}`,
              position: {
                lat: geometry.coordinates[1],
                lng: geometry.coordinates[0],
              },
              properties: properties,
              title:
                properties.name || properties.title || `Point ${index + 1}`,
            });
            break;

          case "LineString":
            features.push({
              type: "polyline",
              id: `line-${index}`,
              path: geometry.coordinates.map((coord) => ({
                lat: coord[1],
                lng: coord[0],
              })),
              properties: properties,
              title: properties.name || properties.title || `Line ${index + 1}`,
            });
            break;

          case "Polygon":
            // Handle exterior ring
            const exteriorRing = geometry.coordinates[0];
            features.push({
              type: "polygon",
              id: `polygon-${index}`,
              paths: exteriorRing.map((coord) => ({
                lat: coord[1],
                lng: coord[0],
              })),
              properties: properties,
              title:
                properties.name || properties.title || `Polygon ${index + 1}`,
            });
            break;

          case "MultiLineString":
            geometry.coordinates.forEach((lineCoords, lineIndex) => {
              features.push({
                type: "polyline",
                id: `multiline-${index}-${lineIndex}`,
                path: lineCoords.map((coord) => ({
                  lat: coord[1],
                  lng: coord[0],
                })),
                properties: properties,
                title:
                  properties.name ||
                  properties.title ||
                  `Multi Line ${index + 1}-${lineIndex + 1}`,
              });
            });
            break;

          case "MultiPolygon":
            geometry.coordinates.forEach((polygonCoords, polygonIndex) => {
              const exteriorRing = polygonCoords[0];
              features.push({
                type: "polygon",
                id: `multipolygon-${index}-${polygonIndex}`,
                paths: exteriorRing.map((coord) => ({
                  lat: coord[1],
                  lng: coord[0],
                })),
                properties: properties,
                title:
                  properties.name ||
                  properties.title ||
                  `Multi Polygon ${index + 1}-${polygonIndex + 1}`,
              });
            });
            break;
        }
      });
    }

    return features;
  } catch (error) {
    console.error("Error parsing KML:", error);
    return [];
  }
};

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

export { extractKMLFromKMZ };
