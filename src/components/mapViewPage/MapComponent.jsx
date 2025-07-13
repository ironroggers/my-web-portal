import React, { useState, useEffect } from "react";
import { GoogleMap } from "@react-google-maps/api";
import LocationRoutes from "./mapComponents/LocationRoutes";
import SurveyMarkers from "./mapComponents/SurveyMarkers";
import SurveyRoutes from "./mapComponents/SurveyRoutes";
import { Box } from "@mui/material";
import RouteVisibilityControls from "./mapComponents/RouteVisibilityControls.jsx";

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
}) => {
  const [routeVisibility, setRouteVisibility] = useState({
    desktopSurvey: true, // Blue OFC routes
    physicalSurvey: true, // Yellow survey routes
  });

  const [mapRoutes, setMapRoutes] = useState([]);

  useEffect(() => {
    if (locationRoutes) {
      setMapRoutes(
        selectedLocations.length > 0 ? selectedLocations : locationRoutes
      );
    }
  }, [locationRoutes, selectedLocations]);

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
        onLoad={onMapLoad}
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
      </GoogleMap>
    </Box>
  );
};

export default MapComponent;
