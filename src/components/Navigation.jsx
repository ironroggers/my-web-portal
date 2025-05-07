import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Divider
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MapIcon from '@mui/icons-material/Map';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LoginIcon from '@mui/icons-material/Login';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  // Function to get the first letter of username for the avatar
  const getInitial = () => {
    return user && user.username ? user.username.charAt(0).toUpperCase() : 'U';
  };

  // Function to get role display label
  const getRoleLabel = () => {
    if (!user || !user.role) return '';
    
    const roleMap = {
      'ADMIN': 'Admin',
      'SUPERVISOR': 'Supervisor',
      'SURVEYOR': 'Surveyor'
    };
    
    return roleMap[user.role] || user.role;
  };

  return (
    <AppBar position="static" color="primary" className="navigation">
      <Toolbar className="navigation-content">
        <Typography 
          variant="h6" 
          component={NavLink} 
          to="/" 
          sx={{ 
            flexGrow: 1, 
            textDecoration: 'none', 
            color: 'white',
            fontWeight: 'bold',
            '&:hover': {
              opacity: 0.8
            }
          }}
        >
          Project Management Portal
        </Typography>
        
        {/* Navigation links shown to all users */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            component={NavLink}
            to="/"
            color="inherit"
            startIcon={<DashboardIcon />}
            end
          >
            Dashboard
          </Button>
          
          {/* Only show these links to authenticated users */}
          {isAuthenticated && (
            <>
              <Button
                component={NavLink}
                to="/users"
                color="inherit"
                startIcon={<PeopleIcon />}
                end
              >
                Users
              </Button>
              <Button
                component={NavLink}
                to="/attendance"
                color="inherit"
                startIcon={<CalendarTodayIcon />}
                end
              >
                Attendance
              </Button>
              <Button
                component={NavLink}
                to="/map"
                color="inherit"
                startIcon={<MapIcon />}
                end
              >
                Map View
              </Button>
            </>
          )}
          
          <Button
            component={NavLink}
            to="/help"
            color="inherit"
            startIcon={<HelpIcon />}
            end
          >
            Help
          </Button>
          
          {/* Show either login button or profile menu */}
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
                    bgcolor: 'secondary.main',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}
                >
                  {getInitial()}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <Box 
                  sx={{ 
                    px: 2, 
                    py: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      bgcolor: 'secondary.main',
                      mb: 1
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
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 