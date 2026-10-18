import React from "react";
import { Box, Chip, Divider } from "@mui/material";

/**
 * Chips for picking one value. options: strings or { value, label, count } (or { separator: true }).
 * allowClear: clicking the selected chip again clears it (optional fields).
 */
const ChipGroup = ({ options, value, onChange, allowClear = false, error = false, size = "medium", nowrap = false }) => (
  <Box
    sx={{
      display: "flex",
      gap: 1,
      alignItems: "center",
      flexWrap: nowrap ? "nowrap" : "wrap",
      overflowX: nowrap ? "auto" : "visible",
      pb: nowrap ? 0.5 : 0,
    }}
  >
    {options.map((o, i) => {
      if (o.separator) return <Divider key={`sep${i}`} orientation="vertical" flexItem />;
      const item = typeof o === "string" ? { value: o, label: o } : o;
      const selected = value === item.value;
      return (
        <Chip
          key={String(item.value)}
          size={size}
          label={item.count !== undefined ? `${item.label}  ${item.count}` : item.label}
          color={selected ? "primary" : "default"}
          variant={selected ? "filled" : "outlined"}
          onClick={() => onChange(selected && allowClear ? "" : item.value)}
          aria-pressed={selected}
          sx={{ flexShrink: 0, ...(error && !selected ? { borderColor: "error.main" } : {}) }}
        />
      );
    })}
  </Box>
);

export default ChipGroup;
