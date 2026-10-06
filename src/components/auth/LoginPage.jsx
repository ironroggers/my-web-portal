import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AuthLayout from './AuthLayout';

const FieldLabel = ({ htmlFor, children }) => (
  <Typography component="label" htmlFor={htmlFor} variant="body2" sx={{ display: 'block', fontWeight: 600, mb: 0.75 }}>
    {children}
  </Typography>
);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <AuthLayout>
      <Typography component="h1" sx={{ fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
        Sign in
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 4 }}>
        Enter your credentials to access the portal.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <Box>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <TextField
              required
              fullWidth
              id="email"
              name="email"
              placeholder="name@company.com"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <TextField
              required
              fullWidth
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={handleClickShowPassword}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ py: 1.25 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 4, p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover', alignItems: 'flex-start' }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary', mt: '1px' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          Portal access is limited to Admin and Viewer accounts. Contact your administrator if you need access.
        </Typography>
      </Stack>
    </AuthLayout>
  );
};

export default LoginPage;
