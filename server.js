const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// API Configuration - can be overridden by environment variables
const AIROTRACK_CONFIG = {
  apiUrl: process.env.AIROTRACK_API_URL || 'https://login.airotrack.in:8082/api',
  username: process.env.AIROTRACK_USERNAME || '9934049403',
  password: process.env.AIROTRACK_PASSWORD || '123456'
};

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Proxy configuration for AiroTrack API
const airotrackProxy = createProxyMiddleware('/api/airotrack', {
  target: AIROTRACK_CONFIG.apiUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/api/airotrack': '', // Remove /api/airotrack prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying request: ${req.method} ${req.url} -> ${proxyReq.path}`);
    
    // Add basic auth header for AiroTrack API
    const credentials = Buffer.from(`${AIROTRACK_CONFIG.username}:${AIROTRACK_CONFIG.password}`).toString('base64');
    proxyReq.setHeader('Authorization', `Basic ${credentials}`);
    
    // Ensure proper headers
    proxyReq.setHeader('Content-Type', 'application/json');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Received response: ${proxyRes.statusCode} for ${req.url}`);
    
    // Add CORS headers to the response
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: err.message 
    });
  },
  secure: false, // Allow self-signed certificates
  logLevel: 'debug'
});

// Apply the proxy middleware
app.use(airotrackProxy);

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    airotrackApiUrl: AIROTRACK_CONFIG.apiUrl
  });
});

// Catch all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Proxy is set up for AiroTrack API at /api/airotrack`);
  console.log(`Target AiroTrack API: ${AIROTRACK_CONFIG.apiUrl}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 