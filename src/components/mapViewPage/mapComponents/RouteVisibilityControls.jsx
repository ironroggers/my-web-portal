import { Box, Chip, Typography } from "@mui/material";

const RouteVisibilityControls = ({ routeVisibility, setRouteVisibility }) => {
  const handleRouteVisibilityChange = (type) => {
    setRouteVisibility((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  return (
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
          color={routeVisibility.desktopSurvey ? "primary" : "default"}
          onClick={() => handleRouteVisibilityChange("desktopSurvey")}
          variant={routeVisibility.desktopSurvey ? "filled" : "outlined"}
          sx={{ fontWeight: 500, cursor: "pointer" }}
        />
        <Chip
          label="Physical Survey (Yellow)"
          color={routeVisibility.physicalSurvey ? "warning" : "default"}
          onClick={() => handleRouteVisibilityChange("physicalSurvey")}
          variant={routeVisibility.physicalSurvey ? "filled" : "outlined"}
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
          💡 Click on blue numbered markers or "View Location Details" buttons
          to explore location information.
          <br />
          🗺️ Select exactly one location and click anywhere on the map to add
          temporary route points.
        </Typography>
      </Box>
    </Box>
  );
};

export default RouteVisibilityControls;
