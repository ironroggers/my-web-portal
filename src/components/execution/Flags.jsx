import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";

// What the approver should look at twice (D6/D7, tape vs GPS, plan deviation).
// flags: { mediaAboveLimit, gpsAboveLimit, uploaded, locationTyped, tapeMismatch, planDeviation }
const flagRows = (flags = {}, limit = 1, planPct = 10) =>
  [
    flags.mediaAboveLimit && { key: "media", short: `${flags.mediaAboveLimit} above ±${limit} m`, long: `${flags.mediaAboveLimit} photo or video${flags.mediaAboveLimit === 1 ? "" : "s"} kept with GPS above ±${limit} m` },
    flags.gpsAboveLimit && { key: "gps", short: `${flags.gpsAboveLimit} GPS above ±${limit} m`, long: `${flags.gpsAboveLimit} GPS fix${flags.gpsAboveLimit === 1 ? "" : "es"} kept above ±${limit} m` },
    flags.uploaded && { key: "uploaded", short: `${flags.uploaded} uploaded`, long: `${flags.uploaded} uploaded from the gallery instead of the camera` },
    flags.locationTyped && { key: "typed", short: `${flags.locationTyped} location typed`, long: `${flags.locationTyped} with a typed location (no GPS in the file)` },
    flags.tapeMismatch && { key: "tape", short: `${flags.tapeMismatch} tape ≠ GPS`, long: `${flags.tapeMismatch} reference point${flags.tapeMismatch === 1 ? "" : "s"} where the tape and GPS distances differ` },
    flags.planDeviation && { key: "plan", short: `>${planPct}% off plan`, long: `Executed length is more than ${planPct}% off the planned length` },
  ].filter(Boolean);

/** Compact chips for a list card; nothing when there are no flags */
export const FlagChips = ({ flags }) => {
  const { config } = useExecutionConfig();
  const rows = flagRows(flags, config?.accuracyLimitM ?? 1, config?.planDeviationPct ?? 10);
  if (!rows.length) return null;
  return (
    <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: "wrap", mt: 1 }}>
      {rows.map((r) => (
        <Chip key={r.key} size="small" icon={<WarningAmberIcon />} label={r.short} color="warning" variant="outlined" sx={{ height: 22, fontSize: "0.6875rem" }} />
      ))}
    </Stack>
  );
};

/** Full list for the approval detail, or "Nothing flagged" */
export const FlagList = ({ flags }) => {
  const { config } = useExecutionConfig();
  const rows = flagRows(flags, config?.accuracyLimitM ?? 1, config?.planDeviationPct ?? 10);
  if (!rows.length) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "success.dark" }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
        <Typography variant="body2" sx={{ color: "inherit" }}>
          Nothing flagged
        </Typography>
      </Box>
    );
  }
  return (
    <Box>
      {rows.map((r) => (
        <Box key={r.key} sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, py: 0.375, color: "warning.dark" }}>
          <WarningAmberIcon sx={{ fontSize: 18, mt: "1px" }} />
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            {r.long}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
