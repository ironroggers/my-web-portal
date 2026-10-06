import { Box, Button, Checkbox, FormControlLabel, Tooltip, Typography } from "@mui/material";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const ROUTE_TOGGLES = [
  { type: "desktopSurvey", label: "Desktop survey routes", color: "#2563eb" },
  { type: "physicalSurvey", label: "Physical survey routes", color: "#f59e0b" },
];

/**
 * Toolbar above the map: route layer toggles and the KML layers dialog.
 * `addKML` only opens that dialog; loaded KMLs have their own show/hide.
 */
const RouteVisibilityControls = ({ routeVisibility, setRouteVisibility, canManageKml, kmlCount = 0, showHint }) => {
  const toggle = (type) => setRouteVisibility((prev) => ({ ...prev, [type]: !prev[type] }));

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: 2,
        rowGap: 0.5,
        px: 2,
        py: 0.75,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      {ROUTE_TOGGLES.map((option) => (
        <FormControlLabel
          key={option.type}
          control={<Checkbox size="small" checked={Boolean(routeVisibility[option.type])} onChange={() => toggle(option.type)} />}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box component="span" sx={{ width: 18, height: 4, borderRadius: 1, bgcolor: option.color }} />
              <Typography variant="body2">{option.label}</Typography>
            </Box>
          }
          sx={{ mr: 0 }}
        />
      ))}

      <Box sx={{ flex: 1 }} />

      {showHint && (
        <Tooltip title="Select one location, then click the map to add a temporary route point. Click a numbered marker for the location's details.">
          <Typography
            variant="caption"
            tabIndex={0}
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "text.secondary", cursor: "help" }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            Map tips
          </Typography>
        </Tooltip>
      )}
      <Tooltip title={canManageKml ? "" : "Select a location to manage its KML layers"}>
        <span>
          <Button
            size="small"
            startIcon={<LayersOutlinedIcon />}
            onClick={() => setRouteVisibility((prev) => ({ ...prev, addKML: true }))}
            disabled={!canManageKml}
          >
            KML layers{kmlCount ? ` (${kmlCount})` : ""}
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
};

export default RouteVisibilityControls;
