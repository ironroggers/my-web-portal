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
export const extractHeaders = (excelData) => {
  if (!excelData || excelData.length === 0) {
    return [];
  }
  return excelData[0].map((header) => String(header).trim());
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

  const isValid = missingHeaders.length === 0 && extraHeaders.length === 0;

  if (!isValid) {
    let errorMessage = "Header mismatch detected:\n\n";
    
    if (missingHeaders.length > 0) {
      errorMessage += `Missing headers: ${missingHeaders.join(", ")}\n`;
    }
    
    if (extraHeaders.length > 0) {
      errorMessage += `Extra headers: ${extraHeaders.join(", ")}\n`;
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
    extraHeaders: [],
  };
};

