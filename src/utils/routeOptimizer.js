// Function to get actual driving distance between two points using Google Distance Matrix API
const getActualDistance = async (origin, destination, isSelected) => {
  const service = new google.maps.DistanceMatrixService();

  try {
    if (!isSelected) {
      return calculateHaversineDistance(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      );
    }

    const response = await new Promise((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [{ lat: origin.latitude, lng: origin.longitude }],
          destinations: [
            { lat: destination.latitude, lng: destination.longitude },
          ],
          travelMode: google.maps.TravelMode.WALKING,
        },
        (response, status) => {
          if (status === "OK") {
            resolve(response);
          } else {
            reject(new Error(`Distance Matrix failed: ${status}`));
          }
        }
      );
    });

    if (response.rows[0].elements[0].status === "OK") {
      return response.rows[0].elements[0].distance.value; // Returns distance in meters
    }
    // If route not found, fallback to Haversine distance
    return (
      calculateHaversineDistance(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      ) * 1000
    ); // Convert km to meters for consistency
  } catch (error) {
    console.warn(
      "Failed to get actual distance, falling back to Haversine:",
      error
    );
    // Fallback to Haversine distance if API fails
    return (
      calculateHaversineDistance(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      ) * 1000
    ); // Convert km to meters for consistency
  }
};

// Renamed original distance function for clarity
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Function to find the nearest unvisited point using actual road distances
const findNearestPoint = async (currentPoint, points, visited) => {
  let minDistance = Infinity;
  let nearestIndex = -1;

  // Process all unvisited points in parallel for efficiency
  const distancePromises = points.map(async (point, index) => {
    if (!visited[index]) {
      const distance = await getActualDistance(currentPoint, point);
      return { index, distance };
    }
    return null;
  });

  const distances = await Promise.all(distancePromises);

  distances.forEach((result) => {
    if (result && result.distance < minDistance) {
      minDistance = result.distance;
      nearestIndex = result.index;
    }
  });

  return nearestIndex;
};

// Main function to optimize the route
export const optimizeRoute = async (routePoints, isSelected) => {
  const bhqIndex = routePoints.findIndex((point) => point.type === "BHQ");
  if (bhqIndex === -1) return routePoints; // Return original route if no BHQ found

  const visited = new Array(routePoints.length).fill(false);
  const optimizedRoute = [];
  let currentPoint = routePoints[bhqIndex];
  let currentIndex = bhqIndex;

  // Add the starting point
  optimizedRoute.push(currentPoint);
  visited[currentIndex] = true;

  try {
    // Find the nearest point repeatedly
    while (optimizedRoute.length < routePoints.length) {
      const nextIndex = await findNearestPoint(
        currentPoint,
        routePoints,
        visited
      );
      if (nextIndex === -1) break;

      visited[nextIndex] = true;
      currentPoint = routePoints[nextIndex];
      optimizedRoute.push(currentPoint);
    }

    // Add the starting point again to complete the circuit
    optimizedRoute.push(routePoints[bhqIndex]);

    return optimizedRoute;
  } catch (error) {
    console.error("Route optimization failed:", error);
    return routePoints; // Return original route if optimization fails
  }
};
