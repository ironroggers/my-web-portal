const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
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

const getActualDistance = async (origin, destination) => {
  const service = new window.google.maps.DistanceMatrixService();

  try {
    const response = await new Promise((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: window.google.maps.TravelMode.WALKING,
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
      return response.rows[0].elements[0].distance.value;
    }

    return (
      calculateHaversineDistance(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
      ) * 1000
    );
  } catch (error) {
    console.warn(
      "Failed to get actual distance, falling back to Haversine:",
      error
    );

    return (
      calculateHaversineDistance(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
      ) * 1000
    );
  }
};

const findNearestPoint = async (currentPoint, points, visited) => {
  let minDistance = Infinity;
  let nearestIndex = -1;

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

const sortedPoints = async (points) => {
  console.log("Original points:", points);

  if (!points || points.length <= 1) {
    return points;
  }

  let startIndex = points.findIndex((point) => point.type === "BHQ");
  if (startIndex === -1) {
    startIndex = 0;
  }

  const visited = new Array(points.length).fill(false);
  const optimizedRoute = [];
  let currentPoint = points[startIndex];
  let currentIndex = startIndex;

  optimizedRoute.push(currentPoint);
  visited[currentIndex] = true;

  try {
    while (optimizedRoute.length < points.length) {
      const nextIndex = await findNearestPoint(currentPoint, points, visited);
      if (nextIndex === -1) break;

      visited[nextIndex] = true;
      currentPoint = points[nextIndex];
      optimizedRoute.push(currentPoint);
    }

    console.log("Optimized points:", optimizedRoute);
    return optimizedRoute;
  } catch (error) {
    console.error("Route optimization failed:", error);
    return points;
  }
};

const getDirections = async (location, type) => {
  if (type !== "desktop") return location.directions;

  const directionsService = new window.google.maps.DirectionsService();
  let points = location.points;

  points = await sortedPoints(points);

  const origin = points[0];
  const destination = points[0];
  const waypoints = points
    .slice(1)
    .map((p) => ({ location: p, stopover: true }));

  const response = await directionsService.route({
    origin: origin,
    destination: destination,
    waypoints: waypoints,
    travelMode: window.google.maps.TravelMode.WALKING,
    optimizeWaypoints: true,
  });

  return response;
};

export default getDirections;
