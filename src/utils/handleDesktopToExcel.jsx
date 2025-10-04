import * as XLSX from "xlsx";

const handleDesktopToExcel = ({
  selectedLocations,
  type,
  setSnackbar,
  handleExportClose,
  surveyRoutes,
  distance,
}) => {
  if (!selectedLocations || selectedLocations.length === 0) return;

  handleExportClose();

  // Build route points directly from the selected location's route
  const location = selectedLocations[0]?.location;
  const routePointsRaw = Array.isArray(location?.route) ? location.route : [];

  // Use directions and route info from selected location when available
  const desktopDirections = selectedLocations[0]?.directions || null;

  // Prepare ordered points and legs based on whether the route was chunked or not
  let routePointsForDistance = routePointsRaw;
  let legsToUse = null;

  // Helper to extract number lat/lng regardless of LatLng or plain object
  const getLat = (ll) => (typeof ll?.lat === "function" ? ll.lat() : Number(ll?.lat ?? ll?.latitude));
  const getLng = (ll) => (typeof ll?.lng === "function" ? ll.lng() : Number(ll?.lng ?? ll?.longitude));

  // If route is chunked, rebuild the full ordered vertex sequence and legs by flattening all chunks
  const isChunked = Boolean(selectedLocations?.[0]?.isChunked) && Array.isArray(selectedLocations?.[0]?.chunks) && selectedLocations[0].chunks.length > 0;
  if (isChunked) {
    const chunks = selectedLocations[0].chunks;

    const flattenedLegs = [];
    const visitedVertices = [];

    chunks.forEach((chunk, chunkIdx) => {
      const r = chunk?.routes?.[0];
      const legs = r?.legs || [];
      if (!legs.length) return;

      // For the first chunk include its starting vertex
      if (chunkIdx === 0) {
        const start = legs[0]?.start_location;
        if (start) {
          visitedVertices.push({ lat: getLat(start), lng: getLng(start) });
        }
      }

      legs.forEach((leg) => {
        flattenedLegs.push(leg);
        const end = leg?.end_location;
        if (end) {
          visitedVertices.push({ lat: getLat(end), lng: getLng(end) });
        }
      });
    });

    // Compress consecutive duplicate vertices to keep list small
    const compressedVertices = [];
    for (let i = 0; i < visitedVertices.length; i++) {
      const cur = visitedVertices[i];
      const prev = compressedVertices[compressedVertices.length - 1];
      if (
        !prev ||
        Math.abs(prev.lat - cur.lat) > 1e-6 ||
        Math.abs(prev.lng - cur.lng) > 1e-6
      ) {
        compressedVertices.push(cur);
      }
    }

    // Build a fast lookup map from rounded lat,lng to route point
    const keyOf = (lat, lng) => `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const pointMap = new Map();
    for (const p of routePointsRaw) {
      pointMap.set(keyOf(Number(p.latitude), Number(p.longitude)), p);
    }

    // Map visited vertices back to the rich route points (type/place) using coordinate match
    const MATCH_EPS = 1e-4; // tolerate tiny projection/rounding differences
    const matchPoint = (ll) =>
      routePointsRaw.find(
        (p) =>
          Math.abs(Number(p.latitude) - Number(ll.lat)) < MATCH_EPS &&
          Math.abs(Number(p.longitude) - Number(ll.lng)) < MATCH_EPS
      );

    const toRad = (deg) => (deg * Math.PI) / 180;
    const haversine = (a, b) => {
      const R = 6371e3;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const s1 = Math.sin(dLat / 2);
      const s2 = Math.sin(dLng / 2);
      const val = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
      return 2 * R * Math.atan2(Math.sqrt(val), Math.sqrt(1 - val));
    };
    const findClosestPoint = (ll) => {
      if (!Array.isArray(routePointsRaw) || routePointsRaw.length === 0) return null;
      let best = null;
      let bestD = Infinity;
      for (const p of routePointsRaw) {
        const d = haversine({ lat: ll.lat, lng: ll.lng }, { lat: Number(p.latitude), lng: Number(p.longitude) });
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      return best;
    };

    let orderedPoints = compressedVertices
      .map((ll) => pointMap.get(keyOf(ll.lat, ll.lng)) || matchPoint(ll) || findClosestPoint(ll))
      .filter(Boolean);

    // Fallback: if no points matched (e.g., rounding), fall back to raw route order
    if (orderedPoints.length === 0 && routePointsRaw.length > 0) {
      orderedPoints = [...routePointsRaw];
    }

    // Rotate so BHQ is the start/end of the loop and rotate legs accordingly
    const bhqIndex = orderedPoints.findIndex((p) => p?.type === "BHQ");
    const rotate = (arr, idx) => [...arr.slice(idx), ...arr.slice(0, idx)];
    if (bhqIndex > 0) {
      routePointsForDistance = rotate(orderedPoints, bhqIndex);
      legsToUse = rotate(flattenedLegs, bhqIndex);
    } else {
      routePointsForDistance = orderedPoints;
      legsToUse = flattenedLegs;
    }

    // Ensure clockwise orientation starting from BHQ
    if (routePointsForDistance.length > 2) {
      const area = (() => {
        let acc = 0;
        for (let i = 0; i < routePointsForDistance.length; i++) {
          const a = routePointsForDistance[i];
          const b = routePointsForDistance[(i + 1) % routePointsForDistance.length];
          const x1 = Number(a.longitude);
          const y1 = Number(a.latitude);
          const x2 = Number(b.longitude);
          const y2 = Number(b.latitude);
          acc += x1 * y2 - x2 * y1;
        }
        return acc / 2;
      })();
      // Positive shoelace area -> counterclockwise in standard coords; make it clockwise
      if (area > 0) {
        const head = routePointsForDistance[0];
        const tail = routePointsForDistance.slice(1).reverse();
        routePointsForDistance = [head, ...tail];
        legsToUse = [...legsToUse].reverse();
      }
    }
  } else {
    // Non-chunked: If Google optimized waypoints, reorder accordingly
    legsToUse = desktopDirections?.routes?.[0]?.legs || null;
    if (
      desktopDirections?.routes?.[0]?.waypoint_order &&
      Array.isArray(desktopDirections.routes[0].waypoint_order) &&
      Array.isArray(legsToUse)
    ) {
      const wo = desktopDirections.routes[0].waypoint_order; // indexes relative to waypoints (exclude origin)
      const origin = routePointsRaw[0] ? [routePointsRaw[0]] : [];
      const reorderedWaypoints = wo
        .map((idx) => routePointsRaw[idx + 1])
        .filter(Boolean);
      const ordered = [...origin, ...reorderedWaypoints];

      // Rotate so BHQ is the start and end
      const bhqIndex = ordered.findIndex((p) => p?.type === "BHQ");
      if (bhqIndex > 0) {
        const rotate = (arr, idx) => [...arr.slice(idx), ...arr.slice(0, idx)];
        routePointsForDistance = rotate(ordered, bhqIndex);
        legsToUse = rotate(legsToUse, bhqIndex);
      } else {
        routePointsForDistance = ordered;
      }
      // Ensure clockwise orientation
      if (routePointsForDistance.length > 2) {
        const area = (() => {
          let acc = 0;
          for (let i = 0; i < routePointsForDistance.length; i++) {
            const a = routePointsForDistance[i];
            const b = routePointsForDistance[(i + 1) % routePointsForDistance.length];
            const x1 = Number(a.longitude);
            const y1 = Number(a.latitude);
            const x2 = Number(b.longitude);
            const y2 = Number(b.latitude);
            acc += x1 * y2 - x2 * y1;
          }
          return acc / 2;
        })();
        if (area > 0) {
          const head = routePointsForDistance[0];
          const tail = routePointsForDistance.slice(1).reverse();
          routePointsForDistance = [head, ...tail];
          if (Array.isArray(legsToUse)) {
            legsToUse = [...legsToUse].reverse();
          }
        }
      }
    }
  }

  // For rows, exclude temporary/others points but preserve the determined order
  const routePointsForRows = routePointsForDistance.filter(
    (point) => point.type !== "others"
  );

  // Helper: sum leg distances between two indices in legsToUse moving forward, wrapping when needed
  const sumLegDistancesBetween = (startIdx, endIdxExclusive) => {
    if (!Array.isArray(legsToUse) || legsToUse.length === 0) return 0;
    const n = legsToUse.length;
    let total = 0;
    let i = startIdx;
    while (i !== endIdxExclusive) {
      total += Math.round(legsToUse[i % n].distance.value);
      i = (i + 1) % n;
      if (startIdx === endIdxExclusive) break; // guard if full loop requested
    }
    return total;
  };

  // Build mapping from filtered rows to their indices in the full ordered list
  const rowToFullIndex = routePointsForRows.map((rp) =>
    routePointsForDistance.findIndex(
      (p) =>
        p.place === rp.place &&
        Number(p.latitude) === Number(rp.latitude) &&
        Number(p.longitude) === Number(rp.longitude)
    )
  );

  const excelData = [];

  const surveyRoute = surveyRoutes.find(
    (route) => route.locationId === selectedLocations[0].location._id
  );
  let physicalTotalLength = 0;

  if (surveyRoute) {
    if (surveyRoute.totalDistance) {
      physicalTotalLength = Math.round(surveyRoute.totalDistance);
    } else if (
      surveyRoute.directions &&
      surveyRoute.directions.routes &&
      surveyRoute.directions.routes[0] &&
      surveyRoute.directions.routes[0].legs
    ) {
      surveyRoute.directions.routes[0].legs.forEach((leg) => {
        physicalTotalLength += leg.distance.value;
      });
      physicalTotalLength = Math.round(physicalTotalLength);
    }
  }

  let desktopTotalLength = distance;
  if (!desktopTotalLength && selectedLocations[0]?.routeInfo?.distance) {
    desktopTotalLength = selectedLocations[0].routeInfo.distance;
  }

  const lengthDifference = physicalTotalLength - desktopTotalLength;
  const percentDifference =
    desktopTotalLength > 0
      ? ((lengthDifference / desktopTotalLength) * 100).toFixed(2)
      : 0;

  if (type === "desktop") {
    excelData.push([
      "Sl. No.",
      "District",
      "Block",
      "Gram Panchayat",
      "From",
      "Lat",
      "Long",
      "To",
      "Lat",
      "Long",
      "Desktop Survey OFC Length (Mtr)",
      "Physical Survey Length (Mtr)",
      "Difference (Mtr)",
      "Difference (%)",
      "Total Desktop Length (Mtr)",
      "Total Physical Length (Mtr)",
    ]);

    if (routePointsForRows.length > 1) {
      for (let i = 0; i < routePointsForRows.length - 1; i++) {
        const fromPoint = routePointsForRows[i];
        const toPoint = routePointsForRows[i + 1];

        let segmentDistance = 0;
        if (Array.isArray(legsToUse) && legsToUse.length > 0) {
          const fromFullIndex = rowToFullIndex[i];
          const toFullIndex = rowToFullIndex[i + 1];
          if (fromFullIndex !== -1 && toFullIndex !== -1) {
            // Sum legs between full indexes moving forward, wrapping if needed
            segmentDistance = sumLegDistancesBetween(
              fromFullIndex,
              toFullIndex
            );
          }
        }

        let physicalSegmentDistance = 0;
        if (
          surveyRoute &&
          surveyRoute.directions &&
          surveyRoute.directions.routes &&
          surveyRoute.directions.routes[0] &&
          surveyRoute.directions.routes[0].legs
        ) {
          const legIndex = Math.min(
            i,
            surveyRoute.directions.routes[0].legs.length - 1
          );
          physicalSegmentDistance = Math.round(
            surveyRoute.directions.routes[0].legs[legIndex].distance.value
          );
        }

        const segmentDifference = physicalSegmentDistance - segmentDistance;
        const segmentPercentDiff =
          segmentDistance > 0
            ? ((segmentDifference / segmentDistance) * 100).toFixed(2)
            : 0;

        excelData.push([
          i + 1, // Sl. No.
          selectedLocations[0].location.district,
          selectedLocations[0].location.block,
          fromPoint.place, // Gram Panchayat
          fromPoint.place, // From
          Number(fromPoint.latitude).toFixed(6), // Lat of From
          Number(fromPoint.longitude).toFixed(6), // Long of From
          toPoint.place, // To
          Number(toPoint.latitude).toFixed(6), // Lat of To
          Number(toPoint.longitude).toFixed(6), // Long of To
          segmentDistance, // Desktop Survey OFC Length (Mtr)
          physicalSegmentDistance || "N/A", // Physical Survey Length (Mtr)
          physicalSegmentDistance ? segmentDifference : "N/A", // Difference (Mtr)
          physicalSegmentDistance ? segmentPercentDiff + "%" : "N/A", // Difference (%)
          desktopTotalLength, // Total Desktop Length (Mtr) - same for all rows
          physicalTotalLength || "N/A", // Total Physical Length (Mtr) - same for all rows
        ]);
      }

      const lastPoint = routePointsForRows[routePointsForRows.length - 1];
      const firstPoint = routePointsForRows[0];

      const isAlreadyClosed =
        lastPoint.place === firstPoint.place &&
        Math.abs(lastPoint.latitude - firstPoint.latitude) < 0.000001 &&
        Math.abs(lastPoint.longitude - firstPoint.longitude) < 0.000001;

      if (!isAlreadyClosed) {
        let finalSegmentDistance = 0;
        if (Array.isArray(legsToUse) && legsToUse.length > 0) {
          const fromFullIndex = rowToFullIndex[routePointsForRows.length - 1];
          const toFullIndex = rowToFullIndex[0];
          if (fromFullIndex !== -1 && toFullIndex !== -1) {
            finalSegmentDistance = sumLegDistancesBetween(
              fromFullIndex,
              toFullIndex
            );
          }
        }

        let finalPhysicalSegmentDistance = 0;
        if (
          surveyRoute?.directions?.routes?.[0]?.legs?.[
            routePointsForRows.length - 1
          ]
        ) {
          finalPhysicalSegmentDistance = Math.round(
            surveyRoute.directions.routes[0].legs[routePointsForRows.length - 1]
              .distance.value
          );
        }

        const finalSegmentDifference =
          finalPhysicalSegmentDistance - finalSegmentDistance;
        const finalSegmentPercentDiff =
          finalSegmentDistance > 0
            ? ((finalSegmentDifference / finalSegmentDistance) * 100).toFixed(2)
            : 0;

        excelData.push([
          routePointsForRows.length, // Sl. No.
          selectedLocations[0].location.district,
          selectedLocations[0].location.block,
          lastPoint.place, // Gram Panchayat
          lastPoint.place, // From
          Number(lastPoint.latitude).toFixed(6), // Lat of From
          Number(lastPoint.longitude).toFixed(6), // Long of From
          firstPoint.place, // To
          Number(firstPoint.latitude).toFixed(6), // Lat of To
          Number(firstPoint.longitude).toFixed(6), // Long of To
          finalSegmentDistance, // Desktop Survey OFC Length (Mtr)
          finalPhysicalSegmentDistance || "N/A", // Physical Survey Length (Mtr)
          finalPhysicalSegmentDistance ? finalSegmentDifference : "N/A", // Difference (Mtr)
          finalPhysicalSegmentDistance ? finalSegmentPercentDiff + "%" : "N/A", // Difference (%)
          desktopTotalLength, // Total Desktop Length (Mtr) - same for all rows
          physicalTotalLength || "N/A", // Total Physical Length (Mtr) - same for all rows
        ]);
      }

      excelData.push([
        "", // Sl. No.
        "", // District
        "", // Block
        "TOTALS", // Gram Panchayat
        "", // From
        "", // Lat
        "", // Long
        "", // To
        "", // Lat
        "", // Long
        desktopTotalLength, // Desktop Survey OFC Length (Mtr)
        physicalTotalLength || "N/A", // Physical Survey Length (Mtr)
        lengthDifference || "N/A", // Difference (Mtr)
        percentDifference + "%" || "N/A", // Difference (%)
        "", // Total Desktop Length
        "", // Total Physical Length
      ]);
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // Basic column sizing for readability
  ws["!cols"] = [
    { wch: 8 }, // Sl. No.
    { wch: 18 }, // District
    { wch: 18 }, // Block
    { wch: 28 }, // Gram Panchayat
    { wch: 28 }, // From
    { wch: 12 }, // Lat From
    { wch: 12 }, // Long From
    { wch: 28 }, // To
    { wch: 12 }, // Lat To
    { wch: 12 }, // Long To
    { wch: 18 }, // Desktop Length
    { wch: 18 }, // Physical Length
    { wch: 16 }, // Difference (Mtr)
    { wch: 14 }, // Difference (%)
    { wch: 22 }, // Total Desktop
    { wch: 22 }, // Total Physical
  ];

  XLSX.utils.book_append_sheet(wb, ws, "OFC Route Comparison");

  const fileName = `${selectedLocations[0].location.block}_${selectedLocations[0].location.district}_OFC_Route_Comparison.xlsx`;

  XLSX.writeFile(wb, fileName);

  setSnackbar({
    open: true,
    message: `Excel file exported successfully!`,
    severity: "success",
  });
};

export default handleDesktopToExcel;
