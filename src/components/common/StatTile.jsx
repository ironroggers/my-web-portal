import React from "react";
import { Box, Card, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatNumber } from "../../utils/formatNumber";
import Meter from "./Meter";

/**
 * KPI tile: label, headline value, optional meter (for ratios) and caption.
 */
const StatTile = ({ label, value, suffix, caption, icon, meterValue }) => (
  <Card sx={{ p: 2.25, height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, pt: 0.5 }}>
        {label}
      </Typography>
      {icon && (
        <Box
          sx={{
            width: 32,
            height: 32,
            flexShrink: 0,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            color: "primary.main",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            "& svg": { fontSize: 18 },
          }}
        >
          {icon}
        </Box>
      )}
    </Box>
    <Typography sx={{ fontSize: "1.75rem", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
      {formatNumber(value)}
      {suffix && (
        <Box component="span" sx={{ fontSize: "1.125rem", color: "text.secondary", ml: 0.25 }}>
          {suffix}
        </Box>
      )}
    </Typography>
    {meterValue !== undefined && <Meter value={meterValue} aria-label={`${label}: ${value}${suffix ?? ""}`} />}
    {caption && (
      <Typography variant="caption" sx={{ color: "text.secondary", mt: "auto" }}>
        {caption}
      </Typography>
    )}
  </Card>
);

export default StatTile;
