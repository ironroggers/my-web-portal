import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 3000,
    allowedHosts: [
      'annu-projects-survey-tool.onrender.com', 
      'localhost',
      'the-kerela-project.annuprojects.com'
    ],
    proxy: {
      '/api/airotrack': {
        target: process.env.AIROTRACK_API_URL || 'https://login.airotrack.in:8082',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/airotrack/, '/api'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Add authentication headers for AiroTrack API
            const username = process.env.AIROTRACK_USERNAME || '9934049403';
            const password = process.env.AIROTRACK_PASSWORD || '123456';
            const credentials = Buffer.from(`${username}:${password}`).toString('base64');
            proxyReq.setHeader('Authorization', `Basic ${credentials}`);
            proxyReq.setHeader('Content-Type', 'application/json');
            
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})
