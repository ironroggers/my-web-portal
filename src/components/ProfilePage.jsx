import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../context/AuthContext';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import { ROLE_LABELS } from '../config/roles';

const EMPTY_FORM = { username: '', email: '', phone: '' };

const toForm = (profile) => ({
  username: profile?.username || '',
  email: profile?.email || '',
  phone: profile?.phone || '',
});

const getInitials = (name) =>
  (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

// `reportingTo` may arrive populated ({ username }) or as a bare id
const getManagerName = (reportingTo) =>
  reportingTo && typeof reportingTo === 'object' ? reportingTo.username || reportingTo.email : null;

const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1.25 }}>
    <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ fontWeight: 500, textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere', color: value ? 'text.primary' : 'text.disabled' }}
    >
      {value || '—'}
    </Typography>
  </Box>
);

const ProfilePage = () => {
  const { user, token, getProfile, updateProfile } = useAuth();
  // undefined while loading, null if the request failed
  const [profile, setProfile] = useState(undefined);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loadError, setLoadError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadProfile = useCallback(async () => {
    setProfile(undefined);
    setLoadError('');
    try {
      const data = await getProfile();
      setProfile(data);
      setFormData(toForm(data));
    } catch (error) {
      setProfile(null);
      setLoadError(error.message || 'Failed to load profile data');
    }
    // getProfile is recreated on every AuthContext render; load once per sign-in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load once per sign-in; saving updates the page from the response instead of reloading
  useEffect(() => {
    if (token) loadProfile();
  }, [token, loadProfile]);

  const savedForm = toForm(profile);
  const isDirty = Boolean(profile) && Object.keys(EMPTY_FORM).some((key) => formData[key] !== savedForm[key]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (message.type === 'success') setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage({ type: '', text: '' });

    try {
      const updated = await updateProfile(formData);
      // Show what the server saved, which may differ from what was typed
      const saved = { ...profile, ...formData, ...updated };
      setProfile(saved);
      setFormData(toForm(saved));
      setMessage({ type: 'success', text: 'Your profile has been updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDiscard = () => {
    setFormData(savedForm);
    setMessage({ type: '', text: '' });
  };

  const isLoading = profile === undefined;
  // Fall back to the signed-in user while the profile loads or if it failed
  const account = { ...user, ...profile };
  const roleLabel = ROLE_LABELS[account.role] || account.role;

  return (
    <Box>
      <PageHeader title="My Profile" subtitle="Your account details and contact information" />

      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
        {/* Identity */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Avatar
                sx={{ width: 72, height: 72, mx: 'auto', mb: 1.5, fontSize: '1.5rem', fontWeight: 600, bgcolor: 'primary.main' }}
              >
                {getInitials(account.username)}
              </Avatar>
              <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
                {account.username || 'Your account'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
                {account.email}
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ px: 3, py: 0.5, '& > :not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
              {isLoading ? (
                Array.from({ length: 4 }, (_, index) => <Skeleton key={index} variant="text" height={44} />)
              ) : (
                <>
                  <DetailRow label="Role" value={roleLabel} />
                  <DetailRow label="Designation" value={account.designation} />
                  <DetailRow label="Project" value={account.project} />
                  {account.role !== 'ADMIN' && <DetailRow label="Reports to" value={getManagerName(account.reportingTo)} />}
                </>
              )}
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {/* Contact details */}
            <SectionCard
              title="Contact details"
              subtitle="Your name, email and phone number"
              icon={<PersonOutlineIcon />}
            >
              {loadError ? (
                <Alert
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={loadProfile}>
                      Retry
                    </Button>
                  }
                >
                  {loadError}
                </Alert>
              ) : (
                <Box component="form" onSubmit={handleSubmit}>
                  {message.text && (
                    <Alert severity={message.type} sx={{ mb: 2.5 }} onClose={() => setMessage({ type: '', text: '' })}>
                      {message.text}
                    </Alert>
                  )}

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      {isLoading ? (
                        <Skeleton variant="rounded" height={40} />
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          id="username"
                          label="Name"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          autoComplete="name"
                          required
                        />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      {isLoading ? (
                        <Skeleton variant="rounded" height={40} />
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          id="phone"
                          label="Phone number"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          autoComplete="tel"
                        />
                      )}
                    </Grid>
                    <Grid size={12}>
                      {isLoading ? (
                        <Skeleton variant="rounded" height={40} />
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          id="email"
                          label="Email address"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          autoComplete="email"
                          helperText="You sign in with this address"
                          required
                        />
                      )}
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
                    <Button color="inherit" onClick={handleDiscard} disabled={!isDirty || updating}>
                      Discard
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!isDirty || updating}
                      startIcon={updating ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                      {updating ? 'Saving…' : 'Save changes'}
                    </Button>
                  </Box>
                </Box>
              )}
            </SectionCard>

            {/* Password */}
            <SectionCard title="Password" icon={<LockOutlinedIcon />}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Passwords can't be changed here. If you need a new password, ask a portal administrator to set one for
                you from the Users page.
              </Typography>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
