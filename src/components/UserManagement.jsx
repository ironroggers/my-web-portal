import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import {
  Container,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Alert,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

const UserManagement = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'SURVEYOR',
    reportingTo: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [potentialManagers, setPotentialManagers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchPotentialManagers();
    fetchAllUsers();
  }, []);

  // Clear reportingTo when role changes to ADMIN
  useEffect(() => {
    if (formData.role === 'ADMIN') {
      setFormData(prev => ({ ...prev, reportingTo: '' }));
    }
  }, [formData.role]);

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('https://auth-api-xz1q.onrender.com/api/auth/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const responseData = await response.json();
      if (responseData.success && Array.isArray(responseData.data)) {
        setUsers(responseData.data);
      } else {
        throw new Error('Invalid data format received from server');
      }
    } catch (err) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPotentialManagers = async () => {
    try {
      const baseUrl = import.meta.env.VITE_AUTH_API_URL || 'https://api.annuprojects.com/api';
      const response = await fetch(`${baseUrl}/auth/potential-managers`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch potential managers');
      }

      const responseData = await response.json();
      // Check if the response has the expected structure and set only the data array
      if (responseData.success && Array.isArray(responseData.data)) {
        setPotentialManagers(responseData.data);
      } else {
        throw new Error('Invalid data format received from server');
      }
    } catch (err) {
      setError('Failed to load potential managers');
      console.error('Error fetching managers:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Create the request body
      const requestBody = {
        ...formData,
        ...(formData.role !== 'ADMIN' && formData.reportingTo ? { reportingTo: formData.reportingTo } : {})
      };

      const response = await fetch('https://auth-api-xz1q.onrender.com/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccess('User created successfully!');
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'SURVEYOR',
        reportingTo: ''
      });
      
      // Refresh users and managers list after successful registration
      fetchAllUsers();
      fetchPotentialManagers();
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  // Function to get reporting manager name
  const getManagerName = (managerId) => {
    if (!managerId) return '-';
    const manager = users.find(user => user._id === managerId);
    return manager ? manager.username : 'Unknown';
  };

  const isAdmin = formData.role === 'ADMIN';
  
  // Handle table pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth="lg" className="user-management-container">
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 4, mt: 2, fontWeight: 'bold', color: 'primary.main' }}>
        <PeopleAltIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        User Access Management
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}
      
      <Grid container spacing={4}>
        {/* User creation form */}
        <Grid item xs={12} md={5}>
          <Card elevation={3}>
            <CardHeader 
              title="Create New User" 
              titleTypographyProps={{ variant: 'h6' }}
              avatar={<PersonAddIcon color="primary" />}
              sx={{ borderBottom: '1px solid #eee', bgcolor: 'primary.light', color: 'white' }}
            />
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Username"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Password"
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      size="small"
                      inputProps={{ minLength: 6 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel id="role-label">Role</InputLabel>
                      <Select
                        labelId="role-label"
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                        label="Role"
                      >
                        <MenuItem value="SURVEYOR">Surveyor</MenuItem>
                        <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                        <MenuItem value="ADMIN">Admin</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl 
                      fullWidth 
                      variant="outlined" 
                      size="small" 
                      disabled={isAdmin}
                    >
                      <InputLabel id="reporting-to-label">Reporting To</InputLabel>
                      <Select
                        labelId="reporting-to-label"
                        id="reportingTo"
                        name="reportingTo"
                        value={formData.reportingTo}
                        onChange={handleChange}
                        required={!isAdmin}
                        label="Reporting To"
                      >
                        <MenuItem value="">
                          <em>Select Manager</em>
                        </MenuItem>
                        {potentialManagers && potentialManagers.map((manager) => (
                          <MenuItem key={manager._id} value={manager._id}>
                            {manager.username}
                          </MenuItem>
                        ))}
                      </Select>
                      {isAdmin && (
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                          Not required for Admin role
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={loading}
                      sx={{ mt: 1 }}
                      startIcon={loading ? <CircularProgress size={20} /> : <PersonAddIcon />}
                    >
                      {loading ? 'Creating User...' : 'Create User'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Users table */}
        <Grid item xs={12} md={7}>
          <Card elevation={3}>
            <CardHeader 
              title="Existing Users" 
              titleTypographyProps={{ variant: 'h6' }}
              avatar={<PeopleAltIcon color="primary" />}
              sx={{ borderBottom: '1px solid #eee', bgcolor: 'primary.light', color: 'white' }}
            />
            <CardContent>
              {loadingUsers ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : users.length > 0 ? (
                <>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><Typography variant="subtitle2" fontWeight="bold">Username</Typography></TableCell>
                          <TableCell><Typography variant="subtitle2" fontWeight="bold">Email</Typography></TableCell>
                          <TableCell><Typography variant="subtitle2" fontWeight="bold">Role</Typography></TableCell>
                          <TableCell><Typography variant="subtitle2" fontWeight="bold">Reporting To</Typography></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((user) => (
                            <TableRow key={user._id} hover>
                              <TableCell>{user.username}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={user.role} 
                                  size="small" 
                                  color={
                                    user.role === 'ADMIN' ? 'error' : 
                                    user.role === 'SUPERVISOR' ? 'warning' : 'success'
                                  }
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>{user.reportingTo ? user.reportingTo.username : '-'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={users.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </>
              ) : (
                <Typography variant="body1" sx={{ p: 2 }}>No users found.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UserManagement; 