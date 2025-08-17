import React, { useEffect, useState } from "react";
import { DirectionsRenderer, DirectionsService } from "@react-google-maps/api";
import { optimizeRoute } from "../../../utils/routeOptimizer";

export let OptimizedPoints = null;
export let DIRECTIONS = null;

const RouteDirections = ({
  route,
  isSelected,
  routeVisibility,
  routeColor,
  setDistance,
}) => {
  const [directions, setDirections] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOptimizedRoute = async () => {
      if (!route.location?.route || !routeVisibility.desktopSurvey) {
        setDistance(0);
        return;
      }

      try {
        // Optimize the route
        const optimizedPoints = await optimizeRoute(
          route.location.route,
          isSelected
        );

        OptimizedPoints = optimizedPoints;

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
              DIRECTIONS = result;
              setDirections(result);
              setError(null);

              // Calculate total distance
              let totalDistance = 0;
              if (result.routes && result.routes[0] && result.routes[0].legs) {
                result.routes[0].legs.forEach((leg) => {
                  totalDistance += leg.distance.value; // distance in meters
                });
              }
              setDistance(totalDistance);
            } else {
              setError(`Directions request failed: ${status}`);
              setDistance(0);
              console.error("Error fetching directions:", status);
            }
          }
        );
      } catch (error) {
        setError(`Route optimization failed: ${error.message}`);
        setDistance(0);
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
