import { SURVEY_URL } from '../API/api-keys.jsx';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

// Helper function to create headers
const createHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  };
};

// Helper function to handle API response
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Survey Service API
const surveyService = {
  // Get all surveys with filtering
  async getSurveys(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const url = `${SURVEY_URL}/api/surveys${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: createHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
  },

  // Get survey by ID
  async getSurveyById(id) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys/${id}`, {
        method: 'GET',
        headers: createHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching survey:', error);
      throw error;
    }
  },

  // Get surveys by location
  async getSurveysByLocation(locationId, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const url = `${SURVEY_URL}/api/surveys/location/${locationId}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: createHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching surveys by location:', error);
      throw error;
    }
  },

  // Get surveys by type
  async getSurveysByType(surveyType, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const url = `${SURVEY_URL}/api/surveys/type/${surveyType}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: createHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching surveys by type:', error);
      throw error;
    }
  },

  // Get survey statistics
  async getSurveyStats(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const url = `${SURVEY_URL}/api/surveys/stats${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: createHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      throw error;
    }
  },

  // Create new survey
  async createSurvey(surveyData) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(surveyData)
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error creating survey:', error);
      throw error;
    }
  },

  // Update survey
  async updateSurvey(id, updateData) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys/${id}`, {
        method: 'PUT',
        headers: createHeaders(),
        body: JSON.stringify(updateData)
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating survey:', error);
      throw error;
    }
  },

  // Delete survey (soft delete)
  async deleteSurvey(id, updatedBy) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys/${id}`, {
        method: 'DELETE',
        headers: createHeaders(),
        body: JSON.stringify({ updatedBy })
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error deleting survey:', error);
      throw error;
    }
  },

  // Update survey status
  async updateSurveyStatus(id, status, updatedBy) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys/${id}/status`, {
        method: 'PATCH',
        headers: createHeaders(),
        body: JSON.stringify({ status, updatedBy })
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating survey status:', error);
      throw error;
    }
  },

  // Add media file to survey
  async addMediaFile(id, mediaFileData) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys/${id}/media`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(mediaFileData)
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error adding media file:', error);
      throw error;
    }
  },

  // Remove media file from survey
  async removeMediaFile(id, mediaId) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys/${id}/media/${mediaId}`, {
        method: 'DELETE',
        headers: createHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error removing media file:', error);
      throw error;
    }
  },

  // Add field to survey
  async addField(id, fieldData) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys/${id}/fields`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(fieldData)
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error adding field:', error);
      throw error;
    }
  },

  // Update field in survey
  async updateField(id, fieldId, updateData) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys/${id}/fields/${fieldId}`, {
        method: 'PUT',
        headers: createHeaders(),
        body: JSON.stringify(updateData)
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating field:', error);
      throw error;
    }
  },

  // Remove field from survey
  async removeField(id, fieldId) {
    try {
      const response = await fetch(`${SURVEY_URL}/api/surveys/${id}/fields/${fieldId}`, {
        method: 'DELETE',
        headers: createHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error removing field:', error);
      throw error;
    }
  }
};

export default surveyService; 