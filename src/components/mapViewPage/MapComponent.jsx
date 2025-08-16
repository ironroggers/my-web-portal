import React, { useState, useEffect } from "react";
import { GoogleMap } from "@react-google-maps/api";
import LocationRoutes from "./mapComponents/LocationRoutes";
import SurveyMarkers from "./mapComponents/SurveyMarkers";
import SurveyRoutes from "./mapComponents/SurveyRoutes";
import KMLLayer from "./mapComponents/KMLLayer";
import { Box } from "@mui/material";
import RouteVisibilityControls from "./mapComponents/RouteVisibilityControls.jsx";
import ReferenceKMLs from "./mapComponents/ReferenceKMLs.jsx";

const MapComponent = ({
  mapCenter,
  mapZoom,
  onMapLoad,
  handleMapClick,
  selectedLocations,
  locationRoutes,
  handleRemoveTemporaryPoint,
  handleRemoveOthersPoint,
  handleLocationMarkerClick,
  getSurveysForLocation,
  handleSurveyMarkerClick,
  surveys,
  surveyRoutes,
  locations,
  containerStyle,
  routeColor,
  surveyRouteColor,
  refreshLocations,
}) => {
  const [kmlLoading, setKmlLoading] = useState(false);
  const [routeVisibility, setRouteVisibility] = useState({
    desktopSurvey: true, // Blue OFC routes
    physicalSurvey: true, // Yellow survey routes
    addKML: false, // Green KML routes
  });

  const [mapRoutes, setMapRoutes] = useState([]);
  const [loadedKMLs, setLoadedKMLs] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);

  useEffect(() => {
    if (locationRoutes) {
      setMapRoutes(selectedLocations.length > 0 ? selectedLocations : []);
    }
  }, [locationRoutes, selectedLocations]);

  const handleMapLoad = (map) => {
    setMapInstance(map);
    if (onMapLoad) {
      onMapLoad(map);
    }
  };

  const handleKMLLoad = (name, content) => {
    const newKML = {
      name,
      content,
      id: Date.now(), // Simple ID for now
      visible: true, // Default to visible when loaded
    };
    setLoadedKMLs((prev) => [...prev, newKML]);
  };

  const handleKMLRemove = (index) => {
    setLoadedKMLs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKMLToggleVisibility = (index) => {
    setLoadedKMLs((prev) =>
      prev.map((kml, i) =>
        i === index ? { ...kml, visible: !kml.visible } : kml
      )
    );
  };

  const refreshKMLs = async (kmls) => {
    const newKMLs = kmls.map((kml) => {
      const existingKML = loadedKMLs.find((kml) => kml.name === kml.name);
      if (existingKML) {
        return existingKML;
      }

      const newKML = {
        name: kml.name,
        content: kml.content,
        id: Date.now(),
        visible: true,
      };

      return newKML;
    });
    setLoadedKMLs(newKMLs);
  };

  // Filter KMLs to only show visible ones
  const visibleKMLs = loadedKMLs.filter((kml) => kml.visible);

  useEffect(() => {
    let kmls = selectedLocations[0]?.location?.kml_urls;
    if (kmls) {
      kmls = kmls.map((kml) => ({
        name: kml.name,
        content: kml.content,
        id: Date.now(),
        visible: true,
      }));
      if (kmls) {
        setLoadedKMLs(kmls);
      }
    }
  }, [selectedLocations]);

  return (
    <Box>
      <RouteVisibilityControls
        routeVisibility={routeVisibility}
        setRouteVisibility={setRouteVisibility}
      />
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={handleMapLoad}
        onClick={handleMapClick}
      >
        <LocationRoutes
          mapRoutes={mapRoutes}
          selectedLocations={selectedLocations}
          routeVisibility={routeVisibility}
          routeColor={routeColor}
          handleRemoveTemporaryPoint={handleRemoveTemporaryPoint}
          handleRemoveOthersPoint={handleRemoveOthersPoint}
          handleLocationMarkerClick={handleLocationMarkerClick}
          getSurveysForLocation={getSurveysForLocation}
          handleSurveyMarkerClick={handleSurveyMarkerClick}
        />

        <SurveyMarkers
          surveys={surveys}
          handleSurveyMarkerClick={handleSurveyMarkerClick}
          isAllSurveys={true}
        />

        {routeVisibility.physicalSurvey && (
          <SurveyRoutes
            surveyRoutes={surveyRoutes}
            locations={locations}
            selectedLocations={selectedLocations}
            surveyRouteColor={surveyRouteColor}
          />
        )}

        <KMLLayer loadedKMLs={visibleKMLs} map={mapInstance} />
      </GoogleMap>

      {routeVisibility.addKML && selectedLocations.length > 0 && (
        <ReferenceKMLs
          onKMLLoad={handleKMLLoad}
          loadedKMLs={loadedKMLs}
          onKMLRemove={handleKMLRemove}
          onKMLToggleVisibility={handleKMLToggleVisibility}
          routeVisibility={routeVisibility}
          setRouteVisibility={setRouteVisibility}
          selectedLocations={selectedLocations}
          refreshLocations={refreshLocations}
          loading={kmlLoading}
          setLoading={setKmlLoading}
          refreshKMLs={refreshKMLs}
        />
      )}
    </Box>
  );
};

export default MapComponent;
