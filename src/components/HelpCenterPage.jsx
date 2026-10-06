import React, { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import ContactSupportOutlinedIcon from '@mui/icons-material/ContactSupportOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LoginIcon from '@mui/icons-material/Login';
import { useAuth } from '../context/AuthContext';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import { NAV_GROUPS } from './layout/navConfig';

const navItem = (label) => NAV_GROUPS.flatMap((group) => group.items).find((item) => item.label === label);

// Answers describe the portal as it works today; update them when a page changes
const FAQ_TOPICS = [
  {
    title: 'Getting started',
    Icon: RocketLaunchOutlinedIcon,
    faqs: [
      {
        id: 'sign-in',
        question: 'How do I sign in?',
        answer:
          "Use the email address and password your administrator set up for you. If you've forgotten your password, ask a portal administrator to set a new one from the Users page.",
      },
      {
        id: 'navigation',
        question: 'Where do I find each module?',
        answer:
          'Use the sidebar on the left. Dashboard and Summary are under Overview; Surveys, Locations and FRT Tracking under Operations; Attendance and Users under Workforce. "Collapse sidebar" at the bottom gives pages more room. On a phone, open the sidebar with the menu button in the top-left corner.',
      },
      {
        id: 'profile',
        question: 'How do I update my name, email or phone number?',
        answer:
          'Click your name in the top-right corner and choose My Profile. Change the details and select Save changes. Your email address is also what you sign in with.',
      },
      {
        id: 'access',
        question: "Why can't I open some pages?",
        answer:
          "What you can open depends on your role. For example, Viewers can't open the Users page, and they see attendance for their assigned project only. Ask an administrator if you need different access.",
      },
    ],
  },
  {
    title: 'Users',
    Icon: navItem('Users').Icon,
    faqs: [
      {
        id: 'add-user',
        question: 'How do I add a new user?',
        answer:
          'Open Users and select Add user. Enter their name, email, role and a password of at least 6 characters. For any role other than Admin, also choose who they report to. Designation and project are optional.',
      },
      {
        id: 'reset-password',
        question: "How do I reset someone's password?",
        answer:
          'Open Users, find the person and select the edit (pencil) icon. Enter a new password and save. Leaving the password blank keeps their current one.',
      },
    ],
  },
  {
    title: 'Attendance',
    Icon: navItem('Attendance').Icon,
    faqs: [
      {
        id: 'attendance-today',
        question: 'How do I see who is in the field today?',
        answer:
          "Open Attendance. The Today's map tab shows everyone who has checked in today. Search for a person to zoom to them, and click a marker to see their check-in and check-out times and locations.",
      },
      {
        id: 'attendance-report',
        question: 'How do I download an attendance report?',
        answer:
          "Open Attendance and go to Weekly records. Use the download icon on a person's row for their monthly report, or Export all for everyone in the current list. Choose the month and the report downloads as an Excel file.",
      },
      {
        id: 'attendance-gap',
        question: 'What does the "3 km+ gap" flag mean?',
        answer:
          "On at least one day that week, the person checked out more than 3 km from where they checked in. Expand their row to see each day's check-in and check-out locations.",
      },
    ],
  },
  {
    title: 'Surveys and Locations',
    Icon: navItem('Surveys').Icon,
    faqs: [
      {
        id: 'find-survey',
        question: 'How do I find a survey?',
        answer:
          'Open Surveys and use the search box and the filters (survey type, status and state) to narrow the list. Select a survey to view its details, or open its location.',
      },
      {
        id: 'locations',
        question: 'Where can I see routes on the map?',
        answer:
          'Open Locations to see OFC routes on the map. From a location you can go into its sections, subsections, trenching and HOTO details.',
      },
    ],
  },
  {
    title: 'Summary',
    Icon: navItem('Summary').Icon,
    faqs: [
      {
        id: 'summary-upload',
        question: 'How do I update the data on the Summary page?',
        answer:
          'Open Summary, choose the sheet and select Upload Excel. The upload replaces every existing row in that sheet, so make sure the file contains the complete data, not just new rows.',
      },
      {
        id: 'summary-columns',
        question: 'Can I hide columns or filter a sheet?',
        answer:
          'Yes. Use the Columns button to choose which columns are shown, and the search icon in a column header to filter by that column.',
      },
    ],
  },
  {
    title: 'FRT Tracking',
    Icon: navItem('FRT Tracking').Icon,
    faqs: [
      {
        id: 'frt-refresh',
        question: 'How often are vehicle positions updated?',
        answer:
          'Every 30 seconds while Auto-refresh is on and the page is open in your browser. Select Refresh to update straight away.',
      },
      {
        id: 'frt-no-signal',
        question: 'What does "No signal" mean?',
        answer:
          "The vehicle's tracker isn't reporting: its status is no data, offline or unknown. Vehicles without a GPS position appear in the list but not on the map.",
      },
    ],
  },
];

const HelpCenterPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const query = searchQuery.trim().toLowerCase();

  const topics = useMemo(
    () =>
      FAQ_TOPICS.map((topic) => ({
        ...topic,
        faqs: query
          ? topic.faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(query))
          : topic.faqs,
      })).filter((topic) => topic.faqs.length > 0),
    [query]
  );

  const quickLinks = NAV_GROUPS.flatMap((group) => group.items).filter(
    (item) => !(user && item.disabledForRoles?.includes(user.role))
  );

  return (
    <Box>
      <PageHeader title="Help Center" subtitle="Answers to common questions about the portal" />

      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <TextField
            fullWidth
            placeholder="Search help, e.g. password or export"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            sx={{ mb: 3, bgcolor: 'background.paper' }}
            slotProps={{
              htmlInput: { 'aria-label': 'Search help' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setSearchQuery('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {topics.length === 0 ? (
            <SectionCard title="No matching answers">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Nothing matches "{searchQuery.trim()}". Try a different word, or contact your administrator using the
                details on this page.
              </Typography>
              <Button size="small" onClick={() => setSearchQuery('')} sx={{ mt: 1.5 }}>
                Show all questions
              </Button>
            </SectionCard>
          ) : (
            <Stack spacing={3}>
              {topics.map((topic) => (
                <SectionCard key={topic.title} title={topic.title} icon={<topic.Icon />} contentSx={{ p: 0 }}>
                  {topic.faqs.map((faq) => (
                    <Accordion
                      // Remounting when a search starts or ends opens every match, then lets readers close them
                      key={`${faq.id}-${Boolean(query)}`}
                      defaultExpanded={Boolean(query)}
                      disableGutters
                      elevation={0}
                      square
                      sx={{
                        bgcolor: 'transparent',
                        '&::before': { display: 'none' },
                        '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`${faq.id}-content`}
                        id={`${faq.id}-header`}
                        sx={{ px: 2.5, '& .MuiAccordionSummary-content': { my: 1.5 } }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {faq.question}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 720 }}>
                          {faq.answer}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </SectionCard>
              ))}
            </Stack>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3} sx={{ position: { md: 'sticky' }, top: { md: 80 } }}>
            <SectionCard title="Still need help?" icon={<ContactSupportOutlinedIcon />}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Contact your portal administrator or project manager. You'll get a faster answer if you include:
              </Typography>
              <Box component="ul" sx={{ m: 0, mt: 1.5, pl: 2.5, '& li': { mb: 0.75 } }}>
                <Typography component="li" variant="body2">
                  The page you were on
                </Typography>
                <Typography component="li" variant="body2">
                  What you were trying to do, and what happened instead
                </Typography>
                <Typography component="li" variant="body2">
                  A screenshot, if you can take one
                </Typography>
              </Box>
            </SectionCard>

            <SectionCard title={isAuthenticated ? 'Go to a module' : 'Open the portal'} contentSx={{ p: isAuthenticated ? 0 : 2.5 }}>
              {isAuthenticated ? (
                <List disablePadding>
                  {quickLinks.map((item) => (
                    <ListItemButton key={item.to} component={RouterLink} to={item.to} sx={{ px: 2.5, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                        <item.Icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2' } }} />
                      <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Sign in to use the portal's modules.
                  </Typography>
                  <Button component={RouterLink} to="/login" variant="contained" startIcon={<LoginIcon />}>
                    Sign in
                  </Button>
                </>
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HelpCenterPage;
