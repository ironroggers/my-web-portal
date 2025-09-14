import generateKMLContent from "./generateKMLContent.jsx";
// We rely on precomputed directions from the map (including chunked results)

const extractRoutePathFromDirections = (directions) => {
  let routePath = [];
  try {
    const routes = directions.routes;

    if (routes && routes.length > 0) {
      routes[0].legs.forEach((leg) => {
        if (leg.steps) {
          leg.steps.forEach((step) => {
            if (step.path) {
              step.path.forEach((point) => {
                routePath.push({
                  lat: point.lat(),
                  lng: point.lng(),
                });
              });
            }
          });
        }
      });
    }

    if (routePath.length === 0 && routes[0].overview_path) {
      routes[0].overview_path.forEach((point) => {
        routePath.push({
          lat: point.lat(),
          lng: point.lng(),
        });
      });
    }
  } catch (error) {
    console.error("Error extracting route path:", error);
  }
  return routePath;
};

const createRoutePathFromPoints = (routePoints) => {
  let routePath = [];
  if (routePoints.length > 1) {
    routePoints.forEach((point) => {
      routePath.push({
        lat: point.latitude,
        lng: point.longitude,
      });
    });
    routePath.push({
      lat: routePoints[0].latitude,
      lng: routePoints[0].longitude,
    });
  }
  return routePath;
};

const processDesktopRoute = async (selectedLocations, setSnackbar, type) => {
  const selected = selectedLocations[0];
  let directions = selected?.directions;

  const routePoints = selectedLocations
    .map((loc) => loc.location.route || [])
    .flat()
    .filter((point) => !point.isTemporary && point.type !== "others");

  let routePath = [];
  if (selected?.isChunked && Array.isArray(selected?.chunks)) {
    selected.chunks.forEach((chunk) => {
      const chunkPath = extractRoutePathFromDirections(chunk);
      if (chunkPath.length > 0) {
        if (routePath.length > 0) routePath.pop();
        routePath = routePath.concat(chunkPath);
      }
    });
  } else if (directions) {
    routePath = extractRoutePathFromDirections(directions);
  }

  if (routePath.length === 0) {
    routePath = createRoutePathFromPoints(routePoints);
  }

  const waypoints = routePoints.map((point) => ({
    name: point.place,
    type: point.type,
    lat: point.latitude,
    lng: point.longitude,
  }));

  return { routePath, waypoints };
};

const processPhysicalSurveyRoute = (
  selectedLocations,
  surveyRoutes,
  getSurveysForLocation,
  setSnackbar
) => {
  const surveyRoute = surveyRoutes.find(
    (route) => route.locationId === selectedLocations[0].location._id
  );

  if (!surveyRoute || !surveyRoute.directions) {
    setSnackbar({
      open: true,
      message: "No physical survey route data available for this location",
      severity: "warning",
    });
    return { routePath: [], waypoints: [] };
  }

  const locationSurveys = getSurveysForLocation(
    selectedLocations[0].location._id
  );

  if (locationSurveys.length < 2) {
    setSnackbar({
      open: true,
      message: "Not enough survey points to create a route export",
      severity: "warning",
    });
    return { routePath: [], waypoints: [] };
  }

  let routePath = [];
  if (surveyRoute.isChunked && Array.isArray(surveyRoute.chunks)) {
    surveyRoute.chunks.forEach((chunk) => {
      const chunkPath = extractRoutePathFromDirections(chunk);
      if (chunkPath.length > 0) {
        if (routePath.length > 0) {
          routePath.pop();
        }
        routePath = routePath.concat(chunkPath);
      }
    });
  } else {
    routePath = extractRoutePathFromDirections(surveyRoute.directions);
  }

  if (routePath.length === 0) {
    const surveyPoints = locationSurveys
      .filter((s) => s.lat && s.lng && s.lat !== 0 && s.lng !== 0)
      .map((s) => ({ latitude: s.lat, longitude: s.lng }));
    routePath = createRoutePathFromPoints(surveyPoints);
  }

  const waypoints = locationSurveys
    .filter(
      (survey) =>
        survey.lat && survey.lng && survey.lat !== 0 && survey.lng !== 0
    )
    .map((survey) => ({
      name: survey.name || survey.title || "Survey Point",
      type: "Survey",
      lat: survey.lat,
      lng: survey.lng,
    }));

  return { routePath, waypoints };
};

const downloadKMLFile = (kml, selectedLocations, type) => {
  const blob = new Blob([kml], {
    type: "application/vnd.google-earth.kml+xml",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${selectedLocations[0].location.block}_${
    selectedLocations[0].location.district
  }_${type === "desktop" ? "OFC" : "Survey"}_Route.kml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToKML = async (
  selectedLocations,
  surveyRoutes,
  getSurveysForLocation,
  setSnackbar,
  setExportType,
  handleExportClose,
  type = "desktop"
) => {
  if (!selectedLocations || selectedLocations.length === 0) {
    setSnackbar({
      open: true,
      message: "Error: No locations selected",
      severity: "error",
    });
    return;
  }

  handleExportClose();
  setExportType(type);

  const { routePath, waypoints } =
    type === "desktop"
      ? await processDesktopRoute(selectedLocations, setSnackbar, type)
      : processPhysicalSurveyRoute(
          selectedLocations,
          surveyRoutes,
          getSurveysForLocation,
          setSnackbar
        );

  if (routePath.length === 0) {
    setSnackbar({
      open: true,
      message: "Error: Could not extract route data from Google Maps",
      severity: "error",
    });
    return;
  }

  const kml = generateKMLContent(selectedLocations, routePath, waypoints, type);

  downloadKMLFile(kml, selectedLocations, type);

  setSnackbar({
    open: true,
    message: `KML file with ${
      type === "desktop" ? "OFC" : "survey"
    } route exported successfully!`,
    severity: "success",
  });
};
