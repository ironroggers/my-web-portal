import { useState } from "react";
import {
  readExcelFile,
  extractHeaders,
  validateHeaders,
  sanitizeFileHeaders,
} from "../utils/excelUtils";

/**
 * Custom hook for handling Excel file uploads with validation
 * @param {Object} params - Hook parameters
 * @param {Array<string>} params.expectedHeaders - Expected headers from the sheet
 * @param {Function} params.onSuccess - Callback when upload is successful
 * @returns {Object} Hook state and handlers
 */
export const useExcelUpload = ({ expectedHeaders, onSuccess }) => {
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    file: null,
  });
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    message: "",
  });

  const openConfirmDialog = (file) => {
    setConfirmDialog({
      open: true,
      file: file,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      file: null,
    });
  };

  const openErrorDialog = (message) => {
    setErrorDialog({
      open: true,
      message: message,
    });
  };

  const closeErrorDialog = () => {
    setErrorDialog({
      open: false,
      message: "",
    });
  };

  const processFile = async () => {
    const file = confirmDialog.file;
    closeConfirmDialog();

    if (!file) {
      return;
    }

    let excelData;

    try {
      excelData = await readExcelFile(file);
    } catch (error) {
      console.error("Error reading Excel file:", error);
      openErrorDialog(`Error reading Excel file: ${error.message}`);
      return;
    }

    if (!excelData.length) {
      openErrorDialog("The selected Excel file is empty.");
      return;
    }

    // Extract and validate headers
    const fileHeaders = extractHeaders(excelData);
    const { headers: sanitizedHeaders, serialColumnIgnored } =
      sanitizeFileHeaders(fileHeaders);
    const validation = validateHeaders(sanitizedHeaders, expectedHeaders);

    if (!validation.isValid) {
      openErrorDialog(validation.error);
      return;
    }

    if (onSuccess) {
      try {
        await onSuccess({
          excelData,
          headers: sanitizedHeaders,
          serialColumnIgnored,
        });
      } catch (error) {
        console.error("Error processing Excel upload:", error);
        openErrorDialog(error.message || "Failed to process Excel upload.");
      }
    }
  };

  return {
    confirmDialog,
    errorDialog,
    openConfirmDialog,
    closeConfirmDialog,
    openErrorDialog,
    closeErrorDialog,
    processFile,
  };
};
