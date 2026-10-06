import React from "react";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";

/**
 * Compact status label: a coloured dot plus text on a soft tint.
 * `tone` is a palette key (success, warning, info, error) or "default".
 */
const StatusPill = ({ label, tone = "default" }) => (
  <Box
    component="span"
    sx={(theme) => {
      const isNeutral = tone === "default" || !theme.palette[tone];
      const accent = isNeutral ? theme.palette.text.secondary : theme.palette[tone].main;
      return {
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
        color: isNeutral ? theme.palette.text.secondary : theme.palette[tone].dark,
        bgcolor: alpha(accent, 0.1),
        "&::before": {
          content: '""',
          width: 6,
          height: 6,
          borderRadius: "50%",
          bgcolor: accent,
        },
      };
    }}
  >
    {label}
  </Box>
);

export default StatusPill;
