import React, { useEffect, useRef } from "react";
import { Polyline, Polygon, Marker, InfoWindow } from "@react-google-maps/api";
import { parseKMLContent } from "../utils/kmlUtils";

const KMLLayer = ({ loadedKMLs, map }) => {
  const [parsedFeatures, setParsedFeatures] = React.useState([]);
  const [selectedFeature, setSelectedFeature] = React.useState(null);

  useEffect(() => {
    if (!loadedKMLs || loadedKMLs.length === 0) {
      setParsedFeatures([]);
      return;
    }

    const allFeatures = [];
    loadedKMLs.forEach((kml, kmlIndex) => {
      const features = parseKMLContent(kml.content);
      // Add KML source info to each feature
      features.forEach((feature) => {
        feature.kmlSource = kml.name;
        feature.kmlIndex = kmlIndex;
      });
      allFeatures.push(...features);
    });

    setParsedFeatures(allFeatures);
  }, [loadedKMLs]);

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
  };

  const handleInfoWindowClose = () => {
    setSelectedFeature(null);
  };

  // Styling options for better visibility
  const polylineOptions = {
    strokeColor: "#00FF00", // Green color for KML routes
    strokeOpacity: 0.8,
    strokeWeight: 4,
    clickable: true,
  };

  const polygonOptions = {
    strokeColor: "#00FF00",
    strokeOpacity: 0.8,
    strokeWeight: 3,
    fillColor: "#00FF00",
    fillOpacity: 0.2,
    clickable: true,
  };

  const markerOptions = {
    icon: {
      url:
        "data:image/svg+xml;base64," +
        btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" fill="#00FF00" stroke="#006600" stroke-width="2"/>
          <circle cx="12" cy="12" r="4" fill="#ffffff"/>
        </svg>
      `),
      scaledSize: new window.google.maps.Size(24, 24),
    },
  };

  return (
    <>
      {parsedFeatures.map((feature) => {
        switch (feature.type) {
          case "marker":
            return (
              <Marker
                key={feature.id}
                position={feature.position}
                title={feature.title}
                options={markerOptions}
                onClick={() => handleFeatureClick(feature)}
              />
            );

          case "polyline":
            return (
              <Polyline
                key={feature.id}
                path={feature.path}
                options={polylineOptions}
                onClick={() => handleFeatureClick(feature)}
              />
            );

          case "polygon":
            return (
              <Polygon
                key={feature.id}
                paths={feature.paths}
                options={polygonOptions}
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
