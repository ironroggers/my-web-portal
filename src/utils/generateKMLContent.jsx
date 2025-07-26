// Helper function to calculate distance between two points
const calculateDistance = (point1, point2) => {
  const lat1 = point1.lat;
  const lon1 = point1.lng;
  const lat2 = point2.lat;
  const lon2 = point2.lng;

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in kilometers
  return d;
};

// Sort waypoints based on their order along the route path
const sortWaypointsByRouteOrder = (waypoints, routePath) => {
  if (!routePath || routePath.length === 0) {
    return waypoints;
  }

  const waypointsWithRoutePosition = waypoints.map((waypoint) => {
    let closestDistance = Infinity;
    let routeIndex = 0;

    // Find the closest point on the route path for this waypoint
    routePath.forEach((routePoint, index) => {
      const distance = calculateDistance(waypoint, routePoint);
      if (distance < closestDistance) {
        closestDistance = distance;
        routeIndex = index;
      }
    });

    return {
      ...waypoint,
      routeIndex,
      closestDistance,
    };
  });

  // Sort by route index (position along the route)
  return waypointsWithRoutePosition
    .sort((a, b) => a.routeIndex - b.routeIndex)
    .map(({ routeIndex, closestDistance, ...waypoint }) => waypoint);
};

// Extract route segment between two waypoints
const extractRouteSegment = (
  routePath,
  startWaypoint,
  endWaypoint,
  isClosingSegment = false
) => {
  if (!routePath || routePath.length === 0) {
    return [];
  }

  // Find indices of closest points on route for start and end waypoints
  let startIndex = 0;
  let endIndex = routePath.length - 1;
  let minStartDistance = Infinity;
  let minEndDistance = Infinity;

  routePath.forEach((routePoint, index) => {
    const startDistance = calculateDistance(startWaypoint, routePoint);
    const endDistance = calculateDistance(endWaypoint, routePoint);

    if (startDistance < minStartDistance) {
      minStartDistance = startDistance;
      startIndex = index;
    }

    if (endDistance < minEndDistance) {
      minEndDistance = endDistance;
      endIndex = index;
    }
  });

  // Handle wraparound case (closing segment from last waypoint to first)
  if (isClosingSegment && startIndex > endIndex) {
    // For closing segment, concatenate: from startIndex to end + from beginning to endIndex
    const segment1 = routePath.slice(startIndex);
    const segment2 = routePath.slice(0, endIndex + 1);
    return segment1.concat(segment2);
  }

  // Normal case - ensure start comes before end
  if (startIndex > endIndex) {
    [startIndex, endIndex] = [endIndex, startIndex];
  }

  // Extract the segment
  return routePath.slice(startIndex, endIndex + 1);
};

const generateKMLContent = (selectedLocations, routePath, waypoints, type) => {
  // Sort waypoints by their order along the route
  const sortedWaypoints = sortWaypointsByRouteOrder(waypoints, routePath);

  let kml = `<?xml version="1.0" encoding="UTF-8"?>
  <kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
      <name>${selectedLocations[0].location.block} - ${
    selectedLocations[0].location.district
  } ${type === "desktop" ? "OFC" : "Survey"} Route</name>
      <description>${
        type === "desktop" ? "Optimized OFC" : "Physical Survey"
      } Route for ${selectedLocations[0].location.block}, ${
    selectedLocations[0].location.district
  }</description>
      <Style id="routeStyle">
        <LineStyle>
          <color>${type === "desktop" ? "ff0000ff" : "ff00aaff"}</color>
          <width>4</width>
        </LineStyle>
      </Style>
      <Style id="waypointStyle">
        <IconStyle>
          <color>${type === "desktop" ? "ff0000ff" : "ff00aaff"}</color>
          <scale>1.0</scale>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
          </Icon>
        </IconStyle>
      </Style>`;

  // Create individual folders for each segment between consecutive waypoints
  // Include the closing segment from last waypoint back to first waypoint
  for (let i = 0; i < sortedWaypoints.length; i++) {
    const startWaypoint = sortedWaypoints[i];
    const endWaypoint = sortedWaypoints[(i + 1) % sortedWaypoints.length]; // Use modulo to wrap around to first waypoint
    const isClosingSegment = i === sortedWaypoints.length - 1;
    const segmentPath = extractRouteSegment(
      routePath,
      startWaypoint,
      endWaypoint,
      isClosingSegment
    );

    const segmentNumber = i + 1;

    kml += `
      <Folder>
        <name>Segment ${segmentNumber}: ${startWaypoint.name} → ${
      endWaypoint.name
    }${isClosingSegment ? " (Closing)" : ""}</name>
        <description>Route segment from ${startWaypoint.name} to ${
      endWaypoint.name
    }${isClosingSegment ? " - Completes the loop" : ""}</description>
        
        <!-- Route segment -->
        <Placemark>
          <name>Path ${segmentNumber}${
      isClosingSegment ? " (Closing)" : ""
    }</name>
          <description>Route from ${startWaypoint.name} to ${
      endWaypoint.name
    }</description>
          <styleUrl>#routeStyle</styleUrl>
          <LineString>
            <extrude>1</extrude>
            <tessellate>1</tessellate>
            <coordinates>`;

    segmentPath.forEach((point) => {
      kml += `
              ${point.lng},${point.lat},0`;
    });

    kml += `
            </coordinates>
          </LineString>
        </Placemark>
      </Folder>`;
  }

  // Create a separate folder for all waypoints
  kml += `
      <Folder>
        <name>Waypoints</name>
        <description>All waypoints for this route</description>`;

  sortedWaypoints.forEach((point, index) => {
    kml += `
        <Placemark>
          <name>${point.name}</name>
          <description>Waypoint ${index + 1}: ${point.name} (${
      point.type
    })</description>
          <styleUrl>#waypointStyle</styleUrl>
          <Point>
            <coordinates>${point.lng},${point.lat},0</coordinates>
          </Point>
        </Placemark>`;
  });

  kml += `
      </Folder>`;

  // If there's only one waypoint or no segments could be created, fall back to original behavior
  if (sortedWaypoints.length <= 1) {
    kml += `
      <Placemark>
        <name>${type === "desktop" ? "OFC" : "Survey"} Route (Complete)</name>
        <description>Complete optimized route</description>
        <styleUrl>#routeStyle</styleUrl>
        <LineString>
          <extrude>1</extrude>
          <tessellate>1</tessellate>
          <coordinates>`;

    routePath.forEach((point) => {
      kml += `
          ${point.lng},${point.lat},0`;
    });

    kml += `
          </coordinates>
        </LineString>
      </Placemark>`;

    sortedWaypoints.forEach((point, index) => {
      kml += `
      <Placemark>
        <name>${point.name}</name>
        <description>Point ${index + 1}: ${point.name} (${
        point.type
      })</description>
        <styleUrl>#waypointStyle</styleUrl>
        <Point>
          <coordinates>${point.lng},${point.lat},0</coordinates>
        </Point>
      </Placemark>`;
    });
  }

  kml += `
    </Document>
  </kml>`;

  return kml;
};

export default generateKMLContent;
