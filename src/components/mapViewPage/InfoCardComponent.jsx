import { Alert, Box, Button, Card, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { useNavigate } from "react-router-dom";
import StatusPill from "../common/StatusPill";
import { getLocationStatus } from "../../constants/locations";

const formatDistance = (meters) => {
  if (meters == null) return "Unknown";
  return meters < 1000 ? `${meters.toFixed(0)} m` : `${(meters / 1000).toFixed(2)} km`;
};

const formatTime = (seconds) => {
  if (seconds == null) return "Unknown";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
};

const Metric = ({ label, value, caption }) => (
  <Box sx={{ px: 2, py: 1.5, border: 1, borderColor: "divider", borderRadius: 1.5, minWidth: 0 }}>
    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.35, fontVariantNumeric: "tabular-nums" }}>
      {value}
    </Typography>
    {caption && (
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {caption}
      </Typography>
    )}
  </Box>
);

/** Summary of the selected location: status, route figures and links to its detail pages. */
const InfoCardComponent = ({
  selectedLocations,
  surveyRoutes,
  getSurveysForLocation,
  handleLocationMarkerClick,
  distance,
}) => {
  const navigate = useNavigate();

  if (selectedLocations.length === 0) return null;

  return selectedLocations.map((selected, index) => {
    const location = selected.location;
    const locationId = location?._id;

    // Physical vs desktop distance, shown once both are known
    const physicalDistance = surveyRoutes
      .filter((route) => route.locationId === locationId)
      .reduce((total, route) => total + (route.routeInfo?.distance || 0), 0);
    const desktopDistance = selected.routeInfo?.distance;
    const comparison =
      desktopDistance && physicalDistance > 0
        ? {
            difference: Math.abs(desktopDistance - physicalDistance),
            percent: ((Math.abs(desktopDistance - physicalDistance) / Math.max(desktopDistance, physicalDistance)) * 100).toFixed(1),
          }
        : null;

    return (
      <Card key={index} sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            px: 2.5,
            py: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Typography variant="h6" component="h2">
                {location?.block}
              </Typography>
              <StatusPill label={getLocationStatus(location?.status).label} tone={getLocationStatus(location?.status).tone} />
            </Box>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
              {[location?.district, location?.state].filter(Boolean).join(", ")}
              {location?.block_code && ` · Block code ${location.block_code}`}
            </Typography>
          </Box>
          {location && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button variant="contained" size="small" startIcon={<InfoOutlinedIcon />} onClick={() => handleLocationMarkerClick(locationId)}>
                Location details
              </Button>
              <Button variant="outlined" size="small" startIcon={<AssignmentTurnedInOutlinedIcon />} onClick={() => navigate(`/hoto-details/${locationId}`)}>
                HOTO
              </Button>
              <Button variant="outlined" size="small" startIcon={<AccountTreeOutlinedIcon />} onClick={() => navigate(`/location/${locationId}/sections`)}>
                Sections
              </Button>
            </Box>
          )}
        </Box>

        <Box sx={{ p: 2.5 }}>
          {selected.error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {selected.error}
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${comparison ? 5 : 3}, minmax(0, 1fr))` },
            }}
          >
            <Metric label="Desktop route" value={`${(distance / 1000).toFixed(2)} km`} caption={desktopDistance ? `Walking route, about ${formatTime(selected.routeInfo.time)}` : "Optimised route"} />
            <Metric label="Route points" value={selected.points?.length || 0} caption="Waypoints on the route" />
            <Metric label="Physical surveys" value={getSurveysForLocation(locationId).length} caption="Surveys for this location" />
            {comparison && (
              <>
                <Metric label="Physical route" value={formatDistance(physicalDistance)} caption="From field data" />
                <Metric label="Difference" value={`${comparison.percent}%`} caption={formatDistance(comparison.difference)} />
              </>
            )}
          </Box>
        </Box>
      </Card>
    );
  });
};

export default InfoCardComponent;
