import React, { useEffect, useState } from "react";
import { DirectionsRenderer } from "@react-google-maps/api";

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
    if (!routeVisibility.desktopSurvey) {
      setDistance(0);
      return;
    }

    // Prefer precomputed distances if available
    if (route?.routeInfo?.distance) {
      setDistance(route.routeInfo.distance);
      setDirections(route?.directions || null);
      setError(null);
      return;
    }

    // Fallback: compute distance from provided directions
    if (route?.directions?.routes?.[0]?.legs) {
      let totalDistance = 0;
      route.directions.routes[0].legs.forEach((leg) => {
        totalDistance += leg.distance.value;
      });
      setDistance(totalDistance);
      setDirections(route.directions);
      setError(null);
      return;
    }

    // If chunked and no aggregate provided, sum over chunks
    if (route?.isChunked && Array.isArray(route?.chunks)) {
      let totalDistance = 0;
      route.chunks.forEach((chunk) => {
        if (chunk?.routes?.[0]?.legs) {
          chunk.routes[0].legs.forEach((leg) => {
            totalDistance += leg.distance.value;
          });
        }
      });
      setDistance(totalDistance);
      setDirections(null);
      setError(null);
      return;
    }

    setDistance(0);
  }, [route, routeVisibility.desktopSurvey, setDistance]);

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

  if (route?.isChunked && Array.isArray(route?.chunks)) {
    return (
      <>
        {route.chunks.map((chunk, idx) => (
          <DirectionsRenderer
            key={`desktop-chunk-${idx}`}
            directions={chunk}
            options={options}
          />
        ))}
      </>
    );
  }

  return directions ? (
    <DirectionsRenderer directions={directions} options={options} />
  ) : null;
};

export default RouteDirections;
