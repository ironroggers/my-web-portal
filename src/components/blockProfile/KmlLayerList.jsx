import React from "react";
import { Box, Link, Switch, Typography } from "@mui/material";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";

/**
 * The layers (folders) of one KML file, indented as in the file, each with its feature
 * count and a switch. A layer inside a hidden one shows dimmed: it's hidden with its parent.
 * layers: from kmlLayers(); hidden: Set of layer ids; onChange(nextHiddenSet).
 */
const KmlLayerList = ({ layers, hidden, onChange, fileName }) => {
  if (!layers.length) return null;
  const parentHidden = (layer) => {
    let parent = layers.find((l) => l.id === layer.parentId);
    while (parent) {
      if (hidden.has(parent.id)) return true;
      parent = layers.find((l) => l.id === parent.parentId);
    }
    return false;
  };
  const toggle = (id) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  const shown = layers.filter((l) => !hidden.has(l.id) && !parentHidden(l)).length;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", flex: 1 }}>
          {shown} of {layers.length} {layers.length === 1 ? "layer" : "layers"} shown
        </Typography>
        <Link component="button" variant="caption" onClick={() => onChange(new Set())} disabled={!hidden.size}>
          Show all
        </Link>
        <Link component="button" variant="caption" onClick={() => onChange(new Set(layers.filter((l) => l.depth === 0).map((l) => l.id)))}>
          Hide all
        </Link>
      </Box>
      {layers.map((layer) => {
        const dimmed = parentHidden(layer);
        return (
          <Box key={layer.id} sx={{ display: "flex", alignItems: "center", gap: 0.75, pl: layer.depth * 2, minHeight: 30, opacity: dimmed ? 0.5 : 1 }}>
            <FolderOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
            <Typography variant="body2" noWrap title={layer.name} sx={{ flex: 1, minWidth: 0 }}>
              {layer.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
              {layer.count}
            </Typography>
            <Switch
              size="small"
              checked={!hidden.has(layer.id)}
              onChange={() => toggle(layer.id)}
              slotProps={{ input: { "aria-label": `Show layer ${layer.name}${fileName ? ` of ${fileName}` : ""}` } }}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default KmlLayerList;
