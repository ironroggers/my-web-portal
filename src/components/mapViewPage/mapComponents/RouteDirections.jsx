import React, { useEffect, useState } from "react";
import { DirectionsRenderer, DirectionsService } from "@react-google-maps/api";
import { optimizeRoute } from "../../../utils/routeOptimizer";

const RouteDirections = ({
  route,
  isSelected,
  routeVisibility,
  routeColor,
}) => {
  console.log(route, isSelected);
  const [directions, setDirections] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOptimizedRoute = async () => {
      if (!route.location?.route || !routeVisibility.desktopSurvey) return;

      try {
        // Optimize the route
        const optimizedPoints = await optimizeRoute(
          route.location.route,
          isSelected
        );

        // Create waypoints for the DirectionsService
        const waypoints = optimizedPoints.slice(1, -1).map((point) => ({
          location: { lat: point.latitude, lng: point.longitude },
          stopover: true,
        }));

        const origin = {
          lat: optimizedPoints[0].latitude,
          lng: optimizedPoints[0].longitude,
        };

        const destination = {
          lat: optimizedPoints[optimizedPoints.length - 1].latitude,
          lng: optimizedPoints[optimizedPoints.length - 1].longitude,
        };

        const directionsService = new google.maps.DirectionsService();

        directionsService.route(
          {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.WALKING,
          },
          (result, status) => {
            if (status === "OK") {
              setDirections(result);
              setError(null);
            } else {
              setError(`Directions request failed: ${status}`);
              console.error("Error fetching directions:", status);
            }
          }
        );
      } catch (error) {
        setError(`Route optimization failed: ${error.message}`);
        console.error("Error optimizing route:", error);
      }
    };

    fetchOptimizedRoute();
  }, [route.location, routeVisibility.desktopSurvey]);

  if (!routeVisibility.desktopSurvey || error) {
    return null;
  }

  const options = {
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: routeColor,
      strokeWeight: isSelected ? 10 : 6,
      strokeOpacity: isSelected ? 1 : 0.9,
    },
  };

  return directions ? (
    <DirectionsRenderer directions={directions} options={options} />
  ) : null;
};

export default RouteDirections;
