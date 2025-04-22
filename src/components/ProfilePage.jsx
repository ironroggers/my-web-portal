import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Grid,
  Alert,
  Avatar,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import PersonIcon from '@mui/icons-material/Person';

const ProfilePage = () => {
  const { user, token, getProfile, updateProfile } = useAuth();
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getProfile();
        setProfileData({
          username: profile.username || '',
          email: profile.email || '',
          phone: profile.phone || ''
        });
      } catch (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to load profile data' });
      } finally {
        setLoading(false);
      }
    };
    
    if (user && token) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [user, token, getProfile]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage({ type: '', text: '' });
    
    try {
      await updateProfile(profileData);
      setMessage({ 
        type: 'success', 
        text: 'Profile updated successfully!' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update profile' 
      });
    } finally {
      setUpdating(false);
    }
  };
  
  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }
  
  return (
    <Container component="main" maxWidth="md">
      <Paper 
        elevation={3} 
        sx={{ 
          mt: 4, 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: 2
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          mb: 3 
        }}>
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main', 
              width: 72, 
              height: 72, 
              mb: 2 
            }}
          >
            <PersonIcon fontSize="large" />
          </Avatar>
          <Typography component="h1" variant="h4">
            {user?.username}
          </Typography>
          <Typography color="text.secondary" variant="subtitle1">
            {user?.role}
          </Typography>
        </Box>
        
        {message.text && (
          <Alert 
            severity={message.type} 
            sx={{ width: '100%', mb: 3 }}
            onClose={() => setMessage({ type: '', text: '' })}
          >
            {message.text}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="username"
                label="Username"
                name="username"
                value={profileData.username}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="phone"
                label="Phone Number"
                name="phone"
                type="tel"
                value={profileData.phone || ''}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="role"
                label="Role"
                value={user?.role || ''}
                InputProps={{
                  readOnly: true,
                }}
                disabled
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={updating}
                sx={{ mt: 2 }}
              >
                {updating ? 'Updating...' : 'Update Profile'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage; 