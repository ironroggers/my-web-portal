import React from "react";
import { Box, Chip, Divider, IconButton, Paper, Switch, Tooltip, Typography } from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { statusBarButtonSx } from "./mapChromeUtils";

// The frame the Master Map and the block profile map share: a status bar under the map and a
// floating legend. The base map, the cursor and remembered settings are in mapChromeUtils.js.

/** "z13" beside a layer that only draws from that zoom; amber while the map is further out */
export const ZoomBadge = ({ minZoom, zoom }) =>
  minZoom > 0 ? (
    <Tooltip title={zoom < minZoom ? `Zoom in to ${minZoom} to see this layer` : `Shows from zoom ${minZoom}`}>
      <Box
        component="span"
        sx={{
          px: 0.5,
          borderRadius: 0.5,
          fontSize: 10,
          fontWeight: 700,
          lineHeight: "16px",
          border: 1,
          borderColor: zoom < minZoom ? "warning.main" : "divider",
          color: zoom < minZoom ? "warning.dark" : "text.secondary",
          flexShrink: 0,
        }}
      >
        z{minZoom}
      </Box>
    </Tooltip>
  ) : null;

/**
 * Under the map: hide / show the panel, the coordinates under the mouse with a copy button,
 * the zoom, then `status` (e.g. what's loading), and on the right `actions` and the legend switch.
 */
export const MapStatusBar = ({ panelOpen, onTogglePanel, cursor: { cursor, copied, copyCursor }, zoom, status, actions, legendOpen, onToggleLegend }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: { xs: 0.5, sm: 1.5 },
      px: 1,
      minHeight: 36,
      borderTop: 1,
      borderColor: "divider",
      bgcolor: "background.paper",
      whiteSpace: "nowrap",
      overflow: "hidden",
    }}
  >
    <Tooltip title={panelOpen ? "Hide the panel" : "Show the panel"}>
      <IconButton size="small" onClick={onTogglePanel} aria-label={panelOpen ? "Hide the panel" : "Show the panel"} sx={statusBarButtonSx}>
        {panelOpen ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
    <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary", minWidth: { sm: 150 } }}>
      {cursor ? `${cursor.lat.toFixed(5)}, ${cursor.lng.toFixed(5)}` : "Move over the map"}
    </Typography>
    <Tooltip title={copied ? "Copied" : "Copy coordinates"}>
      <span>
        <IconButton size="small" onClick={copyCursor} disabled={!cursor} aria-label="Copy coordinates" sx={statusBarButtonSx}>
          <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </span>
    </Tooltip>
    <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
    <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
      Zoom: {zoom}
    </Typography>
    {status}
    <Box sx={{ flex: 1 }} />
    {actions}
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      Legend
    </Typography>
    <Switch size="small" checked={legendOpen} onChange={onToggleLegend} slotProps={{ input: { "aria-label": "Show legend" } }} />
  </Box>
);

/** The floating legend over the map's top right; `all` lists every layer instead of those on the map */
export const MapLegend = ({ all, onToggleAll, onClose, empty, children }) => (
  <Paper elevation={4} sx={{ position: "absolute", top: 60, right: 10, width: 250, maxHeight: "calc(100% - 120px)", display: "flex", flexDirection: "column", zIndex: 2 }}>
    <Box sx={{ display: "flex", alignItems: "center", px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider" }}>
      <Typography variant="subtitle2" sx={{ flex: 1 }}>
        Legend
      </Typography>
      <Tooltip title={all ? "Show only what's on the map" : "Show every layer"}>
        <Chip size="small" label={all ? "All" : "On map"} variant="outlined" onClick={onToggleAll} sx={{ mr: 0.5, height: 22 }} />
      </Tooltip>
      <IconButton size="small" onClick={onClose} aria-label="Close legend">
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
    <Box sx={{ overflowY: "auto", px: 1.5, py: 1 }}>
      {empty ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Nothing on the map at this zoom.
        </Typography>
      ) : (
        children
      )}
    </Box>
  </Paper>
);

/** One layer's part of the legend: its name, then a swatch and meaning per line */
export const LegendGroup = ({ label, items }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.6, display: "block" }}>
      {label}
    </Typography>
    {items.map(({ swatch, text }, i) => (
      <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 20 }}>
        <Box sx={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{swatch}</Box>
        <Typography variant="caption">{text}</Typography>
      </Box>
    ))}
  </Box>
);
