import React, { useState, useEffect } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Container,
  Grid,
  Chip,
  Autocomplete,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Menu,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
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

const containerStyle = {
  width: "100%",
  height: "70vh", // More responsive height
  borderRadius: "12px",
  margin: "auto",
  marginBottom: "32px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)", // Add shadow for depth
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
        setError(
          "CORS error: Unable to access the API. This might be due to cross-origin restrictions. Please ensure the API has CORS enabled."
        );
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

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      <Paper
        elevation={3}
        sx={{ p: 4, borderRadius: "16px", overflow: "hidden" }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="h4" fontWeight="700" sx={{ color: "#1e293b" }}>
            OFC Route Map View
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            disabled={isViewer}
            sx={{
              borderRadius: "8px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 6px rgba(37, 99, 235, 0.2)",
              '&.Mui-disabled': {
                bgcolor: '#bdbdbd',
                color: '#ffffff',
                boxShadow: 'none'
              }
            }}
          >
            Create New Location
          </Button>
        </Box>
        <Typography
          variant="subtitle1"
          sx={{ color: "text.secondary", mb: 3, lineHeight: 1.6 }}
        >
          All locations' routes are shown in blue. Survey points are shown in
          yellow. For locations with status 5, survey points are connected with
          yellow routes.
        </Typography>

        {/* Search and controls section */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 4 }}>
          <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
            <Autocomplete
              // Remove multiple prop for single selection
              options={locationOptions}
              value={
                selectedLocations.length > 0
                  ? `${selectedLocations[0].location.block} (${selectedLocations[0].location.district})`
                  : null
              }
              onChange={handleLocationSelect}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Location"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    sx: { borderRadius: "8px" },
                  }}
                />
              )}
              clearOnEscape
              isOptionEqualToValue={(option, value) => option === value}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(0, 0, 0, 0.12)" },
                  "&:hover fieldset": { borderColor: "primary.main" },
                },
                "& .MuiAutocomplete-option": {
                  fontSize: "0.95rem",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                },
                "& .MuiAutocomplete-inputRoot": {
                  minHeight: "52px",
                },
              }}
              ListboxProps={{
                sx: { maxHeight: 250 },
              }}
            />
          </Box>
          {selectedLocations.length > 0 && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={handleOpenEditDialog}
                disabled={isViewer}
                sx={{ borderRadius: "8px", fontWeight: 500, flex: 1,
                  '&.Mui-disabled': {
                    bgcolor: '#eeeeee',
                    color: '#9e9e9e',
                    borderColor: '#bdbdbd'
                  }
                }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportClick}
                disabled={
                  selectedLocations.length === 0 ||
                  isRouteCalculationInProgress()
                }
                sx={{
                  borderRadius: "8px",
                  fontWeight: 500,
                  flex: 1,
                  opacity: isRouteCalculationInProgress() ? 0.6 : 1,
                }}
              >
                {isRouteCalculationInProgress() ? "Calculating..." : "Export"}
              </Button>
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: "8px" }}>
            {error}
          </Alert>
        )}

        {loading || !isLoaded ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress size={60} thickness={4} />
            <Typography sx={{ mt: 3, fontWeight: 500 }}>
              Loading map data...
            </Typography>
          </Box>
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
            <SymbolsComponent surveys={surveys} />
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
            />
          </>
        )}
      </Paper>

      {/* Create Location Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: "12px",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "white",
            fontSize: "1.3rem",
            fontWeight: 600,
            py: 2,
          }}
        >
          Create New Location
          <IconButton
            aria-label="close"
            onClick={handleCloseCreateDialog}
            sx={{
              position: "absolute",
              right: 16,
              top: 12,
              color: "white",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Box sx={{ p: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="State"
                  name="state"
                  value={newLocation.state}
                  onChange={handleLocationInputChange}
                  fullWidth
                  margin="normal"
                  required
                  InputProps={{
                    sx: { borderRadius: "8px" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="State Code"
                  name="state_code"
                  value={newLocation.state_code}
                  onChange={handleLocationInputChange}
                  fullWidth
                  margin="normal"
                  required
                  InputProps={{
                    sx: { borderRadius: "8px" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="District"
                  name="district"
                  value={newLocation.district}
                  onChange={handleLocationInputChange}
                  fullWidth
                  margin="normal"
                  required
                  InputProps={{
                    sx: { borderRadius: "8px" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="District Code"
                  name="district_code"
                  value={newLocation.district_code}
                  onChange={handleLocationInputChange}
                  fullWidth
                  margin="normal"
                  required
                  InputProps={{
                    sx: { borderRadius: "8px" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Block"
                  name="block"
                  value={newLocation.block}
                  onChange={handleLocationInputChange}
                  fullWidth
                  margin="normal"
                  required
                  InputProps={{
                    sx: { borderRadius: "8px" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Block Code"
                  name="block_code"
                  value={newLocation.block_code}
                  onChange={handleLocationInputChange}
                  fullWidth
                  margin="normal"
                  required
                  InputProps={{
                    sx: { borderRadius: "8px" },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Block Address"
                  name="block_address"
                  value={newLocation.block_address}
                  onChange={handleLocationInputChange}
                  fullWidth
                  margin="normal"
                  required
                  InputProps={{
                    sx: { borderRadius: "8px" },
                  }}
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 4,
                mb: 3,
                borderLeft: "4px solid",
                borderColor: "secondary.main",
                pl: 2,
                py: 0.5,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Add Route Points
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add all points in the order they should appear in the route
              </Typography>
            </Box>

            {/* New route point form */}
            <Paper
              sx={{
                p: 2,
                borderRadius: "12px",
                mb: 3,
                bgcolor: "rgba(0,0,0,0.02)",
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Place Name"
                    name="place"
                    value={newRoutePoint.place}
                    onChange={handleRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                    InputProps={{
                      sx: { borderRadius: "8px" },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Latitude"
                    name="latitude"
                    type="number"
                    value={newRoutePoint.latitude}
                    onChange={handleRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ step: 0.000001, min: -90, max: 90 }}
                    InputProps={{
                      sx: { borderRadius: "8px" },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Longitude"
                    name="longitude"
                    type="number"
                    value={newRoutePoint.longitude}
                    onChange={handleRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ step: 0.000001, min: -180, max: 180 }}
                    InputProps={{
                      sx: { borderRadius: "8px" },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    label="Point Type"
                    name="type"
                    value={newRoutePoint.type}
                    onChange={handleRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                    InputProps={{
                      sx: { borderRadius: "8px" },
                    }}
                  >
                    <MenuItem value="BHQ">BHQ (Block Head Quarter)</MenuItem>
                    <MenuItem value="GP">GP (Gram Panchayat)</MenuItem>
                    <MenuItem value="others">Others</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleAddRoutePoint}
                    disabled={
                      !newRoutePoint.place ||
                      !newRoutePoint.type ||
                      !newRoutePoint.latitude ||
                      !newRoutePoint.longitude
                    }
                    sx={{
                      borderRadius: "8px",
                      px: 3,
                      fontWeight: 500,
                      "&:hover": {
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      },
                    }}
                  >
                    Add Point
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Display route points table */}
            {newLocation.route.length > 0 && (
              <TableContainer
                component={Paper}
                sx={{
                  mt: 3,
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <Table size="small">
                  <TableHead sx={{ bgcolor: "primary.light" }}>
                    <TableRow>
                      <TableCell sx={{ color: "white", fontWeight: 500 }}>
                        Place
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: 500 }}>
                        Latitude
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: 500 }}>
                        Longitude
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: 500 }}>
                        Type
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: 500 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {newLocation.route.map((point, index) => (
                      <TableRow
                        key={index}
                        sx={{
                          "&:nth-of-type(odd)": { bgcolor: "rgba(0,0,0,0.02)" },
                        }}
                      >
                        <TableCell>{point.place}</TableCell>
                        <TableCell>{point.latitude.toFixed(6)}</TableCell>
                        <TableCell>{point.longitude.toFixed(6)}</TableCell>
                        <TableCell>{point.type}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveRoutePoint(index)}
                            sx={{
                              "&:hover": {
                                bgcolor: "error.light",
                                color: "white",
                              },
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleCloseCreateDialog}
            variant="outlined"
            sx={{ borderRadius: "8px", px: 3 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateLocation}
            variant="contained"
            color="primary"
            disabled={
              creatingLocation ||
              !newLocation.district ||
              !newLocation.block ||
              newLocation.route.length === 0
            }
            sx={{
              borderRadius: "8px",
              px: 4,
              fontWeight: 600,
              ml: 2,
            }}
          >
            {creatingLocation ? "Creating..." : "Create Location"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: "12px",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "white",
            fontSize: "1.3rem",
            fontWeight: 600,
            py: 2,
          }}
        >
          Edit Location
          <IconButton
            aria-label="close"
            onClick={handleCloseEditDialog}
            sx={{
              position: "absolute",
              right: 16,
              top: 12,
              color: "white",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editLocation && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="State"
                    name="state"
                    value={editLocation.state}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="State Code"
                    name="state_code"
                    value={editLocation.state_code}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="District"
                    name="district"
                    value={editLocation.district}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="District Code"
                    name="district_code"
                    value={editLocation.district_code}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Block"
                    name="block"
                    value={editLocation.block}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Block Code"
                    name="block_code"
                    value={editLocation.block_code}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Block Address"
                    name="block_address"
                    value={editLocation.block_address}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Status"
                    name="status"
                    type="number"
                    value={editLocation.status}
                    onChange={handleEditLocationInputChange}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ min: 1, max: 6 }}
                    select
                  >
                    {Object.entries(STATUS_MAPPING).map(([value, label]) => (
                      <MenuItem key={value} value={parseInt(value)}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Edit Route Points
              </Typography>

              {/* New route point form */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Place Name"
                    name="place"
                    value={editRoutePoint.place}
                    onChange={handleEditRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Latitude"
                    name="latitude"
                    type="number"
                    value={editRoutePoint.latitude}
                    onChange={handleEditRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ step: 0.000001, min: -90, max: 90 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Longitude"
                    name="longitude"
                    type="number"
                    value={editRoutePoint.longitude}
                    onChange={handleEditRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ step: 0.000001, min: -180, max: 180 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    label="Point Type"
                    name="type"
                    value={editRoutePoint.type}
                    onChange={handleEditRoutePointChange}
                    fullWidth
                    margin="normal"
                    required
                  >
                    <MenuItem value="BHQ">BHQ (Block Head Quarter)</MenuItem>
                    <MenuItem value="GP">GP (Gram Panchayat)</MenuItem>
                    <MenuItem value="others">Others</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleAddEditRoutePoint}
                    disabled={
                      !editRoutePoint.place ||
                      !editRoutePoint.type ||
                      !editRoutePoint.latitude ||
                      !editRoutePoint.longitude
                    }
                  >
                    Add Point
                  </Button>
                </Grid>
              </Grid>

              {/* Display route points table with drag-and-drop */}
              {editLocation.route && editLocation.route.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mb: 2,
                      p: 2,
                      bgcolor: "info.light",
                      borderRadius: "8px",
                      color: "info.contrastText",
                    }}
                  >
                    <DragIndicatorIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle2" fontWeight={500}>
                      Drag to reorder points. The first point is both the
                      starting and ending point.
                    </Typography>
                  </Box>

                  <TableContainer
                    component={Paper}
                    sx={{
                      borderRadius: "12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Table size="small">
                      <TableHead sx={{ bgcolor: "primary.light" }}>
                        <TableRow>
                          <TableCell
                            width="80px"
                            sx={{ color: "white", fontWeight: 500 }}
                          >
                            Order
                          </TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 500 }}>
                            Place
                          </TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 500 }}>
                            Latitude
                          </TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 500 }}>
                            Longitude
                          </TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 500 }}>
                            Type
                          </TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 500 }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {editLocation.route.map((point, index) => (
                          <TableRow
                            key={index}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            sx={{
                              cursor: "move",
                              "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                              ...(index === 0
                                ? {
                                    bgcolor: "primary.light",
                                    "& .MuiTableCell-root": {
                                      color: "white",
                                      fontWeight: 500,
                                    },
                                  }
                                : {
                                    "&:nth-of-type(odd)": {
                                      bgcolor: "rgba(0,0,0,0.02)",
                                    },
                                  }),
                            }}
                          >
                            <TableCell>
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <DragIndicatorIcon
                                  fontSize="small"
                                  sx={{ mr: 1, cursor: "grab" }}
                                />
                                {index + 1}
                              </Box>
                            </TableCell>
                            <TableCell>{point.place}</TableCell>
                            <TableCell>
                              {Number(point.latitude).toFixed(6)}
                            </TableCell>
                            <TableCell>
                              {Number(point.longitude).toFixed(6)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={point.type}
                                size="small"
                                color={index === 0 ? "default" : "primary"}
                                variant={index === 0 ? "default" : "outlined"}
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                color={index === 0 ? "default" : "error"}
                                onClick={() =>
                                  handleRemoveEditRoutePoint(index)
                                }
                                sx={{
                                  "&:hover": {
                                    bgcolor:
                                      index === 0
                                        ? "rgba(255,255,255,0.2)"
                                        : "error.light",
                                    color: index === 0 ? "inherit" : "white",
                                  },
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            onClick={handleUpdateLocation}
            variant="contained"
            color="primary"
            disabled={
              updatingLocation ||
              !editLocation ||
              editLocation.route.length === 0
            }
          >
            {updatingLocation ? "Updating..." : "Update Location"}
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
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity || "info"}
          sx={{
            width: "100%",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            borderRadius: "8px",
            "& .MuiAlert-icon": {
              fontSize: "1.25rem",
            },
            "& .MuiAlert-message": {
              fontSize: "0.95rem",
              fontWeight: 500,
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Export menu */}
      <Menu
        anchorEl={exportAnchorEl}
        open={openExportMenu}
        onClose={handleExportClose}
        PaperProps={{
          sx: {
            borderRadius: "8px",
            mt: 1,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
          >
            OFC Routes (Desktop Survey)
          </Typography>
        </Box>
        <MenuItem
          onClick={() => handleExportToExcel("desktop")}
          sx={{ py: 1.5, px: 3 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FileDownloadIcon color="primary" />
            <Typography>Export to Excel</Typography>
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => handleExportToKML("desktop")}
          sx={{ py: 1.5, px: 3 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FileDownloadIcon color="primary" />
            <Typography>Export to KML</Typography>
          </Box>
        </MenuItem>

        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            mt: 1,
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={600}
            color="text.secondary"
          >
            Survey Routes (Physical Survey)
          </Typography>
        </Box>
        <MenuItem
          onClick={() => handlePhysicalSurveyExport()}
          sx={{ py: 1.5, px: 3 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FileDownloadIcon color="warning" />
            <Typography>Export to Excel</Typography>
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => handleExportToKML("physical")}
          sx={{ py: 1.5, px: 3 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <FileDownloadIcon color="warning" />
            <Typography>Export to KML</Typography>
          </Box>
        </MenuItem>
      </Menu>

      {/* Survey Sidebar */}
      {sidebarOpen && selectedSurvey ? (
        <SurveySidebar
          open={sidebarOpen}
          survey={selectedSurvey}
          loading={loadingSurvey}
          onClose={handleSidebarClose}
        />
      ) : sidebarOpen ? (
        <SurveySidebar
          open={sidebarOpen}
          survey={null}
          loading={loadingSurvey}
          onClose={handleSidebarClose}
        />
      ) : null}

      {/* Map Click Dialog */}
      <Dialog
        open={mapClickDialog.open}
        onClose={handleMapClickDialogClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "12px",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "white",
            fontSize: "1.3rem",
            fontWeight: 600,
            py: 2,
          }}
        >
          Add Point to Route
          <IconButton
            aria-label="close"
            onClick={handleMapClickDialogClose}
            sx={{
              position: "absolute",
              right: 16,
              top: 12,
              color: "white",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Do you want to add this point to the desktop survey route?
          </Typography>
          {mapClickDialog.coordinates && (
            <Box
              sx={{
                p: 2,
                bgcolor: "rgba(0,0,0,0.04)",
                borderRadius: "8px",
                mb: 2,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                Point Coordinates:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Latitude: {mapClickDialog.coordinates.lat.toFixed(6)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Longitude: {mapClickDialog.coordinates.lng.toFixed(6)}
              </Typography>
            </Box>
          )}
          <Typography
            variant="caption"
            color="warning.main"
            sx={{
              display: "block",
              mt: 1,
              p: 1,
              bgcolor: "warning.light",
              borderRadius: "4px",
              color: "warning.dark",
            }}
          >
            Note: This point will be added to the route but excluded from all
            exports (Excel and KML). It's only for visual reference and route
            planning.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMapClickDialogClose}>Cancel</Button>
          <Button
            onClick={handleAddPointToRoute}
            variant="contained"
            color="primary"
            disabled={addingPoint}
          >
            {addingPoint ? "Adding..." : "Add Point"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MapViewPage;
