import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {AUTH_URL} from "../API/api-keys.jsx";

// Create an axios instance with default config
const api = axios.create({
  baseURL: AUTH_URL+'/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set token for all requests when it changes
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }

    setLoading(false);
  }, []);

  // Login function
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: authToken } = response.data.data;

      // Save to state
      setUser(userData);
      setToken(authToken);

      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', authToken);

      return userData;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Register function
  const register = async (userData) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', userData);
      const { user: newUser, token: authToken } = response.data.data;

      // Save to state
      setUser(newUser);
      setToken(authToken);

      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('token', authToken);

      return newUser;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Get user profile
  const getProfile = async () => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await api.get('/auth/profile');
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update user profile
  const updateProfile = async (updatedData) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await api.put('/auth/profile', updatedData);

      // Update the user in state and localStorage
      const updatedUser = { ...user, ...response.data.data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Get potential managers (for registration)
  const getPotentialManagers = async () => {
    try {
      const response = await api.get('/auth/potential-managers');
      return response.data.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch managers';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    getProfile,
    updateProfile,
    getPotentialManagers,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
