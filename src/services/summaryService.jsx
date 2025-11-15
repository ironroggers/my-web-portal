import { SUMMARY_URL } from '../API/api-keys.jsx';

const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

const createHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error?.message || errorData?.message || `HTTP ${response.status}`);
  }
  return response.json();
};

const summaryService = {
  async getSheets() {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/sheets`, {
      method: 'GET',
      headers: createHeaders(),
      cache: 'no-store'
    });
    return handleResponse(response);
  },

  async getSheetData(sheetName) {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/sheets/${encodeURIComponent(sheetName)}`, {
      method: 'GET',
      headers: createHeaders(),
      cache: 'no-store'
    });
    return handleResponse(response);
  },

  async listRecords({ sheetName, page = 1, limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (sheetName) params.append('sheetName', sheetName);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/records${query}`, {
      method: 'GET',
      headers: createHeaders(),
      cache: 'no-store'
    });
    return handleResponse(response);
  },

  async createRecord({ sheetName, rowData, rowNumber, others }) {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/records`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ sheetName, rowData, rowNumber, others })
    });
    return handleResponse(response);
  },

  async getRecord(id) {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/records/${id}`, {
      method: 'GET',
      headers: createHeaders()
    });
    return handleResponse(response);
  },

  async updateRecord(id, updateData) {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/records/${id}`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(response);
  },

  async deleteRecord(id) {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/records/${id}`, {
      method: 'DELETE',
      headers: createHeaders()
    });
    return handleResponse(response);
  },

  async getComputedSummary() {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary`, {
      method: 'GET',
      headers: createHeaders()
    });
    return handleResponse(response);
  }
};

export default summaryService;

