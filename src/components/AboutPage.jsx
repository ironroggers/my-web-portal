import React from 'react';
import { 
  Paper, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupsIcon from '@mui/icons-material/Groups';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';
import './AboutPage.css';

const AboutPage = () => {
  const features = [
    {
      id: 1,
      title: 'User Management',
      description: 'Create and manage users with different roles: Admin, Supervisor, and Surveyor.',
      icon: <PersonIcon fontSize="large" />
    },
    {
      id: 2,
      title: 'Attendance Tracking',
      description: 'Track surveyor attendance, check-in and check-out times, and generate reports.',
      icon: <CheckCircleIcon fontSize="large" />
    },
    {
      id: 3,
      title: 'Survey Management',
      description: 'Submit, review, and approve surveys. Track survey progress and completion.',
      icon: <BusinessIcon fontSize="large" />
    },
    {
      id: 4,
      title: 'Map Visualization',
      description: 'View approved surveys on an interactive map with location details and coverage areas.',
      icon: <MapIcon fontSize="large" />
    },
    {
      id: 5,
      title: 'Team Collaboration',
      description: 'Hierarchical reporting structure for better team management and oversight.',
      icon: <GroupsIcon fontSize="large" />
    }
  ];

  return (
    <div className="about-container">
      <Paper elevation={3} className="about-paper">
        <Typography variant="h4" component="h1" gutterBottom>
          About Project Management Portal
        </Typography>
        
        <Typography variant="body1" paragraph>
          The Project Management Portal is a comprehensive solution designed to streamline the process of managing field surveys, surveyors, and their tasks. Our platform provides tools for user management, attendance tracking, survey approval workflows, and geographic visualization of survey data.
        </Typography>
        
        <Box className="mission-section">
          <Typography variant="h5" component="h2" gutterBottom>
            Our Mission
          </Typography>
          <Typography variant="body1" paragraph>
            To provide organizations with an efficient and user-friendly platform that enhances productivity, improves data quality, and simplifies the management of field survey operations. We aim to reduce administrative overhead while providing actionable insights from survey data.
          </Typography>
        </Box>
        
        <Divider sx={{ my: 4 }} />
        
        <Typography variant="h5" component="h2" gutterBottom>
          Key Features
        </Typography>
        
        <Grid container spacing={3} className="features-grid">
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.id}>
              <Card className="feature-card">
                <CardContent>
                  <Box className="feature-icon">
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        <Divider sx={{ my: 4 }} />
        
        <Box className="tech-section">
          <Typography variant="h5" component="h2" gutterBottom>
            Technology Stack
          </Typography>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" component="h3" gutterBottom>
                Frontend
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="React.js" secondary="Modern UI component library" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Material UI" secondary="Responsive design framework" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Leaflet" secondary="Interactive mapping library" />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" component="h3" gutterBottom>
                Backend
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Node.js" secondary="Server-side JavaScript runtime" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Express" secondary="Web application framework" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="MongoDB" secondary="NoSQL database for flexible data storage" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Box>
        
        <Box className="version-section">
          <Typography variant="body2" color="textSecondary" align="center">
            Project Management Portal v1.0.0 | © 2024 Survey Tech Solutions
          </Typography>
        </Box>
      </Paper>
    </div>
  );
};

export default AboutPage; 