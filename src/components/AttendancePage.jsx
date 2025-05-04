import React, { useState } from 'react';
import { Paper, Typography, Tabs, Tab, Box } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import AttendanceMapView from './AttendanceMapView';
import AttendanceCalendarView from './AttendanceCalendarView';
import AttendanceDetailedView from './AttendanceDetailedView';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`attendance-tabpanel-${index}`}
      aria-labelledby={`attendance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `attendance-tab-${index}`,
    'aria-controls': `attendance-tabpanel-${index}`,
  };
}

const AttendancePage = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        padding: 0, 
        margin: 2,
        borderRadius: "8px",
        overflow: "hidden"
      }}
    >
      <Box 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: "#f5f5f5"
        }}
      >
        <Typography 
          variant="h5" 
          component="h1" 
          sx={{ 
            p: 2, 
            fontWeight: 500 
          }}
        >
          Attendance Management
        </Typography>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="attendance tabs"
          centered
          sx={{
            backgroundColor: "#fff",
            "& .MuiTab-root": {
              minHeight: "54px",
              fontSize: "0.95rem"
            }
          }}
        >
          <Tab 
            icon={<MapIcon />} 
            iconPosition="start"
            label="Map View" 
            {...a11yProps(0)} 
          />
          <Tab 
            icon={<CalendarMonthIcon />} 
            iconPosition="start"
            label="Calendar View" 
            {...a11yProps(1)} 
          />
          <Tab 
            icon={<FormatListBulletedIcon />} 
            iconPosition="start"
            label="Detailed View" 
            {...a11yProps(2)} 
          />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <AttendanceMapView />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <AttendanceCalendarView />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AttendanceDetailedView />
      </TabPanel>
    </Paper>
  );
};

export default AttendancePage; 