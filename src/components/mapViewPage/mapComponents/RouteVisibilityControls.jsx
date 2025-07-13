import { Box, Chip, Typography } from "@mui/material";

const RouteVisibilityControls = ({ routeVisibility, setRouteVisibility }) => {
  const handleRouteVisibilityChange = (type) => {
    setRouteVisibility((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const chipsOptions = [
    {
      label: "Desktop Survey (Blue)",
      type: "desktopSurvey",
      color: "primary",
      onClick: () => handleRouteVisibilityChange("desktopSurvey"),
    },
    {
      label: "Physical Survey (Yellow)",
      type: "physicalSurvey",
      color: "warning",
      onClick: () => handleRouteVisibilityChange("physicalSurvey"),
    },
    {
      label: "KMLs (Green)",
      type: "addKML",
      color: "success",
      colorConstant: "success",
      onClick: () => handleRouteVisibilityChange("addKML"),
    },
  ];

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
        {chipsOptions.map((chip) => (
          <Chip
            key={chip.label}
            label={chip.label}
            color={
              chip.colorConstant
                ? chip.colorConstant
                : routeVisibility[chip.type]
                ? chip.color
                : "default"
            }
            onClick={chip.onClick}
            variant={routeVisibility[chip.type] ? "filled" : "outlined"}
            sx={{ fontWeight: 500, cursor: "pointer" }}
          />
        ))}
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
