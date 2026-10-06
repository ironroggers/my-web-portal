import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardActionArea, Grid, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../context/AuthContext';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import { NAV_GROUPS } from './layout/navConfig';

const VERSION = '1.0.0';

const MODULE_DESCRIPTIONS = {
  Dashboard: 'Rollout progress across surveys, infrastructure, field teams and workflows.',
  Summary: 'Category totals and the data sheets behind them, kept up to date by Excel upload.',
  Surveys: 'Block, GP and OFC surveys captured in the field, with search and filters.',
  Locations: 'OFC routes on the map, with sections, subsections, trenching and HOTO details.',
  'FRT Tracking': 'Live vehicle positions from AiroTrack GPS trackers.',
  Attendance: "Today's check-ins, a monthly calendar and weekly records with Excel reports.",
  Users: 'Accounts, roles and reporting lines for portal and field staff.',
};

const TECHNOLOGY = [
  {
    title: 'Frontend',
    items: [
      ['React', 'User interface'],
      ['Material UI', 'Components and design system'],
      ['Leaflet', 'Interactive maps'],
    ],
  },
  {
    title: 'Backend',
    items: [
      ['Node.js', 'Server runtime'],
      ['Express', 'Web application framework'],
      ['MongoDB', 'Database'],
    ],
  },
  {
    title: 'Services',
    items: [
      ['AiroTrack', 'Vehicle GPS tracking'],
      ['OpenStreetMap', 'Map tiles'],
    ],
  },
];

const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1.25 }}>
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>
      {value}
    </Typography>
  </Box>
);

const ModuleCard = ({ module, linked }) => {
  const content = (
    <Box sx={{ p: 2.5, height: '100%' }}>
      <Box
        sx={(theme) => ({
          display: 'grid',
          placeItems: 'center',
          width: 36,
          height: 36,
          mb: 1.5,
          borderRadius: 1.5,
          color: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, 0.08),
        })}
      >
        <module.Icon fontSize="small" />
      </Box>
      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600 }}>
        {module.label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
        {MODULE_DESCRIPTIONS[module.label]}
      </Typography>
    </Box>
  );

  return (
    <Card sx={{ height: '100%' }}>
      {linked ? (
        <CardActionArea component={RouterLink} to={module.to} sx={{ height: '100%', alignItems: 'flex-start' }}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
};

const AboutPage = () => {
  const { user, isAuthenticated } = useAuth();
  const modules = NAV_GROUPS.flatMap((group) => group.items);

  return (
    <Box>
      <PageHeader title="About Project Portal" subtitle={`LOCUS · Version ${VERSION}`} />

      <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionCard title="What the portal does" sx={{ height: '100%' }}>
            <Typography variant="body2" sx={{ maxWidth: 720 }}>
              Project Portal brings field survey operations into one place: rollout progress, survey data, OFC routes,
              vehicle tracking, staff attendance and user accounts. Work captured in the field appears here for review,
              reporting and follow-up.
            </Typography>
            <Box
              sx={(theme) => ({
                mt: 2.5,
                p: 2,
                borderLeft: 3,
                borderColor: 'primary.main',
                borderRadius: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              })}
            >
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 600, lineHeight: 1.6 }}>
                Our mission
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 720 }}>
                To provide organizations with an efficient and user-friendly platform that enhances productivity,
                improves data quality, and simplifies the management of field survey operations. We aim to reduce
                administrative overhead while providing actionable insights from survey data.
              </Typography>
            </Box>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title="Version details" sx={{ height: '100%' }} contentSx={{ py: 1 }}>
            <Box sx={{ '& > :not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
              <DetailRow label="Product" value="Project Portal" />
              <DetailRow label="Version" value={VERSION} />
              <DetailRow label="Copyright" value="© 2024 Survey Tech Solutions" />
            </Box>
            <Button component={RouterLink} to="/help" startIcon={<HelpOutlineIcon />} sx={{ mt: 1, mb: 1, ml: -1 }}>
              Help Center
            </Button>
          </SectionCard>
        </Grid>
      </Grid>

      <Typography component="h2" variant="h6" sx={{ mt: 4, mb: 2 }}>
        Modules
      </Typography>
      <Grid container spacing={2}>
        {modules.map((module) => (
          <Grid key={module.to} size={{ xs: 12, sm: 6, lg: 3 }}>
            <ModuleCard
              module={module}
              linked={isAuthenticated && !(user && module.disabledForRoles?.includes(user.role))}
            />
          </Grid>
        ))}
      </Grid>

      <SectionCard title="Technology" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          {TECHNOLOGY.map((group) => (
            <Grid key={group.title} size={{ xs: 12, sm: 4 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {group.title}
              </Typography>
              <Stack spacing={1} sx={{ mt: 0.5 }}>
                {group.items.map(([name, role]) => (
                  <Box key={name}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {role}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>
      </SectionCard>
    </Box>
  );
};

export default AboutPage;
