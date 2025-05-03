import React, { useState } from 'react';
import { Paper, Typography, Tabs, Tab, Box } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AttendanceMapView from './AttendanceMapView';
import AttendanceCalendarView from './AttendanceCalendarView';

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
    <Paper elevation={3} sx={{ padding: 0, margin: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="attendance tabs"
          centered
        >
          <Tab icon={<MapIcon />} label="Map View" {...a11yProps(0)} />
          <Tab icon={<CalendarMonthIcon />} label="Calendar View" {...a11yProps(1)} />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <AttendanceMapView />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <AttendanceCalendarView />
      </TabPanel>
    </Paper>
  );
};

export default AttendancePage; 