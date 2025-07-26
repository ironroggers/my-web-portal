# My Web Portal - FRT Tracking System

A React web application with vehicle tracking capabilities powered by the AiroTrack API. This application includes a proxy server to bypass CORS restrictions when accessing third-party APIs.

## Features

- Real-time vehicle tracking with map visualization
- Vehicle status monitoring (Running, Stopped, Idle, No Data)
- Interactive map with custom vehicle icons
- Vehicle statistics dashboard
- Fullscreen map view
- Auto-refresh functionality

## Architecture

### Frontend
- React 19 with Vite
- Material-UI for components
- Leaflet for mapping
- React Leaflet for map integration

### Backend Proxy
- Express.js proxy server
- CORS bypass for AiroTrack API
- Basic authentication handling
- Static file serving

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development Mode
```bash
npm run dev
```
This starts the Vite development server with proxy configuration for the AiroTrack API.

### Build for Production
```bash
npm run build
```

### Production Server
```bash
npm start
```
This starts the Express.js server that serves the built React app and provides API proxy functionality.

## API Configuration

The application connects to the AiroTrack API via proxy to avoid CORS issues:

- **Development**: Uses Vite proxy configuration
- **Production**: Uses Express.js proxy server

### Environment Variables (Optional)
You can override the default API configuration using environment variables:

```bash
AIROTRACK_API_URL=https://login.airotrack.in:8082/api
AIROTRACK_USERNAME=your_username
AIROTRACK_PASSWORD=your_password
PORT=3000
```

## Deployment

### Using Docker
```bash
docker build -t my-web-portal .
docker run -p 3000:3000 my-web-portal
```

### Using Render.com
The application is configured for deployment on Render using the included `render.yaml` configuration.

### Health Check
Once deployed, you can check the server status at:
```
GET /health
```

## API Endpoints

### Proxy Endpoints
- `GET /api/airotrack/positions` - Vehicle positions (proxied to AiroTrack API)

### Application Endpoints  
- `GET /health` - Server health check
- `GET /*` - React app routes (SPA routing)

## Troubleshooting

### CORS Issues
If you encounter CORS issues:
1. Ensure the proxy server is running
2. Check that requests are going to `/api/airotrack/` endpoints
3. Verify the AiroTrack API credentials are correct

### Development Issues
- Clear browser cache if you see old API behavior
- Check browser developer tools for network errors
- Verify Vite proxy configuration in `vite.config.js`

### Production Issues
- Check Express server logs for proxy errors
- Ensure environment variables are set correctly
- Verify the built files are in the `dist` directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both development and production modes
5. Submit a pull request

## License

This project is private and proprietary.
