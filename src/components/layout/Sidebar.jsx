import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Badge,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import LoginIcon from "@mui/icons-material/Login";
import { useAuth } from "../../context/AuthContext";
import { useBlockPermissions } from "../../hooks/useBlockPermissions";
import { useWorkBadges } from "../execution/useWorkBadges";
import { layout, sidebarColors } from "../../theme/theme";
import { NAV_GROUPS, isNavItemActive } from "./navConfig";
import BrandMark from "./BrandMark";

const itemSx = (collapsed) => ({
  position: "relative",
  minHeight: 38,
  mx: 1.5,
  mb: 0.25,
  px: collapsed ? 0 : 1.5,
  borderRadius: 1,
  justifyContent: collapsed ? "center" : "flex-start",
  color: sidebarColors.text,
  "& .MuiListItemIcon-root": {
    minWidth: 0,
    mr: collapsed ? 0 : 1.5,
    color: sidebarColors.textMuted,
    "& svg": { fontSize: 20 },
  },
  "&:hover": {
    bgcolor: sidebarColors.hover,
    color: sidebarColors.textActive,
    "& .MuiListItemIcon-root": { color: sidebarColors.textActive },
  },
  "&.Mui-selected, &.Mui-selected:hover": {
    bgcolor: sidebarColors.active,
    color: sidebarColors.textActive,
    "& .MuiListItemIcon-root": { color: sidebarColors.accent },
    "&::before": {
      content: '""',
      position: "absolute",
      left: -12,
      top: 8,
      bottom: 8,
      width: 3,
      borderRadius: "0 3px 3px 0",
      bgcolor: sidebarColors.accent,
    },
  },
  "&.Mui-disabled": { opacity: 0.4 },
});

const labelProps = { slotProps: { primary: { fontSize: "0.875rem", fontWeight: 500, noWrap: true } } };

const NavItem = ({ item, collapsed, active, disabled, onNavigate, count = 0 }) => {
  const { Icon } = item;
  const showCount = count > 0 && !disabled;
  const button = (
    <ListItemButton
      component={disabled ? "div" : Link}
      to={disabled ? undefined : item.to}
      selected={active}
      disabled={disabled}
      onClick={onNavigate}
      sx={itemSx(collapsed)}
    >
      <ListItemIcon>
        {/* Collapsed, the count sits on the icon */}
        <Badge color={item.badgeColor || "error"} variant="dot" invisible={!(collapsed && showCount)}>
          <Icon />
        </Badge>
      </ListItemIcon>
      {!collapsed && <ListItemText primary={item.label} {...labelProps} />}
      {!collapsed && showCount && (
        <Badge
          color={item.badgeColor || "error"}
          badgeContent={count}
          max={99}
          sx={{ mr: 1.5, "& .MuiBadge-badge": { position: "static", transform: "none" } }}
        />
      )}
    </ListItemButton>
  );

  const tooltip = disabled
    ? `${item.label} — not available for your role`
    : collapsed
      ? `${item.label}${showCount ? ` · ${count}` : ""}`
      : "";
  if (!tooltip) return button;

  return (
    <Tooltip title={tooltip} placement="right" arrow>
      {/* span keeps the tooltip working when the button is disabled */}
      <Box component="span" sx={{ display: "block" }}>
        {button}
      </Box>
    </Tooltip>
  );
};

const Sidebar = ({ collapsed, onToggleCollapse, isMobile, mobileOpen, onMobileClose }) => {
  const { user, isAuthenticated } = useAuth();
  const { pathname, state } = useLocation();
  const { can: canBlockAction, loading: blockPermissionsLoading } = useBlockPermissions();
  const badges = useWorkBadges();

  // The mobile drawer is a temporary overlay, so it always shows labels.
  const isCollapsed = collapsed && !isMobile;
  const width = isCollapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth;

  const content = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          height: layout.topBarHeight,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          px: isCollapsed ? 0 : 2.5,
          borderBottom: `1px solid ${sidebarColors.border}`,
        }}
      >
        <Box component={Link} to="/" onClick={onMobileClose} sx={{ textDecoration: "none", minWidth: 0 }}>
          <BrandMark showText={!isCollapsed} />
        </Box>
      </Box>

      <Box component="nav" sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1.5 }}>
        {isAuthenticated ? (
          NAV_GROUPS.map((group, index) => (
            <Box key={group.label} sx={{ mt: index === 0 ? 0 : 1.5 }}>
              {isCollapsed ? (
                index > 0 && (
                  <Box sx={{ mx: 2, mb: 1.5, borderTop: `1px solid ${sidebarColors.border}` }} />
                )
              ) : (
                <Typography
                  variant="overline"
                  component="div"
                  sx={{ px: 3, pb: 0.5, color: sidebarColors.textMuted, display: "block" }}
                >
                  {group.label}
                </Typography>
              )}
              <List disablePadding>
                {group.items.map((item) => (
                  <NavItem
                    key={item.to}
                    item={item}
                    collapsed={isCollapsed}
                    active={isNavItemActive(item, pathname, state)}
                    disabled={Boolean(
                      (user && item.disabledForRoles?.includes(user.role)) ||
                        (item.permission && !blockPermissionsLoading && !canBlockAction(item.permission))
                    )}
                    onNavigate={onMobileClose}
                    count={item.badge ? badges[item.badge] : 0}
                  />
                ))}
              </List>
            </Box>
          ))
        ) : (
          <List disablePadding>
            <NavItem
              item={{ to: "/login", label: "Sign in", Icon: LoginIcon }}
              collapsed={isCollapsed}
              active={pathname === "/login"}
              onNavigate={onMobileClose}
            />
          </List>
        )}
      </Box>

      {!isMobile && (
        <Box sx={{ borderTop: `1px solid ${sidebarColors.border}`, py: 1 }}>
          <Tooltip title={isCollapsed ? "Expand sidebar" : ""} placement="right" arrow>
            <ListItemButton onClick={onToggleCollapse} sx={itemSx(isCollapsed)}>
              <ListItemIcon>
                {isCollapsed ? <KeyboardDoubleArrowRightIcon /> : <KeyboardDoubleArrowLeftIcon />}
              </ListItemIcon>
              {!isCollapsed && <ListItemText primary="Collapse sidebar" {...labelProps} />}
            </ListItemButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? mobileOpen : true}
      onClose={onMobileClose}
      ModalProps={{ keepMounted: true }}
      sx={(theme) => {
        const widthTransition = theme.transitions.create("width", {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.shorter,
        });
        return {
          // Only the docked (desktop) drawer reserves space in the page layout.
          ...(!isMobile && { width, flexShrink: 0, transition: widthTransition }),
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            overflowX: "hidden",
            bgcolor: sidebarColors.background,
            color: sidebarColors.text,
            borderRight: "none",
            transition: widthTransition,
          },
        };
      }}
    >
      {content}
    </Drawer>
  );
};

export default Sidebar;
