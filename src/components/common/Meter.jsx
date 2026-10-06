import React from "react";
import { LinearProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";

/**
 * Thin progress track for a ratio against a limit. The unfilled track is a
 * light step of the same hue as the fill, so the whole bar reads as one scale.
 */
const Meter = ({ value, color = "primary", height = 6, sx, ...rest }) => (
  <LinearProgress
    variant="determinate"
    value={Math.min(100, Math.max(0, Number(value) || 0))}
    {...rest}
    sx={[
      (theme) => ({
        height,
        borderRadius: height / 2,
        bgcolor: alpha(theme.palette[color].main, 0.12),
        "& .MuiLinearProgress-bar": {
          borderRadius: height / 2,
          bgcolor: theme.palette[color].main,
        },
      }),
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  />
);

export default Meter;
