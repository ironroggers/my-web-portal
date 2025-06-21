import React, { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Container,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
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
import SurveySidebar from "./SurveySidebar";
import * as XLSX from "xlsx";
import { LOCATION_URL, SURVEY_URL } from "../API/api-keys.jsx";
import surveyService from "../services/surveyService";
import physicalSurveyExport from "../utils/physicalSurveyExport.util.jsx";
import { exportToKML } from "../utils/exportUtils";

const GOOGLE_MAPS_API_KEY = "AIzaSyC2pds2TL5_lGUM-7Y1CFiGq8Wrn0oULr0";

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
  const [locations, setLocations] = useState([]);
  const [locationRoutes, setLocationRoutes] = useState([]); // [{points, directions, routeInfo, mapCenter, error}]
  const [surveyRoutes, setSurveyRoutes] = useState([]); // [{locationId, directions}]
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocations, setSelectedLocations] = useState([]); // Changed to array for multiple selection
  const [mapZoom, setMapZoom] = useState(11);

  // New state for route visibility
  const [routeVisibility, setRouteVisibility] = useState({
    desktopSurvey: true, // Blue OFC routes
    physicalSurvey: true, // Yellow survey routes
  });

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

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Add this useEffect to adjust map bounds when locations are selected
  useEffect(() => {
    if (isLoaded && selectedLocations.length > 0 && window.google) {
      // If we have a map reference, we can fit the bounds
      // This will be implemented via the onLoad callback below
    }
  }, [selectedLocations, isLoaded]);

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

  useEffect(() => {
    fetchLocations();
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (locations.length > 0 && isLoaded) {
      getAllLocationRoutes(locations);
    }
  }, [locations, isLoaded]);

  useEffect(() => {
    if (surveys.length > 0 && isLoaded) {
      getSurveyRoutes();
      console.log("Survey routes updated for", surveys.length, "surveys");
    }
  }, [surveys, isLoaded]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
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

  // For all locations, get their optimized route
  const getAllLocationRoutes = async (locations) => {
    const results = await Promise.all(
      locations.map(async (location) => {
        const points = getPointsForLocation(location);
        if (!window.google || !window.google.maps || points.length < 2) {
          return {
            points,
            directions: null,
            routeInfo: null,
            mapCenter: points[0] || defaultCenter,
            error: points.length < 2 ? "Not enough points for route" : null,
            location,
          };
        }

        // Handle case where we have more than 10 waypoints (Google Maps API limit)
        if (points.length > 11) {
          // 10 waypoints + origin = 11
          // Need to break into chunks
          return await getChunkedRoutes(points, location);
        } else {
          // Original code for 10 or fewer waypoints
          const directionsService = new window.google.maps.DirectionsService();
          const origin = points[0];
          const destination = points[0]; // Loop
          const waypoints = points
            .slice(1)
            .map((p) => ({ location: p, stopover: true }));
          return new Promise((resolve) => {
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
      })
    );
    setLocationRoutes(results);
  };

  // Function to handle routes with more than 10 waypoints
  const getChunkedRoutes = async (points, location) => {
    const directionsService = new window.google.maps.DirectionsService();

    // Split points into chunks (max 9 waypoints per chunk to allow for start/end points)
    // We use 9 instead of 10 to ensure we have room for start and end points
    const chunkSize = 9;
    const chunks = [];

    // First collect all the chunks, using overlapping points so routes connect
    for (let i = 0; i < points.length; i += chunkSize - 1) {
      if (i + chunkSize >= points.length) {
        // Last chunk - include all remaining points
        chunks.push(points.slice(i));
      } else {
        // Regular chunk with chunkSize points
        chunks.push(points.slice(i, i + chunkSize));
      }
    }

    console.log(`Split ${points.length} points into ${chunks.length} chunks`);

    // Now get directions for each chunk
    const chunkResults = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkPoints = chunks[i];
      const origin = chunkPoints[0];
      const destination = chunkPoints[chunkPoints.length - 1];
      const waypoints = chunkPoints
        .slice(1, chunkPoints.length - 1)
        .map((p) => ({
          location: p,
          stopover: true,
        }));

      try {
        const result = await new Promise((resolve, reject) => {
          directionsService.route(
            {
              origin,
              destination,
              waypoints,
              travelMode: window.google.maps.TravelMode.WALKING,
              optimizeWaypoints: false, // Don't optimize order as we want to follow the exact order
            },
            (result, status) => {
              if (status === "OK") {
                resolve(result);
              } else {
                console.error(`Chunk ${i} failed with status: ${status}`);
                reject(
                  new Error(
                    `Failed to get directions for chunk ${i}: ${status}`
                  )
                );
              }
            }
          );
        });

        chunkResults.push(result);
      } catch (error) {
        console.error(`Error getting directions for chunk ${i}:`, error);
      }
    }

    // Add final segment to connect back to the starting point
    if (points.length >= 2 && chunkResults.length > 0) {
      try {
        // Get the last point from the last chunk and connect it back to the first point
        const lastPoint = points[points.length - 1];
        const firstPoint = points[0];

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
      points,
      directions: chunkResults[0], // We'll use the first chunk for the main directions object
      routeInfo: {
        distance: totalDistance,
        time: totalDuration,
        legs: totalLegs,
      },
      mapCenter: points[0],
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
        // More than 10 waypoints plus origin
        try {
          // Apply similar chunking as in getAllLocationRoutes
          const chunkSize = 9;
          const chunks = [];

          for (let i = 0; i < points.length; i += chunkSize - 1) {
            if (i + chunkSize >= points.length) {
              chunks.push(points.slice(i));
            } else {
              chunks.push(points.slice(i, i + chunkSize));
            }
          }

          const chunkResults = [];
          let totalDistance = 0;

          for (let i = 0; i < chunks.length; i++) {
            const chunkPoints = chunks[i];
            const origin = chunkPoints[0];
            const destination = chunkPoints[chunkPoints.length - 1];
            const waypoints = chunkPoints
              .slice(1, chunkPoints.length - 1)
              .map((p) => ({
                location: p,
                stopover: true,
              }));

            const result = await new Promise((resolve) => {
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
                    // Add up the distance
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

            if (result) chunkResults.push(result);
          }

          if (chunkResults.length > 0) {
            // Add final segment to connect back to the starting point (for physical survey routes)
            try {
              // Get the last point and connect it back to the first point
              const lastPoint = points[points.length - 1];
              const firstPoint = points[0];

              // Skip if the last point is already the same as the first point
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
                        // Add up the distance for this final segment
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
                  console.log(
                    "Added final segment to close the survey route loop"
                  );
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
              directions: chunkResults[0], // First chunk for main directions
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

  const formatDistance = (meters) => {
    if (meters == null) return "Unknown";
    return meters < 1000
      ? `${meters.toFixed(0)} m`
      : `${(meters / 1000).toFixed(2)} km`;
  };

  const formatTime = (seconds) => {
    if (seconds == null) return "Unknown";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
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

  // Update handleLocationSelect to handle transitions better
  const handleLocationSelect = (event, values) => {
    if (!values || values.length === 0) {
      setSelectedLocations([]);
      setRecentlySelectedLocation(null);
      setMapZoom(11); // Zoom out for overview
      return;
    }

    // Get previous selection for comparison
    const prevSelectedIds = selectedLocations
      .map((loc) => loc.location?._id)
      .filter(Boolean);

    // Find the selected routes
    const selectedRoutes = values
      .map((value) =>
        locationRoutes.find(
          (r) =>
            r.location &&
            `${r.location.block} (${r.location.district})` === value
        )
      )
      .filter(Boolean);

    // Find which location was just added (if any)
    const newSelectedIds = selectedRoutes
      .map((loc) => loc.location?._id)
      .filter(Boolean);
    const addedIds = newSelectedIds.filter(
      (id) => !prevSelectedIds.includes(id)
    );

    setSelectedLocations(selectedRoutes);

    // If a new location was added, use that as the recently selected location
    if (addedIds.length > 0) {
      const mostRecentlyAdded = selectedRoutes.find(
        (route) => route.location?._id === addedIds[addedIds.length - 1]
      );
      if (mostRecentlyAdded) {
        setRecentlySelectedLocation(mostRecentlyAdded);
        setMapZoom(15);
        return;
      }
    }

    // Otherwise use the last selected location (as before)
    const mostRecentValue = values[values.length - 1];
    const mostRecentRoute = locationRoutes.find(
      (r) =>
        r.location &&
        `${r.location.block} (${r.location.district})` === mostRecentValue
    );

    if (mostRecentRoute) {
      setRecentlySelectedLocation(mostRecentRoute);
      setMapZoom(15);
    }
  };

  // Prepare options for Autocomplete
  const locationOptions = locationRoutes
    .map((r) =>
      r.location ? `${r.location.block} (${r.location.district})` : ""
    )
    .filter(Boolean);

  // Handle open/close of create dialog
  const handleOpenCreateDialog = () => {
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
    if (!selectedLocations || selectedLocations.length !== 1) {
      setSnackbar({
        open: true,
        message: "Please select exactly one location to edit",
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
    if (!selectedLocations || selectedLocations.length === 0) return;

    handleExportClose();

    // Set the export type
    setExportType(type);

    // Create data in the format shown in the image
    const routePoints = selectedLocations
      .map((loc) => loc.location.route || [])
      .flat();

    // Format data to match the table in the image
    const excelData = [];

    // Find survey route for comparison (if it exists)
    const surveyRoute = surveyRoutes.find(
      (route) => route.locationId === selectedLocations[0].location._id
    );
    let physicalTotalLength = 0;

    // Calculate total physical survey length if available
    if (surveyRoute) {
      if (surveyRoute.totalDistance) {
        // Use pre-calculated total distance
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

    // Calculate desktop survey total length
    let desktopTotalLength = 0;
    if (
      selectedLocations.length > 0 &&
      selectedLocations[0].routeInfo &&
      selectedLocations[0].routeInfo.distance
    ) {
      desktopTotalLength = Math.round(selectedLocations[0].routeInfo.distance);
    }

    // Calculate difference between physical and desktop survey
    const lengthDifference = physicalTotalLength - desktopTotalLength;
    const percentDifference =
      desktopTotalLength > 0
        ? ((lengthDifference / desktopTotalLength) * 100).toFixed(2)
        : 0;

    // Add header row with additional columns for comparison
    if (type === "desktop") {
      // For desktop survey export, include comparison with physical survey if available
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

      // Desktop survey export (OFC routes - blue)
      // Add rows for each segment of the route
      if (routePoints.length > 1) {
        for (let i = 0; i < routePoints.length - 1; i++) {
          const fromPoint = routePoints[i];
          const toPoint = routePoints[i + 1];

          // Calculate distance for this segment (in meters)
          let segmentDistance = 0;
          if (
            selectedLocations.length > 0 &&
            selectedLocations[0].directions &&
            selectedLocations[0].directions.routes &&
            selectedLocations[0].directions.routes[0] &&
            selectedLocations[0].directions.routes[0].legs
          ) {
            // Make sure we have a valid index
            const legIndex = Math.min(
              i,
              selectedLocations[0].directions.routes[0].legs.length - 1
            );
            segmentDistance = Math.round(
              selectedLocations[0].directions.routes[0].legs[legIndex].distance
                .value
            );
          }

          // For comparison - try to find equivalent segment in physical survey
          // This is a simplified approach - in real life, segments may not match exactly
          let physicalSegmentDistance = 0;
          if (
            surveyRoute &&
            surveyRoute.directions &&
            surveyRoute.directions.routes &&
            surveyRoute.directions.routes[0] &&
            surveyRoute.directions.routes[0].legs
          ) {
            // Make sure we have a valid index
            const legIndex = Math.min(
              i,
              surveyRoute.directions.routes[0].legs.length - 1
            );
            physicalSegmentDistance = Math.round(
              surveyRoute.directions.routes[0].legs[legIndex].distance.value
            );
          }

          // Calculate segment difference
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

        // Add last row to connect back to start (for complete loop)
        const lastPoint = routePoints[routePoints.length - 1];
        const firstPoint = routePoints[0];

        // Calculate distance for the final segment
        let finalSegmentDistance = 0;
        if (
          selectedLocations[0].directions &&
          selectedLocations[0].directions.routes &&
          selectedLocations[0].directions.routes[0] &&
          selectedLocations[0].directions.routes[0].legs &&
          selectedLocations[0].directions.routes[0].legs[routePoints.length - 1]
        ) {
          finalSegmentDistance = Math.round(
            selectedLocations[0].directions.routes[0].legs[
              routePoints.length - 1
            ].distance.value
          );
        }

        // Final segment for physical survey
        let finalPhysicalSegmentDistance = 0;
        if (
          surveyRoute?.directions?.routes?.[0]?.legs?.[routePoints.length - 1]
        ) {
          finalPhysicalSegmentDistance = Math.round(
            surveyRoute.directions.routes[0].legs[routePoints.length - 1]
              .distance.value
          );
        }

        // Calculate final segment difference
        const finalSegmentDifference =
          finalPhysicalSegmentDistance - finalSegmentDistance;
        const finalSegmentPercentDiff =
          finalSegmentDistance > 0
            ? ((finalSegmentDifference / finalSegmentDistance) * 100).toFixed(2)
            : 0;

        excelData.push([
          routePoints.length, // Sl. No.
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

        // Add summary row with totals and overall difference
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
    } else {
      // For physical survey export, include comparison with desktop survey
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
        "Physical Survey OFC Length (Mtr)",
        "Desktop Survey Length (Mtr)",
        "Difference (Mtr)",
        "Difference (%)",
        "Total Physical Length (Mtr)",
        "Total Desktop Length (Mtr)",
      ]);

      // Original physical survey export code remains largely unchanged
      const locationSurveys = getSurveysForLocation(
        selectedLocations[0].location._id
      );

      if (locationSurveys.length < 2) {
        setSnackbar({
          open: true,
          message: "Not enough survey points to create a route export",
          severity: "warning",
        });
        return;
      }

      // Filter surveys with valid coordinates
      const validSurveys = locationSurveys.filter(
        (s) => s.lat && s.lng && s.lat !== 0 && s.lng !== 0
      );

      // Add rows for each segment of the route
      if (validSurveys.length > 1) {
        for (let i = 0; i < validSurveys.length - 1; i++) {
          const fromSurvey = validSurveys[i];
          const toSurvey = validSurveys[i + 1];

          // Calculate distance for this segment (in meters)
          let segmentDistance = 0;
          if (
            surveyRoute &&
            surveyRoute.directions &&
            surveyRoute.directions.routes &&
            surveyRoute.directions.routes[0] &&
            surveyRoute.directions.routes[0].legs
          ) {
            // Make sure we have a valid index
            const legIndex = Math.min(
              i,
              surveyRoute.directions.routes[0].legs.length - 1
            );
            segmentDistance = Math.round(
              surveyRoute.directions.routes[0].legs[legIndex].distance.value
            );
          }

          // For comparison - try to find equivalent segment in desktop survey
          let desktopSegmentDistance = 0;
          if (
            selectedLocations.length > 0 &&
            selectedLocations[0].directions &&
            selectedLocations[0].directions.routes &&
            selectedLocations[0].directions.routes[0] &&
            selectedLocations[0].directions.routes[0].legs
          ) {
            // Make sure we have a valid index
            const legIndex = Math.min(
              i,
              selectedLocations[0].directions.routes[0].legs.length - 1
            );
            desktopSegmentDistance = Math.round(
              selectedLocations[0].directions.routes[0].legs[legIndex].distance
                .value
            );
          }

          // Calculate segment difference
          const segmentDifference = segmentDistance - desktopSegmentDistance;
          const segmentPercentDiff =
            desktopSegmentDistance > 0
              ? ((segmentDifference / desktopSegmentDistance) * 100).toFixed(2)
              : 0;

          excelData.push([
            i + 1, // Sl. No.
            selectedLocations[0].location.district,
            selectedLocations[0].location.block,
            fromSurvey.name || fromSurvey.title || "Survey Point", // Gram Panchayat
            fromSurvey.name || fromSurvey.title || "Survey Point", // From
            Number(fromSurvey.lat).toFixed(6), // Lat of From
            Number(fromSurvey.lng).toFixed(6), // Long of From
            toSurvey.name || toSurvey.title || "Survey Point", // To
            Number(toSurvey.lat).toFixed(6), // Lat of To
            Number(toSurvey.lng).toFixed(6), // Long of To
            segmentDistance, // Physical Survey OFC Length (Mtr)
            desktopSegmentDistance || "N/A", // Desktop Survey Length
            desktopSegmentDistance ? segmentDifference : "N/A", // Difference
            desktopSegmentDistance ? segmentPercentDiff + "%" : "N/A", // Percent Difference
            physicalTotalLength, // Total Physical Length (Mtr) - same for all rows
            desktopTotalLength || "N/A", // Total Desktop Length (Mtr)
          ]);
        }

        // Add last row to connect back to start (for complete loop)
        const lastSurvey = validSurveys[validSurveys.length - 1];
        const firstSurvey = validSurveys[0];

        // Calculate distance for the final segment
        let finalSegmentDistance = 0;
        if (
          surveyRoute.directions.routes &&
          surveyRoute.directions.routes[0] &&
          surveyRoute.directions.routes[0].legs &&
          surveyRoute.directions.routes[0].legs[validSurveys.length - 1]
        ) {
          finalSegmentDistance = Math.round(
            surveyRoute.directions.routes[0].legs[validSurveys.length - 1]
              .distance.value
          );
        }

        // Final segment for desktop survey
        let finalDesktopSegmentDistance = 0;
        if (
          selectedLocations[0].directions?.routes?.[0]?.legs?.[
            validSurveys.length - 1
          ]
        ) {
          finalDesktopSegmentDistance = Math.round(
            selectedLocations[0].directions.routes[0].legs[
              validSurveys.length - 1
            ].distance.value
          );
        }

        // Calculate final segment difference
        const finalSegmentDifference =
          finalSegmentDistance - finalDesktopSegmentDistance;
        const finalSegmentPercentDiff =
          finalDesktopSegmentDistance > 0
            ? (
                (finalSegmentDifference / finalDesktopSegmentDistance) *
                100
              ).toFixed(2)
            : 0;

        excelData.push([
          validSurveys.length, // Sl. No.
          selectedLocations[0].location.district,
          selectedLocations[0].location.block,
          lastSurvey.name || lastSurvey.title || "Survey Point", // Gram Panchayat
          lastSurvey.name || lastSurvey.title || "Survey Point", // From
          Number(lastSurvey.lat).toFixed(6), // Lat of From
          Number(lastSurvey.lng).toFixed(6), // Long of From
          firstSurvey.name || firstSurvey.title || "Survey Point", // To
          Number(firstSurvey.lat).toFixed(6), // Lat of To
          Number(firstSurvey.lng).toFixed(6), // Long of To
          finalSegmentDistance, // Physical Survey OFC Length (Mtr)
          finalDesktopSegmentDistance || "N/A", // Desktop Survey Length
          finalDesktopSegmentDistance ? finalSegmentDifference : "N/A", // Difference
          finalDesktopSegmentDistance ? finalSegmentPercentDiff + "%" : "N/A", // Percent Difference
          physicalTotalLength, // Total Physical Length (Mtr) - same for all rows
          desktopTotalLength || "N/A", // Total Desktop Length (Mtr)
        ]);

        // Add summary row with totals and overall difference
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
          physicalTotalLength, // Physical Survey OFC Length (Mtr)
          desktopTotalLength || "N/A", // Desktop Survey Length (Mtr)
          lengthDifference || "N/A", // Difference (Mtr)
          percentDifference + "%" || "N/A", // Difference (%)
          "", // Total Physical Length
          "", // Total Desktop Length
        ]);
      }
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      type === "desktop" ? "OFC Route Comparison" : "Survey Route Comparison"
    );

    // Generate filename from location info
    const fileName = `${selectedLocations[0].location.block}_${
      selectedLocations[0].location.district
    }_${type === "desktop" ? "OFC" : "Survey"}_Route_Comparison.xlsx`;

    // Write and download the file
    XLSX.writeFile(wb, fileName);

    // Show success message
    setSnackbar({
      open: true,
      message: `Excel file exported successfully!`,
      severity: "success",
    });
  };

  const handlePhysicalSurveyExport = () => {
    physicalSurveyExport(surveys);
  };

  // Export to KML
  const handleExportToKML = (type = "desktop") => {
    exportToKML(
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

  // Handle route visibility toggle
  const handleRouteVisibilityChange = (type) => {
    setRouteVisibility((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
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
            sx={{
              borderRadius: "8px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 6px rgba(37, 99, 235, 0.2)",
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
              multiple // Enable multiple selection
              options={locationOptions}
              value={selectedLocations.map(
                (loc) => `${loc.location.block} (${loc.location.district})`
              )}
              onChange={handleLocationSelect}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Locations"
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
                disabled={selectedLocations.length !== 1}
                sx={{ borderRadius: "8px", fontWeight: 500, flex: 1 }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportClick}
                disabled={selectedLocations.length !== 1}
                sx={{ borderRadius: "8px", fontWeight: 500, flex: 1 }}
              >
                Export
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
            {/* Legend */}
            <Box
              sx={{
                display: "flex",
                gap: 3,
                mb: 3,
                flexWrap: "wrap",
                p: 2,
                bgcolor: "rgba(0,0,0,0.02)",
                borderRadius: "8px",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    width: 20,
                    height: 4,
                    bgcolor: routeColor,
                    borderRadius: 1,
                    mr: 1,
                    opacity: routeVisibility.desktopSurvey ? 1 : 0.3,
                  }}
                />
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{ opacity: routeVisibility.desktopSurvey ? 1 : 0.5 }}
                >
                  Desktop Survey Routes
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    width: 20,
                    height: 4,
                    bgcolor: surveyRouteColor,
                    borderRadius: 1,
                    mr: 1,
                    opacity: routeVisibility.physicalSurvey ? 1 : 0.3,
                  }}
                />
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{ opacity: routeVisibility.physicalSurvey ? 1 : 0.5 }}
                >
                  Survey Routes (Status 5)
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    bgcolor: "#3498db",
                    borderRadius: "50%",
                    mr: 1,
                    border: "2px solid #000",
                  }}
                />
                <Typography variant="body2" fontWeight={500}>
                  Block Surveys (
                  {surveys.filter((s) => s.surveyType === "block").length})
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    bgcolor: "#e74c3c",
                    borderRadius: "50%",
                    mr: 1,
                    border: "2px solid #000",
                  }}
                />
                <Typography variant="body2" fontWeight={500}>
                  GP Surveys (
                  {surveys.filter((s) => s.surveyType === "gp").length})
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    bgcolor: "#27ae60",
                    borderRadius: "50%",
                    mr: 1,
                    border: "2px solid #000",
                  }}
                />
                <Typography variant="body2" fontWeight={500}>
                  OFC Surveys (
                  {surveys.filter((s) => s.surveyType === "ofc").length})
                </Typography>
              </Box>
            </Box>

            {/* Info cards for selected locations */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {selectedLocations.length > 0
                ? selectedLocations.map((location, index) => (
                    <Grid item xs={12} md={6} lg={4} key={index}>
                      <Card
                        sx={{
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          borderRadius: "12px",
                          overflow: "hidden",
                          border: `1px solid ${routeColor}20`,
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              mb: 2,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: "bold", color: routeColor }}
                            >
                              {location.location?.block} (
                              {location.location?.district})
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 2,
                              p: 1.5,
                              bgcolor: "rgba(0,0,0,0.03)",
                              borderRadius: "8px",
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ mr: 1 }}>
                              Status:{" "}
                              {STATUS_MAPPING[location.location?.status] ||
                                "Unknown"}
                            </Typography>
                            {location.location?.status === 5 && (
                              <Chip
                                label="Survey Route Enabled"
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 500 }}
                              />
                            )}
                          </Box>
                          {location.error && (
                            <Alert
                              severity="warning"
                              sx={{ my: 2, borderRadius: "8px" }}
                            >
                              {location.error}
                            </Alert>
                          )}
                          {location.routeInfo && (
                            <>
                              <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid item xs={6}>
                                  <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                  >
                                    Desktop Survey Distance:
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    color="primary"
                                    sx={{
                                      fontWeight: "bold",
                                      fontSize: "1.2rem",
                                    }}
                                  >
                                    {formatDistance(
                                      location.routeInfo.distance
                                    )}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                  >
                                    Est. Survey Time:
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    color="primary"
                                    sx={{
                                      fontWeight: "bold",
                                      fontSize: "1.2rem",
                                    }}
                                  >
                                    {formatTime(location.routeInfo.time)}
                                  </Typography>
                                </Grid>
                              </Grid>

                              {/* Add Physical Survey Distance and Difference */}
                              {location.location &&
                                location.location.status === 5 &&
                                (() => {
                                  // Find survey route for this location
                                  const surveyRoute = surveyRoutes.find(
                                    (route) =>
                                      route.locationId === location.location._id
                                  );

                                  if (surveyRoute) {
                                    // Get physical survey distance from the pre-calculated totalDistance when available
                                    let physicalDistance = 0;

                                    if (surveyRoute.totalDistance) {
                                      // Use the pre-calculated totalDistance
                                      physicalDistance =
                                        surveyRoute.totalDistance;
                                    } else if (
                                      surveyRoute.directions &&
                                      surveyRoute.directions.routes &&
                                      surveyRoute.directions.routes[0] &&
                                      surveyRoute.directions.routes[0].legs
                                    ) {
                                      // Fallback to calculating again if needed
                                      surveyRoute.directions.routes[0].legs.forEach(
                                        (leg) => {
                                          physicalDistance +=
                                            leg.distance.value;
                                        }
                                      );
                                    }

                                    // Only proceed if we have a valid physical distance
                                    if (physicalDistance > 0) {
                                      // Calculate difference
                                      const difference =
                                        physicalDistance -
                                        location.routeInfo.distance;
                                      const percentDiff = (
                                        (difference /
                                          location.routeInfo.distance) *
                                        100
                                      ).toFixed(1);

                                      return (
                                        <Grid
                                          container
                                          spacing={2}
                                          sx={{
                                            mb: 2,
                                            mt: 0.5,
                                            pt: 2,
                                            borderTop:
                                              "1px dashed rgba(0,0,0,0.1)",
                                          }}
                                        >
                                          <Grid item xs={6}>
                                            <Typography
                                              variant="subtitle2"
                                              color="text.secondary"
                                            >
                                              Physical Survey Distance:
                                            </Typography>
                                            <Typography
                                              variant="body1"
                                              color="warning.dark"
                                              sx={{
                                                fontWeight: "bold",
                                                fontSize: "1.2rem",
                                              }}
                                            >
                                              {formatDistance(physicalDistance)}
                                            </Typography>
                                          </Grid>
                                          <Grid item xs={6}>
                                            <Typography
                                              variant="subtitle2"
                                              color="text.secondary"
                                            >
                                              Difference:
                                            </Typography>
                                            <Typography
                                              variant="body1"
                                              color={
                                                difference > 0
                                                  ? "error.main"
                                                  : "success.main"
                                              }
                                              sx={{
                                                fontWeight: "bold",
                                                fontSize: "1.2rem",
                                              }}
                                            >
                                              {formatDistance(
                                                Math.abs(difference)
                                              )}{" "}
                                              ({difference > 0 ? "+" : "-"}
                                              {Math.abs(percentDiff)}%)
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              {difference > 0
                                                ? "Physical survey is longer"
                                                : "Physical survey is shorter"}
                                            </Typography>
                                          </Grid>
                                        </Grid>
                                      );
                                    }
                                  }
                                  return null;
                                })()}

                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ mt: 1 }}
                              >
                                Survey Points:{" "}
                                {
                                  getSurveysForLocation(location.location?._id)
                                    .length
                                }
                                <Chip
                                  label="View Location Details"
                                  color="secondary"
                                  size="small"
                                  sx={{
                                    fontWeight: 500,
                                    ml: 1,
                                    cursor: "pointer",
                                    background:
                                      "linear-gradient(45deg, #667eea 30%, #764ba2 90%)",
                                    color: "white",
                                    "&:hover": {
                                      background:
                                        "linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)",
                                      transform: "translateY(-1px)",
                                      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                                    },
                                    transition: "all 0.2s ease",
                                  }}
                                  onClick={() =>
                                    handleLocationMarkerClick(
                                      location.location?._id
                                    )
                                  }
                                />
                                <Chip
                                  label="Hoto Information"
                                  color="primary"
                                  size="small"
                                  sx={{
                                    fontWeight: 500,
                                    ml: 1,
                                    cursor: "pointer",
                                  }}
                                  onClick={() =>
                                    navigate(
                                      `/hoto-details/${location.location?._id}`
                                    )
                                  }
                                />
                              </Typography>
                              <Box
                                sx={{
                                  mt: 2,
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                <Chip
                                  label="Optimized OFC Route"
                                  color="success"
                                  size="small"
                                  sx={{ fontWeight: 500 }}
                                />
                                <Chip
                                  label="Complete Loop"
                                  color="primary"
                                  size="small"
                                  sx={{ fontWeight: 500 }}
                                />
                                <Chip
                                  label={`${location.routeInfo.legs} Segments`}
                                  color="info"
                                  size="small"
                                  sx={{ fontWeight: 500 }}
                                />
                              </Box>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                : (() => {
                    // Calculate total distance and time for all locations
                    const total = locationRoutes.reduce(
                      (acc, route) => {
                        if (route.routeInfo) {
                          acc.distance += route.routeInfo.distance || 0;
                          acc.time += route.routeInfo.time || 0;
                        }
                        return acc;
                      },
                      { distance: 0, time: 0 }
                    );
                    return (
                      <Grid item xs={12} md={6} lg={4}>
                        <Card
                          sx={{
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            borderRadius: "12px",
                            overflow: "hidden",
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: "bold",
                                color: "primary.main",
                                mb: 2,
                              }}
                            >
                              Total for All Locations
                            </Typography>
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                              <Grid item xs={6}>
                                <Typography
                                  variant="subtitle2"
                                  color="text.secondary"
                                >
                                  Total Desktop Distance:
                                </Typography>
                                <Typography
                                  variant="body1"
                                  color="primary"
                                  sx={{
                                    fontWeight: "bold",
                                    fontSize: "1.2rem",
                                  }}
                                >
                                  {formatDistance(total.distance)}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography
                                  variant="subtitle2"
                                  color="text.secondary"
                                >
                                  Est. Travel Time:
                                </Typography>
                                <Typography
                                  variant="body1"
                                  color="primary"
                                  sx={{
                                    fontWeight: "bold",
                                    fontSize: "1.2rem",
                                  }}
                                >
                                  {formatTime(total.time)}
                                </Typography>
                              </Grid>
                            </Grid>

                            {/* Calculate total physical survey distance */}
                            {(() => {
                              // Calculate total physical distance across all survey routes
                              let totalPhysicalDistance = 0;
                              let validSurveyRoutes = 0;

                              surveyRoutes.forEach((route) => {
                                // Use pre-calculated totalDistance when available
                                if (route.totalDistance) {
                                  totalPhysicalDistance += route.totalDistance;
                                  validSurveyRoutes++;
                                } else if (
                                  route.directions &&
                                  route.directions.routes &&
                                  route.directions.routes[0] &&
                                  route.directions.routes[0].legs
                                ) {
                                  let routeDistance = 0;
                                  route.directions.routes[0].legs.forEach(
                                    (leg) => {
                                      routeDistance += leg.distance.value;
                                    }
                                  );
                                  totalPhysicalDistance += routeDistance;
                                  validSurveyRoutes++;
                                }
                              });

                              if (validSurveyRoutes > 0) {
                                // Calculate overall difference
                                const physicalSurveyTotal =
                                  surveyRoutes.length > 0 ? (
                                    <Grid
                                      container
                                      spacing={2}
                                      sx={{
                                        mb: 2,
                                        mt: 1,
                                        pt: 2,
                                        borderTop: "1px dashed rgba(0,0,0,0.1)",
                                      }}
                                    >
                                      <Grid item xs={6}>
                                        <Typography
                                          variant="subtitle2"
                                          color="text.secondary"
                                        >
                                          Total Physical Distance:
                                        </Typography>
                                        <Typography
                                          variant="body1"
                                          color="warning.dark"
                                          sx={{
                                            fontWeight: "bold",
                                            fontSize: "1.2rem",
                                          }}
                                        >
                                          {formatDistance(
                                            totalPhysicalDistance
                                          )}
                                        </Typography>
                                      </Grid>
                                      <Grid item xs={6}>
                                        <Typography
                                          variant="subtitle2"
                                          color="text.secondary"
                                        >
                                          Avg. Difference:
                                        </Typography>
                                        {(() => {
                                          // Only calculate if we have desktop distance
                                          if (total.distance > 0) {
                                            const difference =
                                              totalPhysicalDistance -
                                              total.distance;
                                            const percentDiff = (
                                              (difference / total.distance) *
                                              100
                                            ).toFixed(1);

                                            return (
                                              <>
                                                <Typography
                                                  variant="body1"
                                                  color={
                                                    difference > 0
                                                      ? "error.main"
                                                      : "success.main"
                                                  }
                                                  sx={{
                                                    fontWeight: "bold",
                                                    fontSize: "1.2rem",
                                                  }}
                                                >
                                                  {difference > 0 ? "+" : "-"}
                                                  {Math.abs(percentDiff)}%
                                                </Typography>
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                >
                                                  {difference > 0
                                                    ? "Physical surveys are longer on average"
                                                    : "Physical surveys are shorter on average"}
                                                </Typography>
                                              </>
                                            );
                                          }
                                          return (
                                            <Typography variant="body2">
                                              Not available
                                            </Typography>
                                          );
                                        })()}
                                      </Grid>
                                    </Grid>
                                  ) : null;

                                return physicalSurveyTotal;
                              }

                              return null;
                            })()}

                            <Box
                              sx={{
                                mt: 2,
                                p: 1.5,
                                bgcolor: "rgba(0,0,0,0.03)",
                                borderRadius: "8px",
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                              >
                                Total Survey Points:{" "}
                                <strong>{surveys.length}</strong>
                              </Typography>
                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                              >
                                Locations with Survey Routes:{" "}
                                <strong>{surveyRoutes.length}</strong>
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })()}
            </Grid>

            {/* Single map for all locations */}
            <Box>
              {/* Route Visibility Controls */}
              <Box
                sx={{
                  display: "flex",
                  mb: 2,
                  p: 2,
                  bgcolor: "rgba(0,0,0,0.03)",
                  borderRadius: "8px 8px 0 0",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderBottom: "none",
                }}
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  Route Visibility:
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Chip
                    label="Desktop Survey (Blue)"
                    color={
                      routeVisibility.desktopSurvey ? "primary" : "default"
                    }
                    onClick={() => handleRouteVisibilityChange("desktopSurvey")}
                    variant={
                      routeVisibility.desktopSurvey ? "filled" : "outlined"
                    }
                    sx={{ fontWeight: 500, cursor: "pointer" }}
                  />
                  <Chip
                    label="Physical Survey (Yellow)"
                    color={
                      routeVisibility.physicalSurvey ? "warning" : "default"
                    }
                    onClick={() =>
                      handleRouteVisibilityChange("physicalSurvey")
                    }
                    variant={
                      routeVisibility.physicalSurvey ? "filled" : "outlined"
                    }
                    sx={{ fontWeight: 500, cursor: "pointer" }}
                  />
                </Box>
                <Box
                  sx={{
                    ml: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontStyle: "italic" }}
                  >
                    💡 Click on blue numbered markers or "View Location Details"
                    buttons to explore location information
                  </Typography>
                </Box>
              </Box>
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={mapZoom}
                onLoad={onMapLoad}
              >
                {/* Render markers and routes for selected locations only */}
                {(selectedLocations.length > 0
                  ? selectedLocations
                  : locationRoutes
                ).map((route, idx) => {
                  const isSelected = selectedLocations.some(
                    (selected) =>
                      selected.location &&
                      route.location &&
                      selected.location.block === route.location.block &&
                      selected.location.district === route.location.district
                  );

                  // Only render if no locations are selected or if this route is selected
                  if (selectedLocations.length === 0 || isSelected) {
                    return (
                      <React.Fragment key={`routefrag-${idx}`}>
                        {route.points.map((point, pidx) => {
                          // Determine if this point corresponds to a BHQ type
                          const routePoint = route.location?.route[pidx];
                          const isBHQ = routePoint && routePoint.type === "BHQ";

                          return (
                            <Marker
                              key={`marker-${idx}-${pidx}`}
                              position={point}
                              label={`${pidx + 1}`}
                              onClick={() =>
                                handleLocationMarkerClick(route.location._id)
                              }
                              icon={{
                                path:
                                  window.google && window.google.maps
                                    ? window.google.maps.SymbolPath.CIRCLE
                                    : undefined,
                                scale: isSelected ? 11 : 7,
                                fillColor: isBHQ ? "#f44336" : routeColor, // Red color for BHQ points
                                fillOpacity: 1,
                                strokeColor: isSelected ? "#000" : "#fff",
                                strokeWeight: isSelected ? 4 : 2,
                              }}
                            />
                          );
                        })}
                        {/* Render chunked routes if they exist */}
                        {route.isChunked &&
                          route.chunks &&
                          routeVisibility.desktopSurvey &&
                          route.chunks.map((chunk, chunkIdx) => (
                            <DirectionsRenderer
                              key={`chunk-${idx}-${chunkIdx}`}
                              directions={chunk}
                              options={{
                                suppressMarkers: true,
                                polylineOptions: {
                                  strokeColor: routeColor,
                                  strokeWeight: isSelected ? 10 : 6,
                                  strokeOpacity: isSelected ? 1 : 0.9,
                                },
                              }}
                            />
                          ))}
                        {/* Render single route if not chunked */}
                        {!route.isChunked &&
                          route.directions &&
                          routeVisibility.desktopSurvey && (
                            <DirectionsRenderer
                              directions={route.directions}
                              options={{
                                suppressMarkers: true,
                                polylineOptions: {
                                  strokeColor: routeColor,
                                  strokeWeight: isSelected ? 10 : 6,
                                  strokeOpacity: isSelected ? 1 : 0.9,
                                },
                              }}
                            />
                          )}

                        {/* Render survey points for this location */}
                        {route.location &&
                          getSurveysForLocation(route.location._id).map(
                            (survey, sidx) => (
                              <Marker
                                key={`survey-${idx}-${sidx}`}
                                position={{
                                  lat:
                                    survey.lat ||
                                    parseFloat(survey.latitude) ||
                                    0,
                                  lng:
                                    survey.lng ||
                                    parseFloat(survey.longitude) ||
                                    0,
                                }}
                                title={
                                  survey.name || survey.title || "Survey Point"
                                }
                                onClick={() =>
                                  handleSurveyMarkerClick(survey._id)
                                }
                                icon={{
                                  path:
                                    window.google && window.google.maps
                                      ? window.google.maps.SymbolPath.CIRCLE
                                      : undefined,
                                  scale: 8,
                                  fillColor: "#FFD700", // Yellow color for survey points
                                  fillOpacity: 1,
                                  strokeColor: "#000",
                                  strokeWeight: 2,
                                }}
                              />
                            )
                          )}
                      </React.Fragment>
                    );
                  }
                  return null;
                })}

                {/* Render all survey points as individual markers */}
                {surveys.map((survey, surveyIdx) => {
                  // Skip surveys without valid coordinates
                  if (
                    !survey.lat ||
                    !survey.lng ||
                    survey.lat === 0 ||
                    survey.lng === 0
                  ) {
                    return null;
                  }

                  return (
                    <Marker
                      key={`all-survey-${surveyIdx}`}
                      position={{
                        lat: survey.lat,
                        lng: survey.lng,
                      }}
                      title={survey.name || survey.title || "Survey Point"}
                      onClick={() => handleSurveyMarkerClick(survey._id)}
                      icon={{
                        path:
                          window.google && window.google.maps
                            ? window.google.maps.SymbolPath.CIRCLE
                            : undefined,
                        scale: 10,
                        fillColor:
                          survey.surveyType === "block"
                            ? "#3498db"
                            : survey.surveyType === "gp"
                            ? "#e74c3c"
                            : survey.surveyType === "ofc"
                            ? "#27ae60"
                            : "#FFD700",
                        fillOpacity: 1,
                        strokeColor: "#000",
                        strokeWeight: 2,
                      }}
                    />
                  );
                })}

                {/* Render survey routes for locations with status 5 */}
                {routeVisibility.physicalSurvey &&
                  surveyRoutes.map((route, idx) => {
                    if (!route.directions) return null;
                    const locationData = locations.find(
                      (loc) => loc._id === route.locationId
                    );

                    // Only show survey routes for selected locations
                    const isSelected =
                      selectedLocations.length === 0 ||
                      selectedLocations.some(
                        (selected) =>
                          selected.location._id === locationData?._id
                      );

                    if (!isSelected) return null;

                    return (
                      <React.Fragment key={`survey-route-frag-${idx}`}>
                        {/* Render chunked survey routes if they exist */}
                        {route.isChunked && route.chunks ? (
                          route.chunks.map((chunk, chunkIdx) => (
                            <DirectionsRenderer
                              key={`survey-chunk-${idx}-${chunkIdx}`}
                              directions={chunk}
                              options={{
                                suppressMarkers: true,
                                polylineOptions: {
                                  strokeColor: surveyRouteColor,
                                  strokeWeight: isSelected ? 6 : 4,
                                  strokeOpacity: 0.8,
                                  strokeDasharray: "5,5", // Create a dashed line
                                },
                              }}
                            />
                          ))
                        ) : (
                          <DirectionsRenderer
                            key={`survey-route-${idx}`}
                            directions={route.directions}
                            options={{
                              suppressMarkers: true,
                              polylineOptions: {
                                strokeColor: surveyRouteColor,
                                strokeWeight: isSelected ? 6 : 4,
                                strokeOpacity: 0.8,
                                strokeDasharray: "5,5", // Create a dashed line
                              },
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
              </GoogleMap>
            </Box>
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
    </Container>
  );
};

export default MapViewPage;
