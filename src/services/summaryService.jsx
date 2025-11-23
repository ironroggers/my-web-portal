import { SUMMARY_URL } from "../API/api-keys.jsx";

const getSummary = async () => {
  try {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary`);
    return response.json();
  } catch (error) {
    console.error("Error fetching summary:", error);
    throw error;
  }
};

// Alias for computed/aggregated summary used by analytics dashboards
const getComputedSummary = async () => {
  return getSummary();
};

const getSheetNames = async () => {
  try {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/sheets`);
    return response.json();
  } catch (error) {
    console.error("Error fetching sheet names:", error);
    throw error;
  }
};

const getSheetData = async (sheetName) => {
  try {
    const response = await fetch(
      `${SUMMARY_URL}/api/v1/summary/sheets/${sheetName}`
    );
    return response.json();
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    throw error;
  }
};

const createRecord = async (data) => {
  try {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  } catch (error) {
    console.error("Error creating record:", error);
    throw error;
  }
};

const updateRecord = async (id, data) => {
  try {
    const response = await fetch(
      `${SUMMARY_URL}/api/v1/summary/records/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    return response.json();
  } catch (error) {
    console.error("Error updating record:", error);
    throw error;
  }
};

const createSummaryBulk = async (rows = []) => {
  try {
    const response = await fetch(`${SUMMARY_URL}/api/v1/summary/records/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    return response.json();
  } catch (error) {
    console.error("Error creating summary bulk:", error);
    throw error;
  }
};

const deleteSummarySheet = async (sheetName) => {
  if (!sheetName) {
    throw new Error("sheetName is required to delete sheet data.");
  }

  const encodedSheetName = encodeURIComponent(sheetName);
  try {
    const response = await fetch(
      `${SUMMARY_URL}/api/v1/summary/sheets/${encodedSheetName}`,
      { method: "DELETE" }
    );
    return response.json();
  } catch (error) {
    console.error("Error deleting sheet data:", error);
    throw error;
  }
};

const summaryService = {
  getSummary,
  getComputedSummary,
  getSheetNames,
  getSheetData,
  createRecord,
  updateRecord,
  createSummaryBulk,
  deleteSummarySheet,
};

export default summaryService;
