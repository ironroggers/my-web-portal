import React from "react";
import { DirectionsRenderer } from "@react-google-maps/api";

const SurveyRoutes = ({
  surveyRoutes,
  locations,
  selectedLocations,
  surveyRouteColor,
}) => {
  return (
    <>
      {surveyRoutes.map((route, idx) => {
        if (!route.directions) return null;
        const locationData = locations.find(
          (loc) => loc._id === route.locationId
        );

        const isSelected =
          selectedLocations.length === 0 ||
          selectedLocations.some(
            (selected) => selected.location._id === locationData?._id
          );

        if (!isSelected) return null;

        const options = {
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: surveyRouteColor,
            strokeWeight: isSelected ? 6 : 4,
            strokeOpacity: 0.8,
            strokeDasharray: "5,5", // Create a dashed line
          },
        };

        if (route.isChunked && route.chunks) {
          return route.chunks.map((chunk, chunkIdx) => (
            <DirectionsRenderer
              key={`survey-chunk-${idx}-${chunkIdx}`}
              directions={chunk}
              options={options}
            />
          ));
        }

        return (
          <DirectionsRenderer
            key={`survey-route-${idx}`}
            directions={route.directions}
            options={options}
          />
        );
      })}
    </>
  );
};

export default SurveyRoutes; 