import React, { useState, useEffect } from 'react';
import './UserManagement.css';

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
      const response = await fetch(`${import.meta.env.VITE_AUTH_API_URL}/auth/potential-managers`);
      
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

  return (
    <div className="user-management-container">
      <h1>User Access Management</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <h2>Create New User</h2>
      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            placeholder="Enter username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter password"
            minLength="6"
          />
        </div>

        <div className="form-group">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
          >
            <option value="SURVEYOR">Surveyor</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="reportingTo">
            Reporting To {isAdmin && <span className="optional-text">(Not required for Admin)</span>}
          </label>
          <select
            id="reportingTo"
            name="reportingTo"
            value={formData.reportingTo}
            onChange={handleChange}
            required={!isAdmin}
            disabled={isAdmin}
          >
            <option value="">Select Manager</option>
            {potentialManagers && potentialManagers.map((manager) => (
              <option key={manager._id} value={manager._id}>
                {manager.username}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating User...' : 'Create User'}
        </button>
      </form>
      
      <div className="users-list-section">
        <h2>Existing Users</h2>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : users.length > 0 ? (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Reporting To</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.reportingTo ? user.reportingTo.username : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No users found.</p>
        )}
      </div>
    </div>
  );
};

export default UserManagement; 