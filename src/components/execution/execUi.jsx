import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Skeleton, Snackbar, Stack, Typography } from "@mui/material";
import StatusPill from "../common/StatusPill";
import { useExecutionConfig, toneColor } from "../../hooks/useExecutionConfig";
import { BAR_ORDER, RESTORATION_ICONS, restorationLine, toneSx } from "./execConstants";
import { subscribeToasts } from "./toast";

// Small shared pieces for the OFC execution pages

export const ExecStatusPill = ({ status }) => {
  const { statusOf } = useExecutionConfig();
  const s = statusOf(status);
  return <StatusPill label={s.label} tone={toneColor(s.tone)} />;
};

export const RestorationPill = ({ status }) => {
  const { restorationOf } = useExecutionConfig();
  const s = restorationOf(status);
  return <StatusPill label={s.label} tone={toneColor(s.tone)} />;
};

// Type code tag, e.g. "HDD"; ducting and other work look different
export const TypeTag = ({ type }) =>
  type ? (
    <Chip
      size="small"
      label={type.code}
      sx={{
        height: 20,
        fontSize: "0.6875rem",
        fontWeight: 700,
        borderRadius: 1,
        bgcolor: type.kind === "ducting" ? "info.light" : "secondary.light",
        color: "#fff",
      }}
    />
  ) : null;

// Status split of a section's subsections, with an optional legend
export const StackBar = ({ counts = {}, legend = false }) => {
  const { statusOf } = useExecutionConfig();
  const total = BAR_ORDER.reduce((sum, k) => sum + (counts[k] || 0), 0);
  if (!total) return null;
  const parts = BAR_ORDER.filter((k) => counts[k]);
  const color = (k) => `${toneColor(statusOf(k).tone) === "default" ? "grey.500" : `${toneColor(statusOf(k).tone)}.main`}`;
  return (
    <Box>
      <Box sx={{ display: "flex", height: 8, borderRadius: 1, overflow: "hidden", bgcolor: "action.hover", mt: 1 }} aria-label="Status split" role="img">
        {parts.map((k) => (
          <Box key={k} sx={{ flex: counts[k], bgcolor: color(k) }} />
        ))}
      </Box>
      {legend && (
        <Stack direction="row" useFlexGap spacing={1.5} sx={{ flexWrap: "wrap", mt: 1 }}>
          {parts.map((k) => (
            <Box key={k} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color(k) }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {counts[k]} {statusOf(k).label.toLowerCase()}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

// "Restoration opens when all 4 subsections have ended · 2/4 ended", with the state's icon and tone
export const RestorationLine = ({ restoration, remark, sx }) => {
  const { restorationOf } = useExecutionConfig();
  if (!restoration) return null;
  const Icon = RESTORATION_ICONS[restoration.status] || RESTORATION_ICONS.LOCKED;
  const color = toneSx(restorationOf(restoration.status).tone);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color, ...sx }}>
      {React.createElement(Icon, { sx: { fontSize: 16, flexShrink: 0 } })}
      <Typography variant="caption" sx={{ fontWeight: 600, color: "inherit" }}>
        {restorationLine(restoration, remark)}
      </Typography>
    </Box>
  );
};

// Mounted once in App.jsx; shows messages from showToast() in toast.js
export const ToastHost = () => {
  const [toast, setToast] = useState(null);
  useEffect(() => subscribeToasts(setToast), []);
  return (
    <Snackbar
      key={toast?.key}
      open={Boolean(toast)}
      autoHideDuration={3500}
      onClose={(event, reason) => reason !== "clickaway" && setToast(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: { xs: 88, sm: 24 } }}
    >
      {toast ? (
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: "100%" }}>
          {toast.text}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
};

// The one action bar at the bottom of a page; stays visible while scrolling
export const StickyActionBar = ({ children }) => (
  <Box
    sx={{
      position: "sticky",
      bottom: 0,
      zIndex: 5,
      mt: 3,
      mx: { xs: -2, md: -3 },
      px: { xs: 2, md: 3 },
      py: 1.5,
      bgcolor: "background.paper",
      borderTop: 1,
      borderColor: "divider",
      display: "flex",
      gap: 1.5,
      justifyContent: "flex-end",
      flexWrap: "wrap",
      "& > .MuiButton-containedPrimary": { flex: { xs: 1, sm: "0 0 auto" } },
    }}
  >
    {children}
  </Box>
);

// "Step 1 of 3 · Work & location · next: Site condition"
export const StepLine = ({ labels, index }) => (
  <Typography variant="body2" sx={{ mb: 2 }}>
    Step {index + 1} of {labels.length} · <b>{labels[index]}</b>
    {index < labels.length - 1 && (
      <Box component="span" sx={{ color: "text.secondary" }}>
        {` · next: ${labels[index + 1]}`}
      </Box>
    )}
  </Typography>
);

// Loading skeleton, or a load error with Retry, for a page whose data hasn't arrived
export const PageState = ({ error, onRetry, height = 320 }) =>
  error ? (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {error}
    </Alert>
  ) : (
    <Box>
      <Skeleton variant="rounded" height={96} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={height} />
    </Box>
  );

// Empty list / nothing-to-do message
export const EmptyState = ({ icon, title, text, action }) => (
  <Box sx={{ py: 5, px: 3, textAlign: "center" }}>
    {icon && <Box sx={{ color: "text.disabled", "& svg": { fontSize: 40 }, mb: 1 }}>{icon}</Box>}
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
    {text && (
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        {text}
      </Typography>
    )}
    {action && <Box sx={{ mt: 2 }}>{action}</Box>}
  </Box>
);
