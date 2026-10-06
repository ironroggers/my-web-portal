import React, { useState, useEffect } from 'react';
import { Card, Tabs, Tab, Box, MenuItem, TextField } from '@mui/material';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import AttendanceMapView from './AttendanceMapView';
import AttendanceCalendarView from './AttendanceCalendarView';
import AttendanceDetailedView from './AttendanceDetailedView';
import PageHeader from './common/PageHeader';
import { useAuth } from '../context/AuthContext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  const isMap = index === 0;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`attendance-tabpanel-${index}`}
      aria-labelledby={`attendance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box
          sx={{
            p: isMap ? 0 : 2.5,
            // The map fills the remaining viewport height
            height: isMap ? 'max(480px, calc(100vh - 290px))' : 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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
    <Box>
      <PageHeader
        title="Attendance"
        subtitle="Today's check-ins, the monthly calendar and weekly records for field staff"
        actions={
          <TextField
            select
            size="small"
            label="Project"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            disabled={isViewer}
            helperText={isViewer ? 'Fixed to your assigned project' : undefined}
            sx={{ width: 240 }}
          >
            <MenuItem value="ALL">All projects</MenuItem>
            {PROJECT_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
        }
      />

      <Card>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="attendance views"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<MapOutlinedIcon fontSize="small" />} iconPosition="start" label="Today's map" {...a11yProps(0)} />
          <Tab icon={<CalendarMonthOutlinedIcon fontSize="small" />} iconPosition="start" label="Monthly calendar" {...a11yProps(1)} />
          <Tab icon={<TableRowsOutlinedIcon fontSize="small" />} iconPosition="start" label="Weekly records" {...a11yProps(2)} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <AttendanceMapView projectFilter={projectFilter} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <AttendanceCalendarView projectFilter={projectFilter} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <AttendanceDetailedView projectFilter={projectFilter} />
        </TabPanel>
      </Card>
    </Box>
  );
};

export default AttendancePage;
