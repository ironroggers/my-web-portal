import * as XLSX from "xlsx";

/**
 * Reads an Excel file and returns the data from the first sheet
 * @param {File} file - The Excel file to read
 * @returns {Promise<Array>} Array of rows, where first row contains headers
 */
export const readExcelFile = async (file) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);

  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  return jsonData;
};

/**
 * Extracts headers from Excel data
 * @param {Array} excelData - Array of rows from Excel file
 * @returns {Array<string>} Array of header strings
 */
const cleanHeaderValue = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
};

export const extractHeaders = (excelData) => {
  if (!excelData || excelData.length === 0) {
    return [];
  }
  return excelData[0].map((header) => cleanHeaderValue(header));
};

/**
 * Validates if file headers match expected headers
 * @param {Array<string>} fileHeaders - Headers from the uploaded file
 * @param {Array<string>} expectedHeaders - Expected headers from the sheet
 * @returns {Object} Validation result with isValid, missingHeaders, and extraHeaders
 */
export const validateHeaders = (fileHeaders, expectedHeaders) => {
  if (!expectedHeaders || expectedHeaders.length === 0) {
    return {
      isValid: false,
      error: "Please select a sheet first before uploading an Excel file.",
      missingHeaders: [],
      extraHeaders: [],
    };
  }

  const missingHeaders = expectedHeaders.filter(
    (header) => !fileHeaders.includes(header)
  );

  const extraHeaders = fileHeaders.filter(
    (header) => !expectedHeaders.includes(header)
  );

  const isValid = missingHeaders.length === 0;

  if (!isValid) {
    let errorMessage = "Header mismatch detected:\n\n";

    if (missingHeaders.length > 0) {
      errorMessage += `Missing headers: ${missingHeaders.join(", ")}\n`;
    }
    errorMessage += `\nExpected headers: ${expectedHeaders.join(", ")}`;

    return {
      isValid: false,
      error: errorMessage,
      missingHeaders,
      extraHeaders,
    };
  }

  return {
    isValid: true,
    error: null,
    missingHeaders: [],
    extraHeaders,
  };
};

const SERIAL_HEADER_KEYWORDS = [
  "sno",
  "snumber",
  "snum",
  "serial",
  "serialno",
  "serialnumber",
  "srno",
  "slno",
  "sl",
];

const normalizeHeaderText = (header = "") =>
  String(header)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isSerialHeader = (header) =>
  SERIAL_HEADER_KEYWORDS.includes(normalizeHeaderText(header));

/**
 * Removes serial number column from header list if present
 * @param {Array<string>} headers
 * @returns {{ headers: Array<string>, serialColumnIgnored: boolean }}
 */
export const sanitizeFileHeaders = (headers = []) => {
  if (!headers.length) {
    return { headers: [], serialColumnIgnored: false };
  }

  if (isSerialHeader(headers[0])) {
    return { headers: headers.slice(1), serialColumnIgnored: true };
  }

  return { headers, serialColumnIgnored: false };
};

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  return true;
};

/**
 * Converts excel rows into API-ready bulk payload
 * @param {Object} params
 * @param {Array<Array>} params.excelData
 * @param {Array<string>} params.headers
 * @param {string} params.sheetName
 * @param {boolean} params.serialColumnIgnored
 * @returns {Array<Object>}
 */
export const convertExcelDataToRows = ({
  excelData = [],
  headers = [],
  sheetName,
  serialColumnIgnored = false,
}) => {
  if (!excelData.length || !headers.length || !sheetName) {
    return [];
  }

  const dataRows = excelData.slice(1); // Skip header row

  return dataRows
    .map((row = [], index) => {
      const rowData = {};

      headers.forEach((header, headerIndex) => {
        const sourceIndex = serialColumnIgnored ? headerIndex + 1 : headerIndex;
        rowData[header] =
          row[sourceIndex] !== undefined && row[sourceIndex] !== null
            ? row[sourceIndex]
            : "";
      });

      const hasValues = Object.values(rowData).some(hasMeaningfulValue);

      if (!hasValues) {
        return null;
      }

      return {
        sheetName,
        rowNumber: index + 1,
        rowData,
      };
    })
    .filter(Boolean);
};
