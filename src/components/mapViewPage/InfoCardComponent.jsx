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
      {/* Always show Total for All Locations card */}
      <Grid item xs={12} md={selectedLocations.length > 0 ? 12 : 24}>
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
                <Typography variant="subtitle2" color="text.secondary">
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
                  {formatDistance(
                    locationRoutes.reduce((acc, route) => {
                      if (route.routeInfo) {
                        acc += route.routeInfo.distance || 0;
                      }
                      return acc;
                    }, 0)
                  )}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
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
                  {formatTime(
                    locationRoutes.reduce((acc, route) => {
                      if (route.routeInfo) {
                        acc += route.routeInfo.time || 0;
                      }
                      return acc;
                    }, 0)
                  )}
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
                  route.directions.routes[0].legs.forEach((leg) => {
                    routeDistance += leg.distance.value;
                  });
                  totalPhysicalDistance += routeDistance;
                  validSurveyRoutes++;
                }
              });

              const totalDesktopDistance = locationRoutes.reduce(
                (acc, route) => {
                  if (route.routeInfo) {
                    acc += route.routeInfo.distance || 0;
                  }
                  return acc;
                },
                0
              );

              if (validSurveyRoutes > 0) {
                // Calculate overall difference
                return (
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
                      <Typography variant="subtitle2" color="text.secondary">
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
                        {formatDistance(totalPhysicalDistance)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Avg. Difference:
                      </Typography>
                      {(() => {
                        // Only calculate if we have desktop distance
                        if (totalDesktopDistance > 0) {
                          const difference =
                            totalPhysicalDistance - totalDesktopDistance;
                          const percentDiff = (
                            (difference / totalDesktopDistance) *
                            100
                          ).toFixed(1);

                          return (
                            <>
                              <Typography
                                variant="body1"
                                color={
                                  difference > 0 ? "error.main" : "success.main"
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
                          <Typography variant="body2">Not available</Typography>
                        );
                      })()}
                    </Grid>
                  </Grid>
                );
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
              <Typography variant="subtitle2" color="text.secondary">
                Total Survey Points: <strong>{surveys.length}</strong>
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Locations with Survey Routes:{" "}
                <strong>{surveyRoutes.length}</strong>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Show selected location card if a location is selected */}
      {selectedLocations.length > 0 &&
        selectedLocations.map((location, index) => (
          <Grid item xs={12} md={6} key={index}>
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
                    {STATUS_MAPPING[location.location?.status] || "Unknown"}
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
                  <Alert severity="warning" sx={{ my: 2, borderRadius: "8px" }}>
                    {location.error}
                  </Alert>
                )}
                {location.routeInfo && (
                  <>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
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
                          {formatDistance(location.routeInfo.distance)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
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
                          (route) => route.locationId === location.location._id
                        );

                        if (surveyRoute) {
                          // Get physical survey distance from the pre-calculated totalDistance when available
                          let physicalDistance = 0;

                          if (surveyRoute.totalDistance) {
                            // Use the pre-calculated totalDistance
                            physicalDistance = surveyRoute.totalDistance;
                          } else if (
                            surveyRoute.directions &&
                            surveyRoute.directions.routes &&
                            surveyRoute.directions.routes[0] &&
                            surveyRoute.directions.routes[0].legs
                          ) {
                            // Fallback to calculating again if needed
                            surveyRoute.directions.routes[0].legs.forEach(
                              (leg) => {
                                physicalDistance += leg.distance.value;
                              }
                            );
                          }

                          // Only proceed if we have a valid physical distance
                          if (physicalDistance > 0) {
                            // Calculate difference
                            const difference =
                              physicalDistance - location.routeInfo.distance;
                            const percentDiff = (
                              (difference / location.routeInfo.distance) *
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
                                  borderTop: "1px dashed rgba(0,0,0,0.1)",
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
                                    {formatDistance(Math.abs(difference))} (
                                    {difference > 0 ? "+" : "-"}
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
                      {getSurveysForLocation(location.location?._id).length}
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
                          handleLocationMarkerClick(location.location?._id)
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
                          navigate(`/hoto-details/${location.location?._id}`)
                        }
                      />
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
    </Grid>
  );
};

export default InfoCardComponent;
