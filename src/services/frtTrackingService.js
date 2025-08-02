// FRT Tracking Service
// Handles API calls to the AiroTrack vehicle tracking system via proxy

const API_CONFIG = {
  // Always use the proxy endpoint to avoid CORS issues
  baseUrl: '/api/airotrack',
  endpoints: {
    positions: '/positions'
  }
};

/**
 * Fetch vehicle positions from AiroTrack API via proxy
 * @param {Object} params - Query parameters
 * @param {boolean} params.includeInvalidVehicles - Whether to include vehicles with invalid data (default: false)
 * @returns {Promise<Array>} Array of vehicle position data
 */
export const fetchVehiclePositions = async (params = {}) => {
  const { includeInvalidVehicles = false, ...apiParams } = params;
  
  const defaultParams = {
    status: 'ALL',
    isAddressRequired: false,
    limit: 80,
    offset: 0,
    ...apiParams
  };

  // Build query string
  const queryString = new URLSearchParams(defaultParams).toString();
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.positions}?${queryString}`;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    console.log(`Fetching vehicle data from proxy: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.length} vehicles via proxy`);
    
    // Filter and validate vehicle data based on the includeInvalidVehicles flag
    return includeInvalidVehicles ? filterAllVehicles(data) : filterValidVehicles(data);
  } catch (error) {
    console.error('Error fetching vehicle positions via proxy:', error);
    throw new Error(`Failed to fetch vehicle data: ${error.message}`);
  }
};

/**
 * Filter all vehicles with minimal validation (for showing all statuses)
 * @param {Array} vehicles - Raw vehicle data from API
 * @returns {Array} All vehicles with basic data structure validation
 */
const filterAllVehicles = (vehicles) => {
  if (!Array.isArray(vehicles)) {
    return [];
  }

  return vehicles.filter(vehicle => {
    // Only check for basic required fields, allow invalid coordinates and data
    return vehicle && 
           typeof vehicle === 'object' && 
           vehicle.deviceId && 
           vehicle.name;
  });
};

/**
 * Filter vehicles with valid position data (original function)
 * @param {Array} vehicles - Raw vehicle data from API
 * @returns {Array} Filtered vehicles with valid coordinates
 */
const filterValidVehicles = (vehicles) => {
  if (!Array.isArray(vehicles)) {
    return [];
  }

  return vehicles.filter(vehicle => {
    // Check for valid coordinates
    const hasValidCoordinates = 
      vehicle.latitude && 
      vehicle.longitude && 
      vehicle.latitude !== 0 && 
      vehicle.longitude !== 0 &&
      typeof vehicle.latitude === 'number' &&
      typeof vehicle.longitude === 'number';

    // Check if vehicle data is valid (not explicitly marked as invalid)
    const isValidData = vehicle.valid !== false;

    return hasValidCoordinates && isValidData;
  });
};

/**
 * Get vehicle statistics
 * @param {Array} vehicles - Array of vehicle data
 * @returns {Object} Vehicle statistics
 */
export const getVehicleStatistics = (vehicles) => {
  if (!Array.isArray(vehicles)) {
    return {
      total: 0,
      running: 0,
      stopped: 0,
      idle: 0,
      noData: 0,
      offline: 0,
      unknown: 0
    };
  }

  return vehicles.reduce((stats, vehicle) => {
    stats.total++;
    
    // Handle different status values more robustly
    const status = vehicle.status ? vehicle.status.toUpperCase() : 'UNKNOWN';
    
    switch (status) {
      case 'RUNNING':
      case 'MOVING':
        stats.running++;
        break;
      case 'STOPPED':
      case 'PARKED':
        stats.stopped++;
        break;
      case 'IDLE':
      case 'IDLING':
        stats.idle++;
        break;
      case 'NO_DATA':
      case 'NODATA':
        stats.noData++;
        break;
      case 'OFFLINE':
        stats.offline++;
        break;
      case 'UNKNOWN':
      case '':
      case null:
      case undefined:
        stats.unknown++;
        break;
      default:
        // Count any other unknown statuses as unknown
        stats.unknown++;
    }
    
    return stats;
  }, {
    total: 0,
    running: 0,
    stopped: 0,
    idle: 0,
    noData: 0,
    offline: 0,
    unknown: 0
  });
};

/**
 * Fetch all vehicles including those with invalid data (convenience function)
 * @param {Object} params - Query parameters (optional)
 * @returns {Promise<Array>} Array of all vehicle data including invalid vehicles
 */
export const fetchAllVehicles = async (params = {}) => {
  return fetchVehiclePositions({ ...params, includeInvalidVehicles: true });
};

/**
 * Fetch only valid vehicles with coordinates (convenience function)
 * @param {Object} params - Query parameters (optional)
 * @returns {Promise<Array>} Array of valid vehicle data only
 */
export const fetchValidVehicles = async (params = {}) => {
  return fetchVehiclePositions({ ...params, includeInvalidVehicles: false });
};

/**
 * Format vehicle speed for display
 * @param {number} speed - Speed in km/h
 * @returns {string} Formatted speed string
 */
export const formatSpeed = (speed) => {
  if (!speed || speed === 0) {
    return '0 km/h';
  }
  return `${Math.round(speed)} km/h`;
};

/**
 * Format device time for display
 * @param {string} deviceTime - ISO timestamp from device
 * @returns {string} Formatted date/time string
 */
export const formatDeviceTime = (deviceTime) => {
  if (!deviceTime) {
    return 'No data';
  }
  
  try {
    const date = new Date(deviceTime);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleString();
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Get battery level from vehicle attributes
 * @param {Object} attributes - Vehicle attributes object
 * @returns {string|number} Battery level or 'N/A'
 */
export const getBatteryLevel = (attributes) => {
  if (!attributes) {
    return 'N/A';
  }
  
  return attributes.batteryLevel || attributes.power || 'N/A';
};

/**
 * Get distance traveled today
 * @param {Object} attributes - Vehicle attributes object
 * @returns {string} Formatted distance string
 */
export const getDistanceToday = (attributes) => {
  if (!attributes) {
    return '0 m';
  }
  
  const distance = attributes.distanceForday || 0;
  
  if (distance > 1000) {
    return `${(distance / 1000).toFixed(1)} km`;
  }
  
  return `${distance.toFixed(0)} m`;
};

/**
 * Get status color for Material-UI components
 * @param {string} status - Vehicle status
 * @returns {string} Material-UI color name
 */
export const getStatusColor = (status) => {
  if (!status) {
    return 'secondary'; // For null/undefined status
  }
  
  const normalizedStatus = status.toUpperCase();
  
  switch (normalizedStatus) {
    case 'RUNNING':
    case 'MOVING':
      return 'success';
    case 'STOPPED':
    case 'PARKED':
      return 'error';
    case 'IDLE':
    case 'IDLING':
      return 'warning';
    case 'NO_DATA':
    case 'NODATA':
      return 'info';
    case 'OFFLINE':
      return 'default';
    case 'UNKNOWN':
      return 'secondary';
    default:
      return 'secondary'; // For any unknown status
  }
};

/**
 * Check if vehicle data is recent (within last hour)
 * @param {string} deviceTime - ISO timestamp from device
 * @returns {boolean} True if data is recent
 */
export const isDataRecent = (deviceTime) => {
  if (!deviceTime) {
    return false;
  }
  
  try {
    const deviceDate = new Date(deviceTime);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    
    return deviceDate > oneHourAgo;
  } catch (error) {
    return false;
  }
};

export default {
  fetchVehiclePositions,
  getVehicleStatistics,
  formatSpeed,
  formatDeviceTime,
  getBatteryLevel,
  getDistanceToday,
  getStatusColor,
  isDataRecent
}; 