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

const summaryService = {
  getSummary,
  getSheetNames,
  getSheetData,
};

export default summaryService;
