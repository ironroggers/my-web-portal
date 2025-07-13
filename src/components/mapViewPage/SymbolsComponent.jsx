import { Box, Typography } from "@mui/material";

const SymbolsComponent = ({ surveys }) => {
  const routeColor = "#2563eb"; // Brighter blue
  const surveyRouteColor = "#f59e0b"; // More vibrant yellow

  return (
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
            // opacity: routeVisibility.desktopSurvey ? 1 : 0.3,
          }}
        />
        <Typography
          variant="body2"
          fontWeight={500}
          // sx={{ opacity: routeVisibility.desktopSurvey ? 1 : 0.5 }}
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
            // opacity: routeVisibility.physicalSurvey ? 1 : 0.3,
          }}
        />
        <Typography
          variant="body2"
          fontWeight={500}
          // sx={{ opacity: routeVisibility.physicalSurvey ? 1 : 0.5 }}
        >
          Survey Routes (Status 5)
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            bgcolor: "#ff9800",
            borderRadius: "50%",
            mr: 1,
            border: "2px solid #000",
          }}
        />
        <Typography variant="body2" fontWeight={500}>
          Temporary Points (Click map to add, click marker to remove)
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            bgcolor: "#ffffff",
            borderRadius: "50%",
            mr: 1,
            border: "2px solid #000",
          }}
        />
        <Typography variant="body2" fontWeight={500}>
          Others Points (Click marker to remove, excluded from exports)
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
          GP Surveys ({surveys.filter((s) => s.surveyType === "gp").length})
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
          OFC Surveys ({surveys.filter((s) => s.surveyType === "ofc").length})
        </Typography>
      </Box>
    </Box>
  );
};

export default SymbolsComponent;
