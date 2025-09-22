import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Grid,
  Alert,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'SURVEYOR',
    reportingTo: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingManagers, setFetchingManagers] = useState(true);
  const [error, setError] = useState('');
  const [potentialManagers, setPotentialManagers] = useState([]);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  
  const { register, getPotentialManagers } = useAuth();
  const navigate = useNavigate();

  // Fetch potential managers for reporting to selection
  useEffect(() => {
    const fetchManagers = async () => {
      setFetchingManagers(true);
      try {
        const managers = await getPotentialManagers();
        setPotentialManagers(managers);
      } catch (err) {
        console.error('Failed to fetch managers:', err.message);
        setError('Failed to load reporting managers. Please try again.');
      } finally {
        setFetchingManagers(false);
      }
    };
    
    fetchManagers();
  }, [getPotentialManagers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Check password match when either password or confirmPassword changes
    if (name === 'password' || name === 'confirmPassword') {
      const otherField = name === 'password' ? 'confirmPassword' : 'password';
      setPasswordsMatch(value === formData[otherField] || formData[otherField] === '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate required fields based on role
    if (formData.role !== 'ADMIN' && !formData.reportingTo) {
      setError('Reporting manager is required for non-admin users');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registerData } = formData;
      
      // Only include reportingTo if the role isn't ADMIN
      if (registerData.role === 'ADMIN') {
        delete registerData.reportingTo;
      }
      
      await register(registerData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  if (fetchingManagers) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <Paper 
        elevation={3} 
        sx={{ 
          mt: 8, 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: 2
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <PersonAddAltIcon />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Create an Account
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                error={!passwordsMatch}
                helperText={!passwordsMatch && "Passwords don't match"}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!passwordsMatch}
                helperText={!passwordsMatch && "Passwords don't match"}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  id="role"
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={handleChange}
                >
                  <MenuItem value="SURVEYOR">Surveyor</MenuItem>
                  <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                  <MenuItem value="PERFORMER">Performer</MenuItem>
                  <MenuItem value="VIEWER">Viewer</MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {formData.role !== 'ADMIN' && (
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="reporting-to-label">Reporting To</InputLabel>
                  <Select
                    labelId="reporting-to-label"
                    id="reportingTo"
                    name="reportingTo"
                    value={formData.reportingTo}
                    label="Reporting To"
                    onChange={handleChange}
                  >
                    {potentialManagers.map((manager) => (
                      <MenuItem key={manager._id} value={manager._id}>
                        {manager.username} ({manager.role})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </Button>
          
          <Grid container justifyContent="center">
            <Grid item>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  {"Already have an account? Sign in"}
                </Typography>
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegisterPage; 