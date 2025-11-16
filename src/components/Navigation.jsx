import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
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
  Typography,
  Toolbar,
  AppBar,
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
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TableChartIcon from "@mui/icons-material/TableChart";
import { useAuth } from "../context/AuthContext";
import "./Navigation.css";

const Navigation = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
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
    {
      to: "/summary",
      label: "Summary",
      icon: <TableChartIcon />,
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

  const renderNavigationItems = () => {
    return navigationItems.map((item) => {
      if (
        (item.requireAuth && !isAuthenticated) ||
        (!item.showAlways && !isAuthenticated)
      ) {
        return null;
      }

      const isDisabled = item.to === "/users" && user && user.role === "VIEWER";

      return (
        <ListItem
          key={item.to}
          component={isDisabled ? "div" : NavLink}
          to={isDisabled ? undefined : item.to}
          disabled={isDisabled}
          onClick={() => setMobileMenuOpen(false)}
          sx={{
            color: "white",
            borderRadius: 1,
            mx: sidebarCollapsed ? 0.5 : 1,
            mb: 0.5,
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            px: sidebarCollapsed ? 1 : 2,
            "&.active": {
              bgcolor: "rgba(255, 255, 255, 0.2)",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.25)",
              },
            },
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          <ListItemIcon sx={{ color: "white", minWidth: sidebarCollapsed ? "auto" : 40, mr: sidebarCollapsed ? 0 : 2 }}>
            {item.icon}
          </ListItemIcon>
          {!sidebarCollapsed && <ListItemText primary={item.label} />}
        </ListItem>
      );
    });
  };

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo/Title Section */}
      <Box sx={{ p: 2, borderBottom: "1px solid rgba(255, 255, 255, 0.12)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {!sidebarCollapsed && (
          <Typography
            variant="h6"
            component={NavLink}
            to="/"
            sx={{
              textDecoration: "none",
              color: "white",
              fontWeight: "bold",
              display: "block",
              "&:hover": {
                opacity: 0.8,
              },
            }}
          >
            Project Portal
          </Typography>
        )}
        {!isMobile && (
          <IconButton
            onClick={toggleSidebar}
            sx={{
              color: "white",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.1)",
              },
            }}
            size="small"
          >
            {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Box>

      {/* User Profile Section */}
      {isAuthenticated && !sidebarCollapsed && (
        <Box sx={{ p: 2, borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
          <Box sx={{ textAlign: "center", mb: 1 }}>
            <IconButton onClick={handleMenu} sx={{ p: 0 }}>
              <Avatar
                sx={{
                  width: 50,
                  height: 50,
                  bgcolor: "secondary.main",
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                }}
              >
                {getInitial()}
              </Avatar>
            </IconButton>
          </Box>
          <Typography variant="subtitle2" sx={{ color: "white", textAlign: "center", mb: 0.5 }}>
            {user && user.username}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.7)", textAlign: "center", display: "block" }}>
            {getRoleLabel()}
          </Typography>
        </Box>
      )}

      {/* Collapsed State - Just Avatar */}
      {isAuthenticated && sidebarCollapsed && (
        <Box sx={{ p: 2, borderBottom: "1px solid rgba(255, 255, 255, 0.12)", textAlign: "center" }}>
          <IconButton onClick={handleMenu} sx={{ p: 0 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "secondary.main",
                fontSize: "1rem",
                fontWeight: "bold",
              }}
            >
              {getInitial()}
            </Avatar>
          </IconButton>
        </Box>
      )}

      {/* Navigation Items */}
      <List sx={{ flex: 1, pt: 1 }}>
        {renderNavigationItems()}
      </List>

      {/* Login Button for non-authenticated users */}
      {!isAuthenticated && !sidebarCollapsed && (
        <Box sx={{ p: 2, borderTop: "1px solid rgba(255, 255, 255, 0.12)" }}>
          <ListItem
            component={NavLink}
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            sx={{
              color: "white",
              borderRadius: 1,
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
              <LoginIcon />
            </ListItemIcon>
            <ListItemText primary="Login" />
          </ListItem>
        </Box>
      )}

      {/* Login Icon for collapsed state */}
      {!isAuthenticated && sidebarCollapsed && (
        <Box sx={{ p: 2, borderTop: "1px solid rgba(255, 255, 255, 0.12)", textAlign: "center" }}>
          <IconButton
            component={NavLink}
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            sx={{
              color: "white",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <LoginIcon />
          </IconButton>
        </Box>
      )}

      {/* Profile Menu */}
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        keepMounted
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
          },
        }}
      >
        <MenuItem onClick={handleProfile}>
          <PersonIcon fontSize="small" sx={{ mr: 1 }} />
          My Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <LoginIcon fontSize="small" sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );

  return (
    <>
      {/* Mobile Menu Button - Top Bar for Mobile */}
      {isMobile && (
        <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleMobileMenu}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Project Portal
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileMenuOpen : true}
        onClose={isMobile ? () => setMobileMenuOpen(false) : undefined}
        sx={{
          width: sidebarCollapsed ? 72 : 280,
          flexShrink: 0,
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          "& .MuiDrawer-paper": {
            width: sidebarCollapsed ? 72 : 280,
            boxSizing: "border-box",
            bgcolor: "primary.main",
            color: "white",
            borderRight: "1px solid rgba(255, 255, 255, 0.12)",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Navigation;
