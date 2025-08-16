import React from "react";
import RouteMarker from "./RouteMarker";
import RouteDirections from "./RouteDirections";
import SurveyMarkers from "./SurveyMarkers";

const LocationRoutes = ({
  mapRoutes,
  selectedLocations,
  routeVisibility,
  routeColor,
  handleRemoveTemporaryPoint,
  handleRemoveOthersPoint,
  handleLocationMarkerClick,
  getSurveysForLocation,
  handleSurveyMarkerClick,
  distance,
  setDistance,
}) => {
  return (
    <>
      {mapRoutes.map((route, idx) => {
        const isSelected = selectedLocations.some(
          (selected) =>
            selected.location &&
            route.location &&
            selected.location.block === route.location.block &&
            selected.location.district === route.location.district
        );

        if (selectedLocations.length > 0 && !isSelected) {
          return null;
        }

        return (
          <React.Fragment key={`routefrag-${idx}`}>
            {route.points.map((point, pidx) => (
              <RouteMarker
                key={`marker-${idx}-${pidx}`}
                point={point}
                route={route}
                pidx={pidx}
                isSelected={isSelected}
                routeColor={routeColor}
                handleRemoveTemporaryPoint={handleRemoveTemporaryPoint}
                handleRemoveOthersPoint={handleRemoveOthersPoint}
                handleLocationMarkerClick={handleLocationMarkerClick}
              />
            ))}

            <RouteDirections
              route={route}
              isSelected={isSelected}
              routeVisibility={routeVisibility}
              routeColor={routeColor}
              distance={distance}
              setDistance={setDistance}
            />

            {route.location && (
              <SurveyMarkers
                getSurveysForLocation={getSurveysForLocation}
                handleSurveyMarkerClick={handleSurveyMarkerClick}
                locationId={route.location._id}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default LocationRoutes; 