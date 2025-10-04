import React, { useState, useEffect } from 'react';
import { Paper, Typography, Tabs, Tab, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import AttendanceMapView from './AttendanceMapView';
import AttendanceCalendarView from './AttendanceCalendarView';
import AttendanceDetailedView from './AttendanceDetailedView';
import { useAuth } from '../context/AuthContext';

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

const PROJECT_OPTIONS = [
  'BharatNet Kerala',
  'NFS',
  'BUIDCO',
  'JUDCO',
  'MPUDC',
  'KMC',
  'DEL Office',
  'HDD',
  'GAIL',
  'SIDCL',
  'Others',
];

const AttendancePage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [projectFilter, setProjectFilter] = useState('ALL');
  const { user } = useAuth();
  const isViewer = user && user.role === 'VIEWER';

  // Freeze project filter for Viewer role to assigned project
  useEffect(() => {
    if (isViewer) {
      const assignedProject = user && user.project ? user.project : 'ALL';
      setProjectFilter(assignedProject);
    }
  }, [isViewer, user]);

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 2 }}>
          <Typography 
            variant="h5" 
            component="h1" 
            sx={{ 
              fontWeight: 500 
            }}
          >
            Attendance Management
          </Typography>
          <FormControl size="small" sx={{ width: 220 }}>
            <InputLabel id="attendance-project-filter-label">Project</InputLabel>
            <Select
              labelId="attendance-project-filter-label"
              value={projectFilter}
              label="Project"
              onChange={(e) => setProjectFilter(e.target.value)}
              disabled={isViewer}
            >
              <MenuItem value="ALL">All</MenuItem>
              {PROJECT_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="attendance tabs"
          centered
          sx={{
            backgroundColor: "#fff",
            mt: 2,
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
        <AttendanceMapView projectFilter={projectFilter} />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <AttendanceCalendarView projectFilter={projectFilter} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <AttendanceDetailedView projectFilter={projectFilter} />
      </TabPanel>
    </Paper>
  );
};

export default AttendancePage; 