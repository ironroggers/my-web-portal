import React from 'react';
import { 
  Paper, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Box,
  Button,
  TextField,
  Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import HelpIcon from '@mui/icons-material/Help';
import './HelpCenterPage.css';

const HelpCenterPage = () => {
  // Common FAQs
  const faqs = [
    {
      question: 'How do I register a new user?',
      answer: 'Navigate to the Users page and click on the "Create User" button. Fill in all required information including username, email, password, and role. If the role is not Admin, you will need to select a reporting manager.'
    },
    {
      question: 'How can I view surveyor attendance?',
      answer: 'Go to the Attendance page where you can see a table of all surveyors with their check-in and check-out times, total hours, and attendance status. You can filter and sort the data as needed.'
    },
    {
      question: 'How do I view approved surveys on the map?',
      answer: 'Navigate to the Map View page where all approved surveys will be displayed on an interactive map. Each survey is represented by a marker with a circle showing its coverage radius. Click on a marker to see more details about the survey.'
    },
    {
      question: 'What should I do if a user cannot log in?',
      answer: 'First, verify that the username and password are correct. If the user has forgotten their password, you can reset it from the User Management page. If the issue persists, contact the system administrator.'
    },
    {
      question: 'How do I approve a survey?',
      answer: 'As a supervisor, you will receive notifications when a surveyor submits a survey for approval. Go to the Surveys page, locate the pending survey, review the details, and click the "Approve" button if everything is in order.'
    }
  ];

  return (
    <div className="help-center-container">
      <Paper elevation={3} className="help-center-paper">
        <Typography variant="h4" component="h1" gutterBottom>
          <HelpIcon fontSize="large" className="help-icon" /> Help Center
        </Typography>
        
        <Typography variant="body1" paragraph>
          Welcome to the Project Management Portal Help Center. Find answers to common questions below or contact support if you need further assistance.
        </Typography>
        
        <Typography variant="h5" component="h2" gutterBottom>
          Frequently Asked Questions
        </Typography>
        
        <div className="faqs-section">
          {faqs.map((faq, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1">{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
        
        <Box className="contact-support-section">
          <Typography variant="h5" component="h2" gutterBottom>
            <ContactSupportIcon fontSize="medium" /> Contact Support
          </Typography>
          
          <Typography variant="body1" paragraph>
            Couldn't find what you're looking for? Send us a message and we'll get back to you as soon as possible.
          </Typography>
          
          <form className="contact-form">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  variant="outlined"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  variant="outlined"
                  type="email"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subject"
                  variant="outlined"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message"
                  variant="outlined"
                  multiline
                  rows={4}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  type="submit"
                >
                  Send Message
                </Button>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Paper>
    </div>
  );
};

export default HelpCenterPage; 