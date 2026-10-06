import React from "react";
import { Box, Typography } from "@mui/material";

/** Label on the left, value on the right; renders nothing when there is no value. */
const DetailRow = ({ label, children }) =>
  children ? (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        py: 0.75,
        "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" },
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ textAlign: "right", overflowWrap: "anywhere" }}>
        {children}
      </Typography>
    </Box>
  ) : null;

export default DetailRow;
