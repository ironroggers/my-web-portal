import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import LocationSearchingIcon from "@mui/icons-material/LocationSearching";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { fmtAccuracy, fmtLatLong, isAboveLimit } from "../../utils/executionFormat";
import { useGpsSampler } from "./useGpsSampler";
import { showToast } from "./toast";

/**
 * A GPS location: "Capture GPS" samples for up to 10 s and keeps the best fix.
 * A fix above the accuracy limit waits for Recapture or Use anyway.
 * value / onChange: { latitude, longitude, accuracy } or null.
 */
const GpsField = ({ label, value, onChange, error }) => {
  const { config } = useExecutionConfig();
  const limit = config?.accuracyLimitM ?? 1;
  const { sample, sampling, live, elapsed } = useGpsSampler({ seconds: config?.gpsSampleSec ?? 10, limit });
  const [pending, setPending] = useState(null);
  const has = value && Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude));

  const capture = async () => {
    setPending(null);
    try {
      const fix = await sample();
      if (isAboveLimit(fix.accuracy, limit)) {
        setPending(fix);
        showToast(`GPS ±${Number(fix.accuracy).toFixed(1)} m is above ${limit} m · Recapture for a better fix`, "warning");
      } else {
        onChange(fix);
        showToast(`GPS captured · ±${Number(fix.accuracy).toFixed(1)} m`);
      }
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      {label && (
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
          {label}
        </Typography>
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.25,
          border: 1,
          borderColor: error ? "error.main" : "divider",
          borderRadius: 1,
          bgcolor: "background.paper",
        }}
      >
        {has ? <MyLocationIcon color="primary" fontSize="small" /> : <LocationSearchingIcon sx={{ color: "text.disabled" }} fontSize="small" />}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {sampling ? (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Sampling GPS{live ? ` · ±${Number(live.accuracy).toFixed(1)} m` : ""} · {elapsed} s
            </Typography>
          ) : has ? (
            <>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {fmtLatLong(value.latitude, value.longitude)}
              </Typography>
              <Typography variant="caption" sx={{ color: isAboveLimit(value.accuracy, limit) ? "warning.dark" : "success.dark" }}>
                {fmtAccuracy(value.accuracy, limit)}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Not captured yet
            </Typography>
          )}
        </Box>
        <Button
          size="small"
          variant={has || pending ? "outlined" : "contained"}
          onClick={capture}
          disabled={sampling}
          startIcon={sampling ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {has || pending ? "Recapture" : "Capture GPS"}
        </Button>
      </Box>
      {pending && (
        <Alert
          severity="warning"
          sx={{ mt: 1 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                onChange(pending);
                setPending(null);
              }}
            >
              Use anyway
            </Button>
          }
        >
          GPS ±{Number(pending.accuracy).toFixed(1)} m is above {limit} m · Recapture for a better fix
        </Alert>
      )}
      {error && (
        <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default GpsField;
