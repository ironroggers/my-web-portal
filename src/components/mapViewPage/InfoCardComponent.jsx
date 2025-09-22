import {
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Alert,
  Box,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const InfoCardComponent = ({
  selectedLocations,
  locationRoutes,
  surveyRoutes,
  surveys,
  getSurveysForLocation,
  handleLocationMarkerClick,
  STATUS_MAPPING,
  distance,
}) => {
  const routeColor = "#2563eb"; // Brighter blue

  const navigate = useNavigate();
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

  return (
    <Grid container spacing={3} sx={{ mb: 5 }}>
      {/* Show selected location card if a location is selected */}
      {selectedLocations.length > 0 &&
        selectedLocations.map((location, index) => (
          <Grid item xs={12} md={12} key={index}>
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
                    {location.location?.block} ({location.location?.district})
                  </Typography>
                  <Chip
                    label={
                      STATUS_MAPPING[location.location?.status] || "Unknown"
                    }
                    color={
                      location.location?.status === 5 ? "success" : "default"
                    }
                    sx={{ fontWeight: 500 }}
                  />
                </Box>

                {location.error && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {location.error}
                  </Alert>
                )}

                {/* Simplified Overview */}
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{ mb: 2, fontWeight: "bold", color: "primary.main" }}
                  >
                    📍 Location Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "rgba(37, 99, 235, 0.05)",
                          borderRadius: "8px",
                          border: "1px solid rgba(37, 99, 235, 0.2)",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          color="primary.main"
                          sx={{ fontWeight: "bold" }}
                        >
                          Desktop Distance
                        </Typography>
                        <Typography
                          variant="h4"
                          color="primary.main"
                          sx={{ fontWeight: "bold", mt: 1 }}
                        >
                          {(distance / 1000).toFixed(2)} km
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Optimized route
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={4}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "rgba(245, 158, 11, 0.05)",
                          borderRadius: "8px",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          color="warning.main"
                          sx={{ fontWeight: "bold" }}
                        >
                          Route Points
                        </Typography>
                        <Typography
                          variant="h4"
                          color="warning.main"
                          sx={{ fontWeight: "bold", mt: 1 }}
                        >
                          {location.points?.length || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Survey waypoints
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={4}>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "rgba(34, 197, 94, 0.05)",
                          borderRadius: "8px",
                          border: "1px solid rgba(34, 197, 94, 0.2)",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          color="success.main"
                          sx={{ fontWeight: "bold" }}
                        >
                          Physical Surveys
                        </Typography>
                        <Typography
                          variant="h4"
                          color="success.main"
                          sx={{ fontWeight: "bold", mt: 1 }}
                        >
                          {getSurveysForLocation(location.location?._id).length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Completed surveys
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Distance Comparison (only if both desktop and physical data available) */}
                {location.routeInfo &&
                  location.location &&
                  (() => {
                    const locationSurveyRoutes = surveyRoutes.filter(
                      (sr) => sr.locationId === location.location._id
                    );
                    const physicalDistance = locationSurveyRoutes.reduce(
                      (total, sr) => total + (sr.routeInfo?.distance || 0),
                      0
                    );

                    if (physicalDistance > 0) {
                      const difference = Math.abs(
                        location.routeInfo.distance - physicalDistance
                      );
                      const percentDiff = (
                        (difference /
                          Math.max(
                            location.routeInfo.distance,
                            physicalDistance
                          )) *
                        100
                      ).toFixed(1);

                      return (
                        <Box sx={{ mb: 3 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              mb: 2,
                              fontWeight: "bold",
                              color: "primary.main",
                            }}
                          >
                            📊 Distance Comparison
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={4}>
                              <Box
                                sx={{
                                  p: 2,
                                  bgcolor: "rgba(37, 99, 235, 0.05)",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(37, 99, 235, 0.2)",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  color="primary.main"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  Desktop Survey
                                </Typography>
                                <Typography
                                  variant="h4"
                                  color="primary.main"
                                  sx={{ fontWeight: "bold", mt: 1 }}
                                >
                                  {formatDistance(location.routeInfo.distance)}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Est. time:{" "}
                                  {formatTime(location.routeInfo.time)}
                                </Typography>
                              </Box>
                            </Grid>

                            <Grid item xs={4}>
                              <Box
                                sx={{
                                  p: 2,
                                  bgcolor: "rgba(245, 158, 11, 0.05)",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(245, 158, 11, 0.2)",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  color="warning.main"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  Physical Survey
                                </Typography>
                                <Typography
                                  variant="h4"
                                  color="warning.main"
                                  sx={{ fontWeight: "bold", mt: 1 }}
                                >
                                  {formatDistance(physicalDistance)}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  From field data
                                </Typography>
                              </Box>
                            </Grid>

                            <Grid item xs={4}>
                              <Box
                                sx={{
                                  p: 2,
                                  bgcolor: "rgba(239, 68, 68, 0.05)",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(239, 68, 68, 0.2)",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  color="error.main"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  Difference
                                </Typography>
                                <Typography
                                  variant="h4"
                                  color="error.main"
                                  sx={{ fontWeight: "bold", mt: 1 }}
                                >
                                  {percentDiff}%
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {formatDistance(difference)}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      );
                    }
                    return null;
                  })()}

                {/* Action Buttons */}
                {location.location && (
                  <Box
                    sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}
                  >
                    <Chip
                      label="View Location Details"
                      color="secondary"
                      sx={{
                        fontWeight: 500,
                        cursor: "pointer",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                        },
                        transition: "all 0.2s ease",
                      }}
                      onClick={() =>
                        handleLocationMarkerClick(location.location?._id)
                      }
                    />
                    <Chip
                      label="Hoto Information"
                      color="primary"
                      sx={{
                        fontWeight: 500,
                        cursor: "pointer",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                        },
                        transition: "all 0.2s ease",
                      }}
                      onClick={() =>
                        navigate(`/hoto-details/${location.location?._id}`)
                      }
                    />
                    <Chip
                      label="View Sections"
                      color="default"
                      sx={{
                        fontWeight: 500,
                        cursor: "pointer",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                        },
                        transition: "all 0.2s ease",
                      }}
                      onClick={() =>
                        navigate(`/location/${location.location?._id}/sections`)
                      }
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
    </Grid>
  );
};

export default InfoCardComponent;
