import React, { useEffect, useRef } from "react";
import { Polyline, Polygon, Marker, InfoWindow } from "@react-google-maps/api";
import { Button } from "@mui/material";
import { parseKMLContent, fetchKMLContentFromURL, inHiddenLayer, kmlPointIcon, kmlStyleOf } from "../utils/kmlUtils";

const DEFAULT_COLOR = "#00FF00";

// `color`, `onLoad` and `hiddenLayers` are optional: the block profile map draws each file
// in its own colour, reads the parsed features (with any files that failed) for bounds and
// its layer list, and hides the KML folders (layers) switched off there.
const KMLLayer = ({ loadedKMLs, map, color = DEFAULT_COLOR, onLoad, hiddenLayers }) => {
  const onLoadRef = useRef(onLoad);
  useEffect(() => {
    onLoadRef.current = onLoad;
  });
  const [parsedFeatures, setParsedFeatures] = React.useState([]);
  const [selectedFeature, setSelectedFeature] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    if (!loadedKMLs || loadedKMLs.length === 0) {
      setParsedFeatures([]);
      setError(null);
      return;
    }

    const processKMLs = async () => {
      setLoading(true);
      setError(null);
      const allFeatures = [];
      const failed = [];

      try {
        // Process each KML
        for (const [kmlIndex, kml] of loadedKMLs.entries()) {
          try {
            let kmlContent;

            // Check if content is a URL or actual KML content
            if (
              kml.content.startsWith("http://") ||
              kml.content.startsWith("https://")
            ) {
              // Fetch content from URL
              kmlContent = await fetchKMLContentFromURL(kml.content);
            } else {
              // Content is already KML text
              kmlContent = kml.content;
            }

            const features = parseKMLContent(kmlContent);

            // Add KML source info to each feature
            features.forEach((feature) => {
              feature.kmlSource = kml.name;
              feature.kmlIndex = kmlIndex;
            });

            allFeatures.push(...features);
          } catch (kmlError) {
            failed.push(kml.name);
            console.error(`Error processing KML ${kml.name}:`, kmlError);
            // Continue processing other KMLs even if one fails
          }
        }

        setParsedFeatures(allFeatures);
        onLoadRef.current?.({ features: allFeatures, failed });
      } catch (generalError) {
        console.error("Error processing KMLs:", generalError);
        setError("Failed to load some KML files");
      } finally {
        setLoading(false);
      }
    };

    processKMLs();
  }, [loadedKMLs]);

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
  };

  const handleInfoWindowClose = () => {
    setSelectedFeature(null);
  };

  // Each feature in the colours its KML gives it (line colour, width and opacity, fill,
  // icon colour or image); `color` only for what the KML leaves unstyled
  const lineOptions = (feature) => {
    const s = kmlStyleOf(feature, color);
    return { strokeColor: s.strokeColor, strokeOpacity: s.strokeOpacity, strokeWeight: s.strokeWeight, clickable: true };
  };
  const polygonOptions = (feature) => {
    const s = kmlStyleOf(feature, color);
    return { strokeColor: s.strokeColor, strokeOpacity: s.strokeOpacity, strokeWeight: Math.min(s.strokeWeight, 3), fillColor: s.fillColor, fillOpacity: s.fillOpacity, clickable: true };
  };

  // Show loading indicator if processing KMLs
  if (loading) {
    console.log("Loading KML features...");
  }

  // Show error if there was a problem
  if (error) {
    console.error("KML loading error:", error);
  }

  return (
    <>
      {parsedFeatures.filter((feature) => !inHiddenLayer(feature, hiddenLayers)).map((feature) => {
        switch (feature.type) {
          case "marker":
            return (
              <Marker
                key={feature.id}
                position={feature.position}
                title={feature.title}
                options={{ icon: kmlPointIcon(feature, color) }}
                onClick={() => handleFeatureClick(feature)}
              />
            );

          case "polyline":
            return (
              <Polyline
                key={feature.id}
                path={feature.path}
                options={lineOptions(feature)}
                onClick={() => handleFeatureClick(feature)}
              />
            );

          case "polygon":
            return (
              <Polygon
                key={feature.id}
                paths={feature.paths}
                options={polygonOptions(feature)}
                onClick={() => handleFeatureClick(feature)}
              />
            );

          default:
            return null;
        }
      })}

      {selectedFeature && (
        <InfoWindow
          position={
            selectedFeature.type === "marker"
              ? selectedFeature.position
              : selectedFeature.path
              ? selectedFeature.path[0]
              : selectedFeature.paths[0]
          }
          onCloseClick={handleInfoWindowClose}
        >
          {/* close button */}
          <Button onClick={handleInfoWindowClose}>Close</Button>
          <div style={{ maxWidth: "300px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#333" }}>
              {selectedFeature.title}
            </h4>
            <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#666" }}>
              <strong>Source:</strong> {selectedFeature.kmlSource}
            </p>
            {selectedFeature.properties.description && (
              <div style={{ fontSize: "14px", color: "#333" }}>
                <strong>Description:</strong>
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedFeature.properties.description.value,
                  }}
                />
              </div>
            )}
            {Object.entries(selectedFeature.properties).map(([key, value]) => {
              if (
                key !== "name" &&
                key !== "title" &&
                key !== "description" &&
                value
              ) {
                return (
                  <p
                    key={key}
                    style={{ margin: "4px 0", fontSize: "12px", color: "#666" }}
                  >
                    <strong>{key}:</strong> {value}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export default KMLLayer;
