import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Drawer,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import MapIcon from "@mui/icons-material/Map";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import HelpIcon from "@mui/icons-material/Help";
import InfoIcon from "@mui/icons-material/Info";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LoginIcon from "@mui/icons-material/Login";
import PersonIcon from "@mui/icons-material/Person";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { useAuth } from "../context/AuthContext";
import "./Navigation.css";

const Navigation = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    setMobileMenuOpen(false);
    navigate("/login");
  };

  const handleProfile = () => {
    handleClose();
    setMobileMenuOpen(false);
    navigate("/profile");
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Function to get the first letter of username for the avatar
  const getInitial = () => {
    return user && user.username ? user.username.charAt(0).toUpperCase() : "U";
  };

  // Function to get role display label
  const getRoleLabel = () => {
    if (!user || !user.role) return "";

    const roleMap = {
      ADMIN: "Admin",
      SUPERVISOR: "Supervisor",
      SURVEYOR: "Surveyor",
      "EXECUTION ENGINEER": "Execution Engineer",
      VIEWER: "Viewer",
    };

    return roleMap[user.role] || user.role;
  };

  const navigationItems = [
    { to: "/", label: "Dashboard", icon: <DashboardIcon />, showAlways: true },
    {
      to: "/surveys",
      label: "Surveys",
      icon: <AssignmentIcon />,
      requireAuth: true,
    },
    { to: "/users", label: "Users", icon: <PeopleIcon />, requireAuth: true },
    {
      to: "/attendance",
      label: "Attendance",
      icon: <CalendarTodayIcon />,
      requireAuth: true,
    },
    { to: "/map", label: "Locations", icon: <MapIcon />, requireAuth: true },
    { 
      to: "/frt-tracking", 
      label: "FRT Tracking", 
      icon: <GpsFixedIcon />, 
      requireAuth: true 
    },
    // { to: "/help", label: "Help", icon: <HelpIcon />, showAlways: true },
  ];

  const renderNavigationItems = (mobile = false) => {
    return navigationItems.map((item) => {
      if (
        (item.requireAuth && !isAuthenticated) ||
        (!item.showAlways && !isAuthenticated)
      ) {
        return null;
      }

      const isDisabled = item.to === "/users" && user && user.role === "VIEWER";

      if (mobile) {
        return (
          <ListItem
            key={item.to}
            component={isDisabled ? "div" : NavLink}
            to={isDisabled ? undefined : item.to}
            disabled={isDisabled}
            onClick={() => setMobileMenuOpen(false)}
            sx={{
              color: "inherit",
              "&.active": {
                bgcolor: "rgba(255, 255, 255, 0.2)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        );
      }

      return (
        <Button
          key={item.to}
          component={NavLink}
          to={item.to}
          color="inherit"
          startIcon={item.icon}
          disabled={isDisabled}
          end
        >
          {item.label}
        </Button>
      );
    });
  };

  return (
    <AppBar
      position="static"
      color="primary"
      className="navigation"
      sx={{ width: "100vw" }}
    >
      <Toolbar className="navigation-content">
        <Typography
          variant="h6"
          component={NavLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: "none",
            color: "white",
            fontWeight: "bold",
            "&:hover": {
              opacity: 0.8,
            },
          }}
        >
          Project Management Portal
        </Typography>

        {/* Mobile menu burger icon */}
        {isMobile ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isAuthenticated && (
              <IconButton onClick={handleMenu} color="inherit" size="small">
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "secondary.main",
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                  }}
                >
                  {getInitial()}
                </Avatar>
              </IconButton>
            )}
            <IconButton
              color="inherit"
              edge="end"
              onClick={toggleMobileMenu}
              sx={{ ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        ) : (
          /* Desktop navigation */
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            {renderNavigationItems()}

            {isAuthenticated ? (
              <Box>
                <IconButton
                  onClick={handleMenu}
                  color="inherit"
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: "secondary.main",
                      fontSize: "0.875rem",
                      fontWeight: "bold",
                    }}
                  >
                    {getInitial()}
                  </Avatar>
                </IconButton>
              </Box>
            ) : (
              <Button
                component={NavLink}
                to="/login"
                color="inherit"
                startIcon={<LoginIcon />}
                end
              >
                Login
              </Button>
            )}
          </Box>
        )}

        {/* Profile Menu */}
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          keepMounted
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "secondary.main",
                mb: 1,
              }}
            >
              {getInitial()}
            </Avatar>
            <Typography variant="subtitle1" fontWeight="bold">
              {user && user.username}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {getRoleLabel()}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleProfile}>
            <PersonIcon fontSize="small" sx={{ mr: 1 }} />
            My Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LoginIcon fontSize="small" sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>

        {/* Mobile Navigation Drawer */}
        <Drawer
          anchor="right"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          PaperProps={{
            sx: {
              width: 280,
              bgcolor: "primary.main",
              color: "white",
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">Menu</Typography>
              <IconButton
                color="inherit"
                onClick={() => setMobileMenuOpen(false)}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            {isAuthenticated && (
              <>
                <Box sx={{ textAlign: "center", mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: "secondary.main",
                      fontSize: "1.5rem",
                      margin: "0 auto",
                      mb: 1,
                    }}
                  >
                    {getInitial()}
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {user && user.username}
                  </Typography>
                  <Typography variant="caption">{getRoleLabel()}</Typography>
                </Box>
                <Divider sx={{ bgcolor: "rgba(255, 255, 255, 0.12)", mb: 2 }} />
              </>
            )}
            <List>
              {renderNavigationItems(true)}
              {!isAuthenticated && (
                <ListItem
                  component={NavLink}
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  sx={{
                    color: "inherit",
                    "&.active": {
                      bgcolor: "rgba(255, 255, 255, 0.2)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                    <LoginIcon />
                  </ListItemIcon>
                  <ListItemText primary="Login" />
                </ListItem>
              )}
            </List>
          </Box>
        </Drawer>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
