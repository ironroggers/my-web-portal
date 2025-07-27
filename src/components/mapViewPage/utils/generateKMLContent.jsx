const calculateDistance = (point1, point2) => {
  const lat1 = point1.lat;
  const lon1 = point1.lng;
  const lat2 = point2.lat;
  const lon2 = point2.lng;

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
  const d = R * c;
  return d;
};

const sortWaypointsByRouteOrder = (waypoints, routePath) => {
  if (!routePath || routePath.length === 0) {
    return waypoints;
  }

  const waypointsWithRoutePosition = waypoints.map((waypoint) => {
    let closestDistance = Infinity;
    let routeIndex = 0;

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

  return waypointsWithRoutePosition
    .sort((a, b) => a.routeIndex - b.routeIndex)
    .map(({ routeIndex, closestDistance, ...waypoint }) => waypoint);
};

const extractRouteSegment = (
  routePath,
  startWaypoint,
  endWaypoint,
  isClosingSegment = false
) => {
  if (!routePath || routePath.length === 0) {
    return [];
  }

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

  if (isClosingSegment && startIndex > endIndex) {
    const segment1 = routePath.slice(startIndex);
    const segment2 = routePath.slice(0, endIndex + 1);
    return segment1.concat(segment2);
  }

  if (startIndex > endIndex) {
    [startIndex, endIndex] = [endIndex, startIndex];
  }

  return routePath.slice(startIndex, endIndex + 1);
};

const generateKMLContent = (selectedLocations, routePath, waypoints, type) => {
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

  for (let i = 0; i < sortedWaypoints.length; i++) {
    const startWaypoint = sortedWaypoints[i];
    const endWaypoint = sortedWaypoints[(i + 1) % sortedWaypoints.length];
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
