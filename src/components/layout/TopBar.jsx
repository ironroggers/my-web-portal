import React, { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  ButtonBase,
  Divider,
  IconButton,
  Link,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { format } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { layout } from "../../theme/theme";
import { getBreadcrumbTrail } from "./navConfig";
import { SUPPORT_PAGES_ENABLED } from "../../config/featureFlags";

const ROLE_LABELS = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  SURVEYOR: "Surveyor",
  "EXECUTION ENGINEER": "Execution Engineer",
  VIEWER: "Viewer",
};

const PageTrail = () => {
  const { pathname } = useLocation();
  const trail = getBreadcrumbTrail(pathname);
  if (trail.length === 0) return null;

  const current = trail[trail.length - 1];

  return (
    <>
      {/* Phones only have room for the page name. */}
      <Typography variant="subtitle1" noWrap sx={{ display: { xs: "block", sm: "none" }, fontWeight: 600 }}>
        {current.label}
      </Typography>
      <Breadcrumbs
        separator={<NavigateNextIcon sx={{ fontSize: 16 }} />}
        sx={{ display: { xs: "none", sm: "block" }, "& .MuiBreadcrumbs-separator": { mx: 0.5, color: "text.disabled" } }}
      >
        {trail.map((crumb, index) => {
          if (crumb === current) {
            return (
              <Typography key={crumb.label} variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
                {crumb.label}
              </Typography>
            );
          }
          if (crumb.to) {
            return (
              <Link
                key={crumb.label}
                component={RouterLink}
                to={crumb.to}
                underline="hover"
                variant="body2"
                sx={{ color: "text.secondary" }}
              >
                {crumb.label}
              </Link>
            );
          }
          return (
            <Typography key={`${crumb.label}-${index}`} variant="body2" sx={{ color: "text.secondary" }}>
              {crumb.label}
            </Typography>
          );
        })}
      </Breadcrumbs>
    </>
  );
};

const UserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const username = user?.username || "User";
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || "";
  const close = () => setAnchorEl(null);

  const goTo = (path) => () => {
    close();
    navigate(path);
  };

  const handleLogout = () => {
    close();
    logout();
    navigate("/login");
  };

  return (
    <>
      <ButtonBase
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-controls={anchorEl ? "user-menu" : undefined}
        sx={{
          gap: 1.25,
          pl: 0.75,
          pr: 1,
          py: 0.5,
          borderRadius: 1.5,
          textAlign: "left",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Avatar sx={{ width: 32, height: 32, fontSize: "0.875rem", bgcolor: "primary.main" }}>
          {username.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0, maxWidth: 180 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {username}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: "text.secondary", display: "block", lineHeight: 1.3 }}>
            {roleLabel}
          </Typography>
        </Box>
        <ExpandMoreIcon sx={{ fontSize: 18, color: "text.secondary", display: { xs: "none", md: "block" } }} />
      </ButtonBase>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {username}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap component="div">
            {user?.email || roleLabel}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={goTo("/profile")}>
          <ListItemIcon>
            <PersonOutlineIcon fontSize="small" />
          </ListItemIcon>
          My Profile
        </MenuItem>
        {/* Menu can't take a Fragment child, so each item has its own check */}
        {SUPPORT_PAGES_ENABLED && (
          <MenuItem onClick={goTo("/help")}>
            <ListItemIcon>
              <HelpOutlineIcon fontSize="small" />
            </ListItemIcon>
            Help Center
          </MenuItem>
        )}
        {SUPPORT_PAGES_ENABLED && (
          <MenuItem onClick={goTo("/about")}>
            <ListItemIcon>
              <InfoOutlinedIcon fontSize="small" />
            </ListItemIcon>
            About
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
};

const TopBar = ({ showMenuButton, onMenuClick }) => {
  const { isAuthenticated } = useAuth();

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{ bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}
    >
      <Toolbar
        sx={{ minHeight: `${layout.topBarHeight}px !important`, px: { xs: 1.5, md: 3 }, gap: 1.5 }}
      >
        {showMenuButton && (
          <IconButton edge="start" onClick={onMenuClick} aria-label="Open navigation">
            <MenuIcon />
          </IconButton>
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <PageTrail />
        </Box>

        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            gap: 0.75,
            color: "text.secondary",
          }}
        >
          <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2" noWrap>
            {format(new Date(), "EEE, d MMM yyyy")}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ my: 1.5, display: { xs: "none", sm: "block" } }} />

        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <Button component={RouterLink} to="/login" variant="contained" size="small">
            Sign in
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
