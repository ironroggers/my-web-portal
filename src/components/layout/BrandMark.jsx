import React from "react";
import { Box, Typography } from "@mui/material";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import { sidebarColors } from "../../theme/theme";

/**
 * Product logo: a pin mark plus the product name. `tone` picks text colours
 * for dark (sidebar, auth panel) or light backgrounds.
 */
const BrandMark = ({ showText = true, tone = "dark", size = 32 }) => {
  const onDark = tone === "dark";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: 1.5,
          display: "grid",
          placeItems: "center",
          color: "#fff",
          background: `linear-gradient(135deg, ${sidebarColors.accent} 0%, #1d4ed8 100%)`,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
        }}
      >
        <LocationOnRoundedIcon sx={{ fontSize: size * 0.62 }} />
      </Box>
      {showText && (
        <Box sx={{ minWidth: 0, lineHeight: 1 }}>
          <Typography
            noWrap
            sx={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              lineHeight: 1.2,
              color: onDark ? "#fff" : "text.primary",
            }}
          >
            Project Portal
          </Typography>
          <Typography
            noWrap
            sx={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              lineHeight: 1.4,
              color: onDark ? sidebarColors.textMuted : "text.secondary",
            }}
          >
            LOCUS
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BrandMark;
