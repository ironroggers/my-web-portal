import React, { useState, useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Skeleton,
  Snackbar,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import TableViewOutlinedIcon from "@mui/icons-material/TableViewOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import PageHeader from "../common/PageHeader";
import { RoutePointForm, RoutePointTable } from "./RoutePointFields.jsx";
import SurveySidebar from "./SurveySidebar.jsx";
import MapComponent from "./MapComponent.jsx";
import {
  GOOGLE_MAPS_DIRECTIONS_API,
  LOCATION_URL,
  SURVEY_URL,
} from "../../API/api-keys.jsx";
import { useAuth } from '../../context/AuthContext';
import surveyService from "../../services/surveyService.jsx";
import physicalSurveyExport from "../../utils/physicalSurveyExport.util.jsx";
import { exportToKML } from "./utils/exportUtils.jsx";
import InfoCardComponent from "./InfoCardComponent.jsx";
import SymbolsComponent from "./SymbolsComponent.jsx";
import handleDesktopToExcel from "../../utils/handleDesktopToExcel.jsx";

const GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_DIRECTIONS_API;

// Move libraries array outside component to prevent LoadScript reloading
const GOOGLE_MAPS_LIBRARIES = ["places"];

// The map sits inside a card, between the route toggles and the legend
const containerStyle = {
  width: "100%",
  height: "68vh",
  minHeight: 420,
};

const defaultCenter = { lat: 9.31, lng: 76.45 }; // Kerala

// Add status mapping
const STATUS_MAPPING = {
  1: "Released",
  2: "Assigned",
  3: "Active",
  4: "Submitted",
  5: "Accepted",
  6: "Reverted",
};

// Set color palette for OFC routes to blue shades
const routeColor = "#2563eb"; // Brighter blue
const surveyRouteColor = "#f59e0b"; // More vibrant yellow

const MapViewPage = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { user } = useAuth();
  const isViewer = user && user.role === 'VIEWER';
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const [locations, setLocations] = useState([]);
  const [locationRoutes, setLocationRoutes] = useState([]); // [{points, directions, routeInfo, mapCenter, error}]
  const [surveyRoutes, setSurveyRoutes] = useState([]); // [{locationId, directions}]
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocations, setSelectedLocations] = useState([]); // Changed to array for multiple selection
  const [mapZoom, setMapZoom] = useState(11);
  const [distance, setDistance] = useState(0);

  // New state for route visibility

  // New state variables for location creation
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newLocation, setNewLocation] = useState({
    district: "",
    block: "",
    status: 1,
    route: [],
  });
  const [newRoutePoint, setNewRoutePoint] = useState({
    place: "",
    latitude: 0,
    longitude: 0,
    type: "GP",
  });
  const [creatingLocation, setCreatingLocation] = useState(false);

  // New state variables for location edit
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editLocation, setEditLocation] = useState(null);
  const [editRoutePoint, setEditRoutePoint] = useState({
    place: "",
    latitude: 0,
    longitude: 0,
    type: "GP",
  });
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Export menu state
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const openExportMenu = Boolean(exportAnchorEl);
  const [exportType, setExportType] = useState("desktop"); // new state to track export type

  // New state variables for survey sidebar
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingSurvey, setLoadingSurvey] = useState(false);

  // Add this state near the other state declarations at the top
  const [recentlySelectedLocation, setRecentlySelectedLocation] =
    useState(null);

  // Add new state variables for map click functionality
  const [mapClickDialog, setMapClickDialog] = useState({
    open: false,
    coordinates: null,
    locationData: null,
  });
  const [addingPoint, setAddingPoint] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Add state for map reference
  const [map, setMap] = useState(null);

  // Add this function to handle map load and store reference
  const onMapLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  // Add this function to adjust bounds when needed
  const adjustMapBounds = () => {
    if (!map || !window.google || selectedLocations.length === 0) return;

    // If we only have one location or a recently selected location, fit bounds to show all its points
    const targetLocation = recentlySelectedLocation || selectedLocations[0];

    if (
      targetLocation &&
      targetLocation.points &&
      targetLocation.points.length > 1
    ) {
      const bounds = new window.google.maps.LatLngBounds();

      // Add all points to bounds
      targetLocation.points.forEach((point) => {
        bounds.extend(point);
      });

      // Adjust bounds with some padding
      map.fitBounds(bounds);
    }
  };

  // Call adjustMapBounds when relevant state changes
  useEffect(() => {
    adjustMapBounds();
  }, [map, selectedLocations, recentlySelectedLocation]);

  const refreshLocations = async () => {
    const loading = false;
    await fetchLocations(loading);
    await fetchSurveys();
  };

  useEffect(() => {
    fetchLocations();
    fetchSurveys();
  }, []);

  // Preselect a location when coming back from Sections page
  useEffect(() => {
    const state = routerLocation.state;
    const preselectId = state && state.preselectLocationId;
    if (!preselectId) return;
    if (!locations || locations.length === 0) return;
    if (selectedLocations.length > 0) return; // don't override existing selection

    const selectedLocation = locations.find((l) => l._id === preselectId);
    if (selectedLocation) {
      const routeObj = {
        points: getPointsForLocation(selectedLocation),
        directions: null,
        routeInfo: null,
        mapCenter:
          getPointsForLocation(selectedLocation)[0] || defaultCenter,
        error: null,
        location: selectedLocation,
      };
      setSelectedLocations([routeObj]);
      setRecentlySelectedLocation(routeObj);
      setMapZoom(15);
    }
  }, [routerLocation.state, locations]);

  // Only process selected locations - no batch processing
  useEffect(() => {
    if (selectedLocations.length > 0 && isLoaded) {
      processSelectedLocation(selectedLocations[0]);
    } else {
      // Clear location routes when no location is selected
      setLocationRoutes([]);
    }
  }, [selectedLocations, isLoaded]);

  // Sync route calculation results back to selectedLocations
  useEffect(() => {
    if (selectedLocations.length > 0 && locationRoutes.length > 0) {
      const selectedLocation = selectedLocations[0];
      const matchingRoute = locationRoutes.find(
        (route) =>
          route.location &&
          selectedLocation.location &&
          route.location._id === selectedLocation.location._id
      );

      if (
        matchingRoute &&
        matchingRoute.routeInfo &&
        !selectedLocation.routeInfo
      ) {
        // Update selectedLocations with the calculated route info
        setSelectedLocations([
          {
            ...selectedLocation,
            routeInfo: matchingRoute.routeInfo,
            directions: matchingRoute.directions,
            error: matchingRoute.error,
            // carry over chunk metadata for rendering/export when present
            isChunked: matchingRoute.isChunked,
            chunks: matchingRoute.chunks,
          },
        ]);
      }
    }
  }, [locationRoutes, selectedLocations]);

  // Process only the selected location with directions
  const processSelectedLocation = async (selectedLocationRoute) => {
    const location = selectedLocationRoute.location;
    const points = getPointsForLocation(location);

    if (!window.google || !window.google.maps || points.length < 2) {
      setLocationRoutes([
        {
          points,
          directions: null,
          routeInfo: null,
          mapCenter: points[0] || defaultCenter,
          error: points.length < 2 ? "Not enough points for route" : null,
          location,
        },
      ]);
      return;
    }

    try {
      let result;

      // Handle case where we have more than 10 waypoints (Google Maps API limit)
      if (points.length > 11) {
        result = await getChunkedRoutes(points, location);
      } else {
        // Process single location with directions
        const directionsService = new window.google.maps.DirectionsService();
        const origin = points[0];
        const destination = points[0]; // Loop
        const waypoints = points
          .slice(1)
          .map((p) => ({ location: p, stopover: true }));

        result = await new Promise((resolve) => {
          directionsService.route(
            {
              origin,
              destination,
              waypoints,
              travelMode: window.google.maps.TravelMode.WALKING,
              optimizeWaypoints: true,
            },
            (result, status) => {
              if (status === "OK") {
                let totalDistance = 0;
                let totalDuration = 0;
                result.routes[0].legs.forEach((leg) => {
                  totalDistance += leg.distance.value;
                  totalDuration += leg.duration.value;
                });
                resolve({
                  points,
                  directions: result,
                  routeInfo: {
                    distance: totalDistance,
                    time: totalDuration,
                    legs: result.routes[0].legs.length,
                  },
                  mapCenter: points[0],
                  error: null,
                  location,
                });
              } else {
                resolve({
                  points,
                  directions: null,
                  routeInfo: null,
                  mapCenter: points[0] || defaultCenter,
                  error: "Failed to get optimized route from Google Maps.",
                  location,
                });
              }
            }
          );
        });
      }

      // Set only this single location in locationRoutes
      setLocationRoutes([result]);
    } catch (error) {
      console.error("Error processing location:", error);
      setLocationRoutes([
        {
          points,
          directions: null,
          routeInfo: null,
          mapCenter: points[0] || defaultCenter,
          error: "Failed to process location",
          location,
        },
      ]);
    }
  };

  useEffect(() => {
    if (surveys.length > 0 && isLoaded) {
      getSurveyRoutes();
      console.log("Survey routes updated for", surveys.length, "surveys");
    }
  }, [surveys, isLoaded]);

  const fetchLocations = async (loading = true) => {
    try {
      setLoading(loading);
      setError(null);

      console.log("Attempting to fetch locations from API...");
      const baseUrl = LOCATION_URL + "/api";
      const apiUrl = `${baseUrl}/locations`;

      // Add CORS headers to the request
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        // Include credentials if your API requires authentication
        // credentials: 'include'
      });

      console.log("Fetch location status:", response.status);

      if (!response.ok) {
        // Log the error response for debugging
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(
          `Failed to fetch locations: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Fetch locations successful, data count:", data.data?.length);

      if (!data.success || !Array.isArray(data.data)) {
        console.error("Invalid data format received:", data);
        throw new Error("Invalid data format received");
      }

      setLocations(data.data);
    } catch (err) {
      console.error("Fetch locations error:", err);

      // Specific handling for CORS errors
      if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
        setError("Couldn't reach the location service. Check your connection and refresh the page.");
      } else {
        setError(err.message || "Error fetching locations");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSurveys = async () => {
    try {
      const response = await surveyService.getSurveys();
      if (!response.success || !Array.isArray(response.data))
        throw new Error("Invalid survey data format received");

      // Process surveys to ensure proper data format for map rendering
      const processedSurveys = response.data
        .map((survey) => ({
          ...survey,
          // Convert string coordinates to numbers for map rendering
          lat: parseFloat(survey.latitude) || 0,
          lng: parseFloat(survey.longitude) || 0,
          // Keep original fields for backward compatibility
          latitude: survey.latitude,
          longitude: survey.longitude,
          // Ensure proper position object for Google Maps
          position: {
            lat: parseFloat(survey.latitude) || 0,
            lng: parseFloat(survey.longitude) || 0,
          },
        }))
        .filter(
          (survey) =>
            // Only include surveys with valid coordinates
            survey.lat !== 0 &&
            survey.lng !== 0 &&
            !isNaN(survey.lat) &&
            !isNaN(survey.lng)
        );

      setSurveys(processedSurveys);
      console.log(
        "Processed surveys for map:",
        processedSurveys.length,
        "valid surveys"
      );
    } catch (err) {
      setError((prevError) =>
        prevError
          ? `${prevError}, ${err.message}`
          : `Error fetching surveys: ${err.message}`
      );
    }
  };

  // Extract points for a single location
  const getPointsForLocation = (location) => {
    const points = [];
    if (location?.route?.length > 0) {
      location.route.forEach((point) => {
        points.push({ lat: point.latitude, lng: point.longitude });
      });
    }
    // Remove duplicates
    const uniquePoints = points.filter(
      (p, idx, arr) =>
        arr.findIndex((q) => q.lat === p.lat && q.lng === p.lng) === idx
    );
    return uniquePoints;
  };

  // ---- Global route optimization helpers (supports arbitrary number of points) ----
  const haversineDistance = (a, b) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371e3; // meters
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const aVal =
      sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
    return R * c;
  };

  const nearestNeighborOrder = (points) => {
    if (points.length <= 2) return [...points];
    const remaining = points.map((p, i) => ({ idx: i, p }));
    const order = [];
    // Anchor start at first point to preserve chosen start
    let current = remaining.shift();
    order.push(current.p);
    while (remaining.length) {
      let bestIndex = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversineDistance(current.p, remaining[i].p);
        if (d < bestDist) {
          bestDist = d;
          bestIndex = i;
        }
      }
      current = remaining.splice(bestIndex, 1)[0];
      order.push(current.p);
    }
    return order;
  };

  const twoOptImprove = (ordered) => {
    if (ordered.length <= 3) return ordered;
    const path = [...ordered];
    let improved = true;
    const distanceAt = (i, j) => haversineDistance(path[i], path[j]);
    while (improved) {
      improved = false;
      for (let i = 1; i < path.length - 2; i++) {
        for (let k = i + 1; k < path.length - 1; k++) {
          const delta =
            distanceAt(i - 1, i) + distanceAt(k, k + 1) -
            (distanceAt(i - 1, k) + distanceAt(i, k + 1));
          if (delta > 1e-6) {
            // Reverse the segment [i, k]
            const segment = path.slice(i, k + 1).reverse();
            path.splice(i, k - i + 1, ...segment);
            improved = true;
          }
        }
      }
    }
    return path;
  };

  const optimizeRouteOrder = (points) => {
    if (!Array.isArray(points) || points.length <= 2) return points;
    const nn = nearestNeighborOrder(points);
    const improved = twoOptImprove(nn);
    return improved;
  };

  const buildChunks = (points, maxWaypointsPerRequest = 9) => {
    // Each request: origin + waypoints (<= maxWaypointsPerRequest) + destination
    // We include overlapping endpoints so polylines connect.
    const chunkSize = Math.max(2, maxWaypointsPerRequest);
    const chunks = [];
    for (let i = 0; i < points.length; i += chunkSize - 1) {
      if (i + chunkSize >= points.length) {
        chunks.push(points.slice(i));
      } else {
        chunks.push(points.slice(i, i + chunkSize));
      }
    }
    return chunks;
  };

  const runWithConcurrency = async (items, worker, limit = 3) => {
    const results = new Array(items.length);
    let current = 0;
    const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
      while (current < items.length) {
        const idx = current++;
        try {
          results[idx] = await worker(items[idx], idx);
        } catch (e) {
          results[idx] = null;
        }
      }
    });
    await Promise.all(runners);
    return results.filter(Boolean);
  };

  // Function to handle routes with more than 10 waypoints
  const getChunkedRoutes = async (points, location) => {
    const directionsService = new window.google.maps.DirectionsService();

    // 1) Compute a globally-optimized visit order (start anchored at first point)
    const optimizedPoints = optimizeRouteOrder(points);

    // 2) Split optimized path into API-sized chunks with overlap
    const MAX_WAYPOINTS = 9; // keep conservative to avoid provider limits
    const chunks = buildChunks(optimizedPoints, MAX_WAYPOINTS);

    console.log(
      `Optimized ${points.length} points and split into ${chunks.length} chunks`
    );

    // Now get directions for each chunk
    const chunkResults = await runWithConcurrency(
      chunks,
      async (chunkPoints, i) => {
        const origin = chunkPoints[0];
        const destination = chunkPoints[chunkPoints.length - 1];
        const waypoints = chunkPoints
          .slice(1, chunkPoints.length - 1)
          .map((p) => ({ location: p, stopover: true }));

        return await new Promise((resolve, reject) => {
          directionsService.route(
            {
              origin,
              destination,
              waypoints,
              travelMode: window.google.maps.TravelMode.WALKING,
              optimizeWaypoints: false, // preserve globally-optimized order
            },
            (result, status) => {
              if (status === "OK") {
                resolve(result);
              } else {
                console.error(`Chunk ${i} failed with status: ${status}`);
                reject(new Error(`Failed to get directions for chunk ${i}: ${status}`));
              }
            }
          );
        });
      },
      3
    );

    // Add final segment to connect back to the starting point
    if (points.length >= 2 && chunkResults.length > 0) {
      try {
        // Get the last point from the last chunk and connect it back to the first point
        const lastPoint = optimizedPoints[optimizedPoints.length - 1];
        const firstPoint = optimizedPoints[0];

        // Skip if the last point is already the same as the first point
        if (
          lastPoint.lat !== firstPoint.lat ||
          lastPoint.lng !== firstPoint.lng
        ) {
          const result = await new Promise((resolve, reject) => {
            directionsService.route(
              {
                origin: lastPoint,
                destination: firstPoint,
                travelMode: window.google.maps.TravelMode.WALKING,
                optimizeWaypoints: false,
              },
              (result, status) => {
                if (status === "OK") {
                  resolve(result);
                } else {
                  console.error(
                    `Final return segment failed with status: ${status}`
                  );
                  reject(
                    new Error(
                      `Failed to get directions for final return segment: ${status}`
                    )
                  );
                }
              }
            );
          });

          // Add the closing segment to complete the loop
          chunkResults.push(result);
          console.log("Added final segment to close the loop");
        }
      } catch (error) {
        console.error(
          "Error getting directions for final return segment:",
          error
        );
      }
    }

    // If we couldn't get any chunk results, return an error
    if (chunkResults.length === 0) {
      return {
        points,
        directions: null,
        routeInfo: null,
        mapCenter: points[0] || defaultCenter,
        error: "Failed to get directions for all route segments.",
        location,
        chunks: null,
      };
    }

    // Calculate the total distance and duration across all chunks
    let totalDistance = 0;
    let totalDuration = 0;
    let totalLegs = 0;

    chunkResults.forEach((result) => {
      if (
        result &&
        result.routes &&
        result.routes[0] &&
        result.routes[0].legs
      ) {
        result.routes[0].legs.forEach((leg) => {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value;
          totalLegs++;
        });
      }
    });

    // Return the chunked results
    return {
      points: optimizedPoints,
      directions: chunkResults[0], // We'll use the first chunk for the main directions object
      routeInfo: {
        distance: totalDistance,
        time: totalDuration,
        legs: totalLegs,
      },
      mapCenter: optimizedPoints[0],
      error: null,
      location,
      chunks: chunkResults, // Store all chunks to render separately
      isChunked: true,
    };
  };

  // Calculate routes for survey points for locations with status 5
  const getSurveyRoutes = async () => {
    if (!window.google || !window.google.maps) return;

    const directionsService = new window.google.maps.DirectionsService();
    const results = [];

    for (const location of locations) {
      // Skip if location status is not 5
      if (location.status !== 5) continue;

      // Get surveys for this location
      const locationSurveys = getSurveysForLocation(location._id);

      // Skip if less than 2 survey points
      if (locationSurveys.length < 2) continue;

      // Create points from survey coordinates using the processed lat/lng values
      const points = locationSurveys
        .filter(
          (survey) =>
            survey.lat && survey.lng && survey.lat !== 0 && survey.lng !== 0
        )
        .map((survey) => ({ lat: survey.lat, lng: survey.lng }));

      if (points.length < 2) continue;

      // If we have too many points, use the chunking approach
      if (points.length > 11) {
        try {
          // Global optimization and chunking similar to desktop route
          const optimizedPoints = optimizeRouteOrder(points);
          const MAX_WAYPOINTS = 9;
          const chunks = buildChunks(optimizedPoints, MAX_WAYPOINTS);

          let totalDistance = 0;
          const chunkResults = await runWithConcurrency(
            chunks,
            async (chunkPoints, i) => {
              const origin = chunkPoints[0];
              const destination = chunkPoints[chunkPoints.length - 1];
              const waypoints = chunkPoints
                .slice(1, chunkPoints.length - 1)
                .map((p) => ({ location: p, stopover: true }));

              return await new Promise((resolve) => {
                directionsService.route(
                  {
                    origin,
                    destination,
                    waypoints,
                    travelMode: window.google.maps.TravelMode.WALKING,
                    optimizeWaypoints: false,
                  },
                  (result, status) => {
                    if (status === "OK") {
                      if (
                        result.routes &&
                        result.routes[0] &&
                        result.routes[0].legs
                      ) {
                        result.routes[0].legs.forEach((leg) => {
                          totalDistance += leg.distance.value;
                        });
                      }
                      resolve(result);
                    } else {
                      console.error(`Survey chunk ${i} failed: ${status}`);
                      resolve(null);
                    }
                  }
                );
              });
            },
            3
          );

          if (chunkResults.length > 0) {
            // Add final segment to connect back to the starting point (for physical survey routes)
            try {
              const lastPoint = optimizedPoints[optimizedPoints.length - 1];
              const firstPoint = optimizedPoints[0];

              if (
                lastPoint.lat !== firstPoint.lat ||
                lastPoint.lng !== firstPoint.lng
              ) {
                const result = await new Promise((resolve) => {
                  directionsService.route(
                    {
                      origin: lastPoint,
                      destination: firstPoint,
                      travelMode: window.google.maps.TravelMode.WALKING,
                      optimizeWaypoints: false,
                    },
                    (result, status) => {
                      if (status === "OK") {
                        if (
                          result.routes &&
                          result.routes[0] &&
                          result.routes[0].legs
                        ) {
                          result.routes[0].legs.forEach((leg) => {
                            totalDistance += leg.distance.value;
                          });
                        }
                        resolve(result);
                      } else {
                        console.error(
                          `Final survey return segment failed: ${status}`
                        );
                        resolve(null);
                      }
                    }
                  );
                });

                if (result) {
                  chunkResults.push(result);
                }
              }
            } catch (error) {
              console.error(
                "Error getting directions for final survey return segment:",
                error
              );
            }

            results.push({
              locationId: location._id,
              directions: chunkResults[0],
              chunks: chunkResults,
              isChunked: true,
              totalDistance: totalDistance,
            });
          }
        } catch (err) {
          console.error(
            `Error calculating chunked survey route for location ${location._id}:`,
            err
          );
        }
      } else {
        // Original logic for 10 or fewer waypoints
        try {
          const origin = points[0];
          const destination = points[0]; // Create a loop
          const waypoints = points
            .slice(1)
            .map((p) => ({ location: p, stopover: true }));

          const result = await new Promise((resolve) => {
            directionsService.route(
              {
                origin,
                destination,
                waypoints,
                travelMode: window.google.maps.TravelMode.WALKING,
                optimizeWaypoints: true,
              },
              (result, status) => {
                if (status === "OK") {
                  // Calculate total distance for non-chunked routes
                  let totalDistance = 0;
                  if (
                    result.routes &&
                    result.routes[0] &&
                    result.routes[0].legs
                  ) {
                    result.routes[0].legs.forEach((leg) => {
                      totalDistance += leg.distance.value;
                    });
                  }

                  resolve({
                    locationId: location._id,
                    directions: result,
                    totalDistance: totalDistance, // Add the totalDistance property
                  });
                } else {
                  resolve({
                    locationId: location._id,
                    directions: null,
                    error: `Failed to get directions: ${status}`,
                  });
                }
              }
            );
          });

          results.push(result);
        } catch (err) {
          console.error(
            `Error calculating survey route for location ${location._id}:`,
            err
          );
        }
      }
    }

    setSurveyRoutes(results);
  };

  // Filter surveys for a specific location
  const getSurveysForLocation = (locationId) => {
    return surveys.filter((survey) => {
      // Handle the new backend structure where surveys have locationId
      if (survey.locationId) {
        // locationId can be a string ID or populated object
        if (typeof survey.locationId === "string") {
          return survey.locationId === locationId;
        } else if (
          typeof survey.locationId === "object" &&
          survey.locationId._id
        ) {
          return survey.locationId._id === locationId;
        }
      }

      // Fallback to old structure for backward compatibility
      if (survey.location) {
        if (typeof survey.location === "string") {
          return survey.location === locationId;
        } else if (typeof survey.location === "object" && survey.location._id) {
          return survey.location._id === locationId;
        }
      }

      return false;
    });
  };

  // Find a center for the map (first available point from selected locations, or default)
  const mapCenter =
    recentlySelectedLocation &&
    recentlySelectedLocation.points &&
    recentlySelectedLocation.points.length > 0
      ? recentlySelectedLocation.points[0]
      : selectedLocations.length > 0 && selectedLocations[0].points.length > 0
      ? selectedLocations[0].points[0]
      : locationRoutes.find((r) => r.points && r.points.length > 0)
          ?.points[0] || defaultCenter;

  // Update handleLocationSelect for single selection
  const handleLocationSelect = (event, value) => {
    if (!value) {
      setSelectedLocations([]);
      setRecentlySelectedLocation(null);
      setMapZoom(11); // Zoom out for overview
      return;
    }

    // Find the selected location from the original locations data
    const selectedLocation = locations.find(
      (location) => `${location.block} (${location.district})` === value
    );

    if (selectedLocation) {
      // Create a route object for the selected location
      const selectedRoute = {
        points: getPointsForLocation(selectedLocation),
        directions: null,
        routeInfo: null,
        mapCenter: getPointsForLocation(selectedLocation)[0] || defaultCenter,
        error: null,
        location: selectedLocation,
      };

      setSelectedLocations([selectedRoute]);
      setRecentlySelectedLocation(selectedRoute);
      setMapZoom(15);
    }
  };

  // Prepare options for Autocomplete from original locations data
  const locationOptions = locations
    .map((location) => `${location.block} (${location.district})`)
    .filter(Boolean);

  // Handle open/close of create dialog
  const handleOpenCreateDialog = () => {
    if (isViewer) return;
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    // Reset form data
    setNewLocation({
      district: "",
      block: "",
      status: 1, // Keep status as 1 by default
      route: [],
    });
  };

  // Update new location data
  const handleLocationInputChange = (e) => {
    const { name, value } = e.target;
    setNewLocation((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Update new route point data
  const handleRoutePointChange = (e) => {
    const { name, value } = e.target;

    if (name === "latitude" || name === "longitude") {
      setNewRoutePoint((prev) => ({
        ...prev,
        [name]: parseFloat(value),
      }));
    } else {
      setNewRoutePoint((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Add new route point to the route array
  const handleAddRoutePoint = () => {
    // Check if trying to add BHQ when one already exists
    if (
      newRoutePoint.type === "BHQ" &&
      newLocation.route.some((point) => point.type === "BHQ")
    ) {
      setSnackbar({
        open: true,
        message: "Only one BHQ (Block Head Quarter) can be added per location",
        severity: "warning",
      });
      return;
    }

    setNewLocation((prev) => ({
      ...prev,
      route: [...prev.route, { ...newRoutePoint }],
    }));

    // Reset form for next point
    setNewRoutePoint({
      place: "",
      latitude: 0,
      longitude: 0,
      type: "GP",
    });
  };

  // Remove route point from the array
  const handleRemoveRoutePoint = (index) => {
    setNewLocation((prev) => ({
      ...prev,
      route: prev.route.filter((_, i) => i !== index),
    }));
  };

  // Create location by sending data to API
  const handleCreateLocation = async () => {
    if (isViewer) return;
    try {
      setCreatingLocation(true);

      // Show pending state in UI
      setSnackbar({
        open: true,
        message: "Creating location...",
        severity: "info",
      });

      // Log the data being sent for debugging
      console.log("Sending location data:", JSON.stringify(newLocation));

      // API endpoint
      const apiEndpoint = `${LOCATION_URL}/api/locations`;

      // Format data for API
      const formattedData = {
        ...newLocation,
        // Always set status to 1 for new locations
        status: 1,
        // Ensure coordinates are numbers, not strings
        route: newLocation.route.map((point) => ({
          ...point,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
        })),
      };

      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(formattedData),
          // Uncomment if needed for authentication
          // credentials: 'include'
        });

        if (!response) {
          throw new Error("No response received from server");
        }

        // Check response status
        console.log("Create location response status:", response.status);

        // Handle unsuccessful responses
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response from create location:", errorText);
          throw new Error(
            `Failed to create location. Status: ${response.status}`
          );
        }

        const data = await response.json();
        console.log("Create location successful:", data);

        // Show success message
        setSnackbar({
          open: true,
          message: "Location created successfully!",
          severity: "success",
        });

        // Close dialog
        handleCloseCreateDialog();

        // Refresh locations
        fetchLocations();
      } catch (err) {
        // Handle CORS issues
        if (
          err.name === "TypeError" &&
          err.message.includes("Failed to fetch")
        ) {
          throw new Error(
            "Network error: Could not connect to the server. This could be due to CORS issues or the server being down."
          );
        }
        throw err;
      }
    } catch (err) {
      console.error("Error creating location:", err);
      setSnackbar({
        open: true,
        message: err.message || "Error creating location",
        severity: "error",
      });
    } finally {
      setCreatingLocation(false);
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Handle open/close of edit dialog
  const handleOpenEditDialog = () => {
    if (isViewer) return;
    if (!selectedLocations || selectedLocations.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select a location to edit",
        severity: "warning",
      });
      return;
    }

    // Clone the selected location for editing
    setEditLocation({
      ...selectedLocations[0].location,
      route: selectedLocations[0].location.route
        ? [...selectedLocations[0].location.route]
        : [],
    });

    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setEditLocation(null);
    setEditRoutePoint({
      place: "",
      latitude: 0,
      longitude: 0,
      type: "GP",
    });
  };

  // Update edit location data
  const handleEditLocationInputChange = (e) => {
    const { name, value } = e.target;
    setEditLocation((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Update edit route point data
  const handleEditRoutePointChange = (e) => {
    const { name, value } = e.target;

    if (name === "latitude" || name === "longitude") {
      setEditRoutePoint((prev) => ({
        ...prev,
        [name]: parseFloat(value),
      }));
    } else {
      setEditRoutePoint((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Add new route point to the edit route array
  const handleAddEditRoutePoint = () => {
    // Check if trying to add BHQ when one already exists
    if (
      editRoutePoint.type === "BHQ" &&
      editLocation.route.some((point) => point.type === "BHQ")
    ) {
      setSnackbar({
        open: true,
        message: "Only one BHQ (Block Head Quarter) can be added per location",
        severity: "warning",
      });
      return;
    }

    setEditLocation((prev) => ({
      ...prev,
      route: [...prev.route, { ...editRoutePoint }],
    }));

    // Reset form for next point
    setEditRoutePoint({
      place: "",
      latitude: 0,
      longitude: 0,
      type: "GP",
    });
  };

  // Remove route point from the edit array
  const handleRemoveEditRoutePoint = (index) => {
    // Don't allow removing the last point
    if (editLocation.route.length <= 1) {
      setSnackbar({
        open: true,
        message:
          "Cannot remove the last point. A route must have at least one point.",
        severity: "warning",
      });
      return;
    }

    setEditLocation((prev) => ({
      ...prev,
      route: prev.route.filter((_, i) => i !== index),
    }));
  };

  // Update location by sending data to API
  const handleUpdateLocation = async () => {
    if (isViewer) return;
    try {
      setUpdatingLocation(true);

      // Show pending state in UI
      setSnackbar({
        open: true,
        message: "Updating location...",
        severity: "info",
      });

      // Log the data being sent for debugging
      console.log(
        "Sending updated location data:",
        JSON.stringify(editLocation)
      );

      // API endpoint
      const apiEndpoint = `${LOCATION_URL}/api/locations/${editLocation._id}`;

      // Format data for API
      const formattedData = {
        status: editLocation.status,
        // Only include route if it was modified
        route: editLocation.route.map((point) => ({
          ...point,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
        })),
      };

      console.log("Update Location API URL", apiEndpoint);
      console.log("Update Location API Body", formattedData);

      try {
        const response = await fetch(apiEndpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(formattedData),
        });

        if (!response) {
          throw new Error("No response received from server");
        }

        // Check response status
        console.log("Update location response status:", response.status);

        // Handle unsuccessful responses
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response from update location:", errorText);
          throw new Error(
            `Failed to update location. Status: ${response.status}`
          );
        }

        const data = await response.json();
        console.log("Update location successful:", data);

        // Show success message
        setSnackbar({
          open: true,
          message: "Location updated successfully!",
          severity: "success",
        });

        // Close dialog
        handleCloseEditDialog();

        // Refresh locations
        fetchLocations();
      } catch (err) {
        // Handle CORS issues
        if (
          err.name === "TypeError" &&
          err.message.includes("Failed to fetch")
        ) {
          throw new Error(
            "Network error: Could not connect to the server. This could be due to CORS issues or the server being down."
          );
        }
        throw err;
      }
    } catch (err) {
      console.error("Error updating location:", err);
      setSnackbar({
        open: true,
        message: err.message || "Error updating location",
        severity: "error",
      });
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Handle dragging of route points in edit dialog
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);

    if (sourceIndex === targetIndex) return;

    setEditLocation((prev) => {
      const newRoute = [...prev.route];
      const [movedItem] = newRoute.splice(sourceIndex, 1);
      newRoute.splice(targetIndex, 0, movedItem);
      return { ...prev, route: newRoute };
    });
  };

  // Helper function to check if route calculation is in progress
  const isRouteCalculationInProgress = () => {
    if (selectedLocations.length === 0) return false;
    const selectedLocation = selectedLocations[0];
    // Route calculation is in progress if we have no routeInfo and no error
    return !selectedLocation.routeInfo && !selectedLocation.error;
  };

  // Handle opening export menu
  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  // Handle closing export menu
  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  // Export to Excel
  const handleExportToExcel = (type = "desktop") => {
    handleDesktopToExcel({
      selectedLocations,
      type,
      setSnackbar,
      handleExportClose,
      surveyRoutes,
      distance,
    });
  };

  const handlePhysicalSurveyExport = () => {
    physicalSurveyExport(surveys, selectedLocations);
  };

  // Export to KML
  const handleExportToKML = async (type = "desktop") => {
    await exportToKML(
      selectedLocations,
      surveyRoutes,
      getSurveysForLocation,
      setSnackbar,
      setExportType,
      handleExportClose,
      type
    );
  };

  // Add this function to handle survey marker click
  const handleSurveyMarkerClick = async (surveyId) => {
    try {
      setLoadingSurvey(true);
      setSidebarOpen(true);
      setMapZoom(17); // Set higher zoom level for survey points

      // Check if we already have the full survey data
      const existingSurvey = surveys.find((s) => s._id === surveyId);
      if (existingSurvey && existingSurvey.mediaFiles) {
        setSelectedSurvey(existingSurvey);
        setLoadingSurvey(false);
        return;
      }

      // Fetch complete survey details if needed
      const response = await fetch(`${SURVEY_URL}/api/surveys/${surveyId}`);
      if (!response.ok)
        throw new Error(
          `Failed to fetch survey details: ${response.statusText}`
        );

      const data = await response.json();
      if (!data.success) throw new Error("Failed to fetch survey details");

      setSelectedSurvey(data.data);
    } catch (err) {
      console.error("Error fetching survey details:", err);
      setError(`Error fetching survey details: ${err.message}`);
      // Close sidebar on error
      setSidebarOpen(false);
      setSelectedSurvey(null);
    } finally {
      setLoadingSurvey(false);
    }
  };

  // Add this function to handle sidebar close
  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setSelectedSurvey(null);
  };

  const handleLocationMarkerClick = (locationId) => {
    navigate(`/location/${locationId}`);
  };

  // Add map click handler
  const handleMapClick = (event) => {
    if (isViewer) return;
    // Only allow adding points if a location is selected
    if (selectedLocations.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select a location to add points to its route",
        severity: "warning",
      });
      return;
    }

    const clickedCoordinates = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };

    setMapClickDialog({
      open: true,
      coordinates: clickedCoordinates,
      locationData: selectedLocations[0].location,
    });
  };

  const handleMapClickDialogClose = () => {
    setMapClickDialog({
      open: false,
      coordinates: null,
      locationData: null,
    });
  };

  const handleAddPointToRoute = async () => {
    try {
      setAddingPoint(true);

      const { coordinates, locationData } = mapClickDialog;

      // Create new route point
      const newPoint = {
        place: `Added Point ${Date.now()}`, // Temporary name
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        type: "others",
        isTemporary: true, // Mark as temporary for export exclusion
      };

      // Update the location's route
      const updatedRoute = [...locationData.route, newPoint];

      const apiEndpoint = `${LOCATION_URL}/api/locations/${locationData._id}`;

      const response = await fetch(apiEndpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          route: updatedRoute.map((point) => ({
            ...point,
            latitude: Number(point.latitude),
            longitude: Number(point.longitude),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update location: ${response.status}`);
      }

      setSnackbar({
        open: true,
        message: "Point added to route successfully!",
        severity: "success",
      });

      // Refresh locations to get updated data
      fetchLocations();

      handleMapClickDialogClose();
    } catch (err) {
      console.error("Error adding point to route:", err);
      setSnackbar({
        open: true,
        message: err.message || "Error adding point to route",
        severity: "error",
      });
    } finally {
      setAddingPoint(false);
    }
  };

  const handleRemoveTemporaryPoint = async (locationId, pointIndex) => {
    try {
      const location = locations.find((loc) => loc._id === locationId);
      if (!location) return;

      // Remove the point from route
      const updatedRoute = location.route.filter(
        (_, index) => index !== pointIndex
      );

      const apiEndpoint = `${LOCATION_URL}/api/locations/${locationId}`;

      const response = await fetch(apiEndpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          route: updatedRoute.map((point) => ({
            ...point,
            latitude: Number(point.latitude),
            longitude: Number(point.longitude),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update location: ${response.status}`);
      }

      setSnackbar({
        open: true,
        message: "Point removed from route successfully!",
        severity: "success",
      });

      // Refresh locations to get updated data
      fetchLocations();
    } catch (err) {
      console.error("Error removing point from route:", err);
      setSnackbar({
        open: true,
        message: err.message || "Error removing point from route",
        severity: "error",
      });
    }
  };

  // Handle removing "others" type points
  const handleRemoveOthersPoint = async (locationId, pointIndex) => {
    try {
      const location = locations.find((loc) => loc._id === locationId);
      if (!location) return;

      // Remove the point from route
      const updatedRoute = location.route.filter(
        (_, index) => index !== pointIndex
      );

      const apiEndpoint = `${LOCATION_URL}/api/locations/${locationId}`;

      const response = await fetch(apiEndpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          route: updatedRoute.map((point) => ({
            ...point,
            latitude: Number(point.latitude),
            longitude: Number(point.longitude),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update location: ${response.status}`);
      }

      setSnackbar({
        open: true,
        message: "Point removed from route successfully!",
        severity: "success",
      });

      // Refresh locations to get updated data
      fetchLocations();
    } catch (err) {
      console.error("Error removing point from route:", err);
      setSnackbar({
        open: true,
        message: err.message || "Error removing point from route",
        severity: "error",
      });
    }
  };

  const routeCalculating = isRouteCalculationInProgress();
  const selectedLocationValue =
    selectedLocations.length > 0
      ? `${selectedLocations[0].location.block} (${selectedLocations[0].location.district})`
      : null;

  const dialogTitle = (title, subtitle, onClose) => (
    <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title}
        {subtitle && (
          <Typography variant="body2" component="div" sx={{ color: "text.secondary", mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <IconButton aria-label="Close" onClick={onClose} size="small" sx={{ mt: -0.5, mr: -1 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
  );

  const sectionHeading = (title, description) => (
    <Box sx={{ mb: 2 }}>
      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
          {description}
        </Typography>
      )}
    </Box>
  );

  const fieldGridSx = {
    display: "grid",
    gap: 2,
    gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
  };

  return (
    <Box>
      <PageHeader
        title="Locations"
        subtitle="OFC routes, survey points and field data for each block"
        actions={
          <Tooltip title={isViewer ? "Viewers can't create locations" : ""}>
            <span>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog} disabled={isViewer}>
                New location
              </Button>
            </span>
          </Tooltip>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Location picker and actions */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, p: 2 }}>
          <Autocomplete
            options={locationOptions}
            value={selectedLocationValue}
            onChange={handleLocationSelect}
            clearOnEscape
            isOptionEqualToValue={(option, value) => option === value}
            loading={loading}
            sx={{ width: { xs: "100%", sm: 380 } }}
            slotProps={{ listbox: { sx: { maxHeight: 320 } } }}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              const match = option.match(/^(.*) \((.*)\)$/);
              return (
                <Box component="li" key={key} {...optionProps} sx={{ flexDirection: "column", alignItems: "flex-start !important" }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {match ? match[1] : option}
                  </Typography>
                  {match && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {match[2]}
                    </Typography>
                  )}
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Find a location by block or district"
                inputProps={{ ...params.inputProps, "aria-label": "Find a location" }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {selectedLocations.length > 0 && (
            <>
              <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={handleOpenEditDialog} disabled={isViewer}>
                Edit location
              </Button>
              <Button
                variant="outlined"
                startIcon={routeCalculating ? <CircularProgress size={16} color="inherit" /> : <FileDownloadOutlinedIcon />}
                endIcon={routeCalculating ? undefined : <ExpandMoreIcon />}
                onClick={handleExportClick}
                disabled={routeCalculating || isViewer}
                aria-haspopup="menu"
              >
                {routeCalculating ? "Calculating routes…" : "Export"}
              </Button>
            </>
          )}

          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {loading ? "Loading locations…" : `${locations.length} ${locations.length === 1 ? "location" : "locations"}`}
          </Typography>
        </Box>
      </Card>

      {loading || !isLoaded ? (
        <Card>
          <Skeleton variant="rectangular" height={44} />
          <Box sx={{ position: "relative" }}>
            <Skeleton variant="rectangular" sx={{ height: containerStyle.height, minHeight: containerStyle.minHeight }} />
            <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, bgcolor: "background.paper", borderRadius: 1.5, boxShadow: 3 }}>
                <CircularProgress size={18} />
                <Typography variant="body2">Loading map…</Typography>
              </Box>
            </Box>
          </Box>
        </Card>
      ) : (
        <>
          <InfoCardComponent
            selectedLocations={selectedLocations}
            locationRoutes={locationRoutes}
            surveyRoutes={surveyRoutes}
            surveys={surveys}
            getSurveysForLocation={getSurveysForLocation}
            handleLocationMarkerClick={handleLocationMarkerClick}
            STATUS_MAPPING={STATUS_MAPPING}
            distance={distance}
          />
          <Card>
            <MapComponent
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              onMapLoad={onMapLoad}
              handleMapClick={handleMapClick}
              selectedLocations={selectedLocations}
              locationRoutes={locationRoutes}
              handleRemoveTemporaryPoint={handleRemoveTemporaryPoint}
              handleRemoveOthersPoint={handleRemoveOthersPoint}
              handleLocationMarkerClick={handleLocationMarkerClick}
              getSurveysForLocation={getSurveysForLocation}
              handleSurveyMarkerClick={handleSurveyMarkerClick}
              surveys={surveys}
              surveyRoutes={surveyRoutes}
              locations={locations}
              containerStyle={containerStyle}
              routeColor={routeColor}
              surveyRouteColor={surveyRouteColor}
              refreshLocations={refreshLocations}
              distance={distance}
              setDistance={setDistance}
              isViewer={isViewer}
            />
            <SymbolsComponent surveys={surveys} />
          </Card>
        </>
      )}

      {/* Create Location Dialog */}
      <Dialog open={openCreateDialog} onClose={creatingLocation ? undefined : handleCloseCreateDialog} fullWidth maxWidth="md" fullScreen={isPhone} scroll="paper">
        {dialogTitle("New location", "The block and the route its OFC desktop survey follows", handleCloseCreateDialog)}
        <DialogContent dividers>
          {sectionHeading("Location")}
          <Box sx={fieldGridSx}>
            <TextField label="State" name="state" value={newLocation.state} onChange={handleLocationInputChange} size="small" required />
            <TextField label="State code" name="state_code" value={newLocation.state_code} onChange={handleLocationInputChange} size="small" required />
            <TextField label="District" name="district" value={newLocation.district} onChange={handleLocationInputChange} size="small" required />
            <TextField label="District code" name="district_code" value={newLocation.district_code} onChange={handleLocationInputChange} size="small" required />
            <TextField label="Block" name="block" value={newLocation.block} onChange={handleLocationInputChange} size="small" required />
            <TextField label="Block code" name="block_code" value={newLocation.block_code} onChange={handleLocationInputChange} size="small" required />
            <TextField
              label="Block address"
              name="block_address"
              value={newLocation.block_address}
              onChange={handleLocationInputChange}
              size="small"
              required
              sx={{ gridColumn: "1 / -1" }}
            />
          </Box>

          <Divider sx={{ my: 3 }} />
          {sectionHeading("Route points", "Add the points in the order the route should follow")}
          <RoutePointForm point={newRoutePoint} onChange={handleRoutePointChange} onAdd={handleAddRoutePoint} />
          <Box sx={{ mt: 2 }}>
            <RoutePointTable points={newLocation.route} onRemove={handleRemoveRoutePoint} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={handleCloseCreateDialog} color="inherit" disabled={creatingLocation}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateLocation}
            variant="contained"
            disabled={creatingLocation || !newLocation.district || !newLocation.block || newLocation.route.length === 0}
            startIcon={creatingLocation ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {creatingLocation ? "Creating…" : "Create location"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={openEditDialog} onClose={updatingLocation ? undefined : handleCloseEditDialog} fullWidth maxWidth="md" fullScreen={isPhone} scroll="paper">
        {dialogTitle(
          "Edit location",
          editLocation ? [editLocation.block, editLocation.district].filter(Boolean).join(", ") : null,
          handleCloseEditDialog
        )}
        <DialogContent dividers>
          {editLocation && (
            <>
              {sectionHeading("Location", "Names and codes are fixed once a location is created")}
              <Box sx={fieldGridSx}>
                <TextField label="State" value={editLocation.state || ""} size="small" disabled />
                <TextField label="State code" value={editLocation.state_code || ""} size="small" disabled />
                <TextField label="District" value={editLocation.district || ""} size="small" disabled />
                <TextField label="District code" value={editLocation.district_code || ""} size="small" disabled />
                <TextField label="Block" value={editLocation.block || ""} size="small" disabled />
                <TextField label="Block code" value={editLocation.block_code || ""} size="small" disabled />
                <TextField
                  label="Block address"
                  value={editLocation.block_address || ""}
                  size="small"
                  disabled
                  sx={{ gridColumn: { md: "1 / 3" } }}
                />
                <TextField
                  select
                  label="Status"
                  name="status"
                  value={editLocation.status}
                  onChange={handleEditLocationInputChange}
                  size="small"
                  required
                >
                  {Object.entries(STATUS_MAPPING).map(([value, label]) => (
                    <MenuItem key={value} value={parseInt(value)}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Divider sx={{ my: 3 }} />
              {sectionHeading("Route points", "Drag rows to reorder. The first point is where the route starts and ends.")}
              <RoutePointForm point={editRoutePoint} onChange={handleEditRoutePointChange} onAdd={handleAddEditRoutePoint} />
              <Box sx={{ mt: 2 }}>
                <RoutePointTable
                  points={editLocation.route}
                  onRemove={handleRemoveEditRoutePoint}
                  dragHandlers={{ onDragStart: handleDragStart, onDragOver: handleDragOver, onDrop: handleDrop }}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={handleCloseEditDialog} color="inherit" disabled={updatingLocation}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateLocation}
            variant="contained"
            disabled={updatingLocation || !editLocation || editLocation.route.length === 0}
            startIcon={updatingLocation ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {updatingLocation ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || "info"} variant="filled" sx={{ width: "100%", boxShadow: 6 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Export menu */}
      <Menu
        anchorEl={exportAnchorEl}
        open={openExportMenu}
        onClose={handleExportClose}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 260 } }, list: { dense: true } }}
      >
        <ListSubheader sx={{ lineHeight: 2.5, bgcolor: "transparent" }}>Desktop survey routes</ListSubheader>
        <MenuItem onClick={() => handleExportToExcel("desktop")}>
          <ListItemIcon>
            <TableViewOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Excel" />
        </MenuItem>
        <MenuItem onClick={() => handleExportToKML("desktop")}>
          <ListItemIcon>
            <MapOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="KML" />
        </MenuItem>
        <Divider />
        <ListSubheader sx={{ lineHeight: 2.5, bgcolor: "transparent" }}>Physical survey routes</ListSubheader>
        <MenuItem onClick={() => handlePhysicalSurveyExport()}>
          <ListItemIcon>
            <TableViewOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Excel" />
        </MenuItem>
        <MenuItem onClick={() => handleExportToKML("physical")}>
          <ListItemIcon>
            <MapOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="KML" />
        </MenuItem>
      </Menu>

      {/* Survey Sidebar */}
      {sidebarOpen && (
        <SurveySidebar open={sidebarOpen} survey={selectedSurvey || null} loading={loadingSurvey} onClose={handleSidebarClose} />
      )}

      {/* Map Click Dialog */}
      <Dialog open={mapClickDialog.open} onClose={addingPoint ? undefined : handleMapClickDialogClose} fullWidth maxWidth="xs">
        {dialogTitle("Add point to route?", "Adds a temporary point to the desktop survey route", handleMapClickDialogClose)}
        <DialogContent dividers>
          {mapClickDialog.coordinates && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 2 }}>
              {[
                ["Latitude", mapClickDialog.coordinates.lat],
                ["Longitude", mapClickDialog.coordinates.lng],
              ].map(([label, value]) => (
                <Box key={label} sx={{ px: 1.5, py: 1, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {value.toFixed(6)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          <Alert severity="info" icon={false}>
            The point is for route planning only: it's drawn on the map but left out of every Excel and KML export.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={handleMapClickDialogClose} color="inherit" disabled={addingPoint}>
            Cancel
          </Button>
          <Button
            onClick={handleAddPointToRoute}
            variant="contained"
            disabled={addingPoint}
            startIcon={addingPoint ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {addingPoint ? "Adding…" : "Add point"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MapViewPage;
