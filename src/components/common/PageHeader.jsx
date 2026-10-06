import React from "react";
import { Box, Stack, Typography } from "@mui/material";

/**
 * Standard page heading: title and optional subtitle on the left,
 * page-level actions (refresh, export, create…) on the right.
 */
const PageHeader = ({ title, subtitle, actions }) => (
  <Box
    sx={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: { xs: "flex-start", sm: "center" },
      justifyContent: "space-between",
      gap: 2,
      mb: 3,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography component="h1" variant="h4">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {actions && (
      // useFlexGap: margins would indent whichever action wraps onto a new line
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
        {actions}
      </Stack>
    )}
  </Box>
);

export default PageHeader;
