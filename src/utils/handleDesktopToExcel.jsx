import {
  OptimizedPoints,
  DIRECTIONS,
} from "../components/mapViewPage/mapComponents/RouteDirections";
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

  const allOptimizedPoints = OptimizedPoints || [];

  const routePointsForRows = allOptimizedPoints.filter(
    (point) => point.type !== "others"
  );

  const routePointsForDistance = allOptimizedPoints;

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
        if (
          DIRECTIONS &&
          DIRECTIONS.routes &&
          DIRECTIONS.routes[0] &&
          DIRECTIONS.routes[0].legs
        ) {
          const fromIndex = routePointsForDistance.findIndex(
            (p) =>
              p.place === fromPoint.place &&
              p.latitude === fromPoint.latitude &&
              p.longitude === fromPoint.longitude
          );

          let toIndex = -1;
          if (i === routePointsForRows.length - 2) {
            for (let k = routePointsForDistance.length - 1; k >= 0; k--) {
              const p = routePointsForDistance[k];
              if (
                p.place === toPoint.place &&
                p.latitude === toPoint.latitude &&
                p.longitude === toPoint.longitude
              ) {
                toIndex = k;
                break;
              }
            }
          } else {
            for (
              let k = fromIndex + 1;
              k < routePointsForDistance.length;
              k++
            ) {
              const p = routePointsForDistance[k];
              if (
                p.place === toPoint.place &&
                p.latitude === toPoint.latitude &&
                p.longitude === toPoint.longitude
              ) {
                toIndex = k;
                break;
              }
            }
          }

          if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
            let totalSegmentDistance = 0;
            for (
              let j = fromIndex;
              j < toIndex && j < DIRECTIONS.routes[0].legs.length;
              j++
            ) {
              totalSegmentDistance +=
                DIRECTIONS.routes[0].legs[j].distance.value;
            }
            segmentDistance = Math.round(totalSegmentDistance);
          } else {
            const legIndex = Math.min(i, DIRECTIONS.routes[0].legs.length - 1);
            segmentDistance = Math.round(
              DIRECTIONS.routes[0].legs[legIndex].distance.value
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
        if (
          DIRECTIONS &&
          DIRECTIONS.routes &&
          DIRECTIONS.routes[0] &&
          DIRECTIONS.routes[0].legs &&
          DIRECTIONS.routes[0].legs[routePointsForRows.length - 1]
        ) {
          finalSegmentDistance = Math.round(
            DIRECTIONS.routes[0].legs[routePointsForRows.length - 1].distance
              .value
          );
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
