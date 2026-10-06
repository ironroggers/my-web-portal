import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { layout } from "../../theme/theme";
import { FULL_SCREEN_ROUTES } from "./navConfig";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const COLLAPSED_STORAGE_KEY = "portal.sidebarCollapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

/**
 * Application chrome: dark sidebar on the left, top bar with breadcrumbs and
 * the user menu, and the routed page in the main content area.
 */
const AppLayout = ({ children }) => {
  const { pathname } = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (FULL_SCREEN_ROUTES.includes(pathname)) {
    return children;
  }

  const toggleCollapsed = () => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // Persisting the preference is best-effort.
      }
      return next;
    });
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar showMenuButton={isMobile} onMenuClick={() => setMobileOpen(true)} />
        <Box
          component="main"
          className="app-main-content"
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: layout.contentMaxWidth,
            mx: "auto",
            p: { xs: 2, md: 3 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
