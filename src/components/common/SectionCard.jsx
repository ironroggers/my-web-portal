import React from "react";
import { Box, Card, Typography } from "@mui/material";

/**
 * Panel with a titled header bar and a content area. `action` sits at the
 * right of the header; `contentSx` adjusts the body (e.g. `{ p: 0 }` for tables).
 * With no children (e.g. a collapsed section) only the header is rendered.
 */
const SectionCard = ({ title, subtitle, icon, action, children, contentSx, sx }) => {
  const hasBody = children !== null && children !== undefined && children !== false;

  return (
    <Card sx={{ display: "flex", flexDirection: "column", ...sx }}>
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: hasBody ? 1 : 0,
          borderColor: "divider",
        }}
      >
        {icon && (
          <Box sx={{ display: "flex", color: "text.secondary", "& svg": { fontSize: 20 } }}>{icon}</Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {hasBody && <Box sx={{ p: 2.5, flex: 1, ...contentSx }}>{children}</Box>}
    </Card>
  );
};

export default SectionCard;
