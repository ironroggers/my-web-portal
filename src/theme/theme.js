import { createTheme, alpha } from "@mui/material/styles";

/**
 * Portal design system.
 *
 * Every module reads its colours, type scale and component defaults from here,
 * so the whole portal stays visually consistent as each module is revamped.
 */

const FONT_FAMILY =
  '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';

const BORDER = "#e2e6ec";
const BORDER_STRONG = "#cfd6df";
const SURFACE_MUTED = "#f7f9fc";

// Colours for the dark navigation sidebar.
export const sidebarColors = {
  background: "#0f1b2d",
  border: "rgba(255, 255, 255, 0.07)",
  text: "#c5cdd9",
  textMuted: "#7f8a9c",
  textActive: "#ffffff",
  hover: "rgba(255, 255, 255, 0.05)",
  active: "rgba(59, 130, 246, 0.16)",
  accent: "#3b82f6",
};

// Categorical colours for staff roles on maps and calendars (validated as a CVD-safe pair).
export const staffRoleColors = {
  SUPERVISOR: "#ea580c",
  SURVEYOR: "#2563eb",
};

export const layout = {
  sidebarWidth: 248,
  sidebarCollapsedWidth: 68,
  topBarHeight: 56,
  contentMaxWidth: 1600,
};

// Soft, low-contrast elevation scale: higher MUI elevations map onto five steps.
const SHADOW_STEPS = [
  "none",
  "0 1px 2px rgba(16, 24, 40, 0.05)",
  "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
  "0 4px 8px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)",
  "0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)",
  "0 20px 24px -4px rgba(16, 24, 40, 0.10), 0 8px 8px -4px rgba(16, 24, 40, 0.04)",
];

const shadowStepFor = (elevation) => {
  if (elevation === 0) return 0;
  if (elevation === 1) return 1;
  if (elevation <= 3) return 2;
  if (elevation <= 6) return 3;
  if (elevation <= 12) return 4;
  return 5;
};

const shadows = Array.from({ length: 25 }, (_, i) => SHADOW_STEPS[shadowStepFor(i)]);

const palette = {
  mode: "light",
  primary: { main: "#1d4ed8", light: "#3b82f6", dark: "#1e3a8a", contrastText: "#ffffff" },
  secondary: { main: "#0f766e", light: "#14b8a6", dark: "#115e59", contrastText: "#ffffff" },
  success: { main: "#15803d", light: "#22c55e", dark: "#14532d", contrastText: "#ffffff" },
  warning: { main: "#d97706", light: "#f59e0b", dark: "#b45309", contrastText: "#ffffff" },
  error: { main: "#b91c1c", light: "#ef4444", dark: "#7f1d1d", contrastText: "#ffffff" },
  info: { main: "#0369a1", light: "#0ea5e9", dark: "#0c4a6e", contrastText: "#ffffff" },
  background: { default: "#f3f5f9", paper: "#ffffff" },
  text: { primary: "#111827", secondary: "#5b6474", disabled: "#9aa3b2" },
  divider: BORDER,
};

const theme = createTheme({
  palette,
  shape: { borderRadius: 6 },
  shadows,
  typography: {
    fontFamily: FONT_FAMILY,
    h1: { fontSize: "2.25rem", fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontSize: "1.875rem", fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.01em" },
    h4: { fontSize: "1.375rem", fontWeight: 600, letterSpacing: "-0.01em" },
    h5: { fontSize: "1.125rem", fontWeight: 600 },
    h6: { fontSize: "1rem", fontWeight: 600 },
    subtitle1: { fontSize: "0.9375rem", fontWeight: 500 },
    subtitle2: { fontSize: "0.8125rem", fontWeight: 600 },
    body1: { fontSize: "0.875rem" },
    body2: { fontSize: "0.8125rem" },
    caption: { fontSize: "0.75rem" },
    overline: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.08em", lineHeight: 1.8 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.background.default,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-track": { background: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          background: "#c3cad4",
          borderRadius: 10,
          border: "2px solid transparent",
          backgroundClip: "content-box",
        },
        "*::-webkit-scrollbar-thumb:hover": { background: "#a3acb9", backgroundClip: "content-box" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600, textTransform: "none" },
        sizeSmall: { padding: "4px 10px" },
        outlined: { borderColor: BORDER_STRONG },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 8 },
        outlined: { borderColor: BORDER },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: 8, border: `1px solid ${BORDER}` },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        title: { fontSize: "0.9375rem", fontWeight: 600 },
        subheader: { fontSize: "0.8125rem" },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: BORDER },
        head: {
          fontWeight: 600,
          fontSize: "0.8125rem",
          color: "#374151",
          backgroundColor: SURFACE_MUTED,
        },
        sizeMedium: { padding: "10px 16px" },
        sizeSmall: { padding: "6px 12px" },
        // Re-assert MUI's padding variants, which the size overrides above would otherwise win over.
        paddingCheckbox: { width: 48, padding: "0 0 0 4px" },
        paddingNone: { padding: 0 },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&.MuiTableRow-hover:hover": { backgroundColor: alpha(palette.primary.main, 0.035) },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
        sizeSmall: { height: 22, fontSize: "0.75rem" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: BORDER_STRONG },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, minHeight: 44, fontSize: "0.875rem" },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: "#1f2937", fontSize: "0.75rem", borderRadius: 6, padding: "6px 10px" },
        arrow: { color: "#1f2937" },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { border: `1px solid ${BORDER}` },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { fontSize: "0.875rem" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 10 },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: "1.0625rem", fontWeight: 600 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});

export default theme;
