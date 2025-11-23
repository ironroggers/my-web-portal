import React, { useRef, useState } from "react";
import { Button } from "@mui/material";
import { UploadFile } from "@mui/icons-material";
import { useExcelUpload } from "../../hooks/useExcelUpload";
import summaryService from "../../services/summaryService";
import { convertExcelDataToRows } from "../../utils/excelUtils";
import ConfirmUploadDialog from "./dialogs/ConfirmUploadDialog";
import ErrorDialog from "./dialogs/ErrorDialog";

const BULK_BATCH_SIZE = 100; // Avoid overloading the API with massive payloads

const ExcelUploadButton = ({
  selectedSheet,
  expectedHeaders,
  onUploadComplete,
}) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
  });

  const chunkRows = (rows, size) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < rows.length; i += size) {
      chunks.push(rows.slice(i, i + size));
    }
    return chunks;
  };

  const handleBulkUpload = async ({
    excelData,
    headers,
    serialColumnIgnored,
  }) => {
    if (!selectedSheet) {
      throw new Error("Please select a sheet before uploading an Excel file.");
    }

    const rows = convertExcelDataToRows({
      excelData,
      headers,
      sheetName: selectedSheet,
      serialColumnIgnored,
    });

    if (!rows.length) {
      throw new Error("No valid rows found in the uploaded Excel file.");
    }

    setIsUploading(true);

    try {
      const deleteResponse = await summaryService.deleteSummarySheet(
        selectedSheet
      );

      if (deleteResponse?.success === false) {
        throw new Error(
          deleteResponse?.message ||
            "Unable to delete existing sheet data before upload."
        );
      }

      const batches = chunkRows(rows, BULK_BATCH_SIZE);
      setUploadProgress({ current: 0, total: batches.length });

      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index];
        const createResponse = await summaryService.createSummaryBulk(batch);

        if (createResponse?.success === false) {
          throw new Error(
            createResponse?.message ||
              `Unable to upload batch ${index + 1} of ${batches.length}.`
          );
        }

        setUploadProgress({
          current: index + 1,
          total: batches.length,
        });
      }

      if (onUploadComplete) {
        await onUploadComplete();
      }
    } catch (error) {
      throw new Error(
        error?.message ||
          "An unexpected error occurred while processing the Excel upload."
      );
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const {
    confirmDialog,
    errorDialog,
    openConfirmDialog,
    closeConfirmDialog,
    closeErrorDialog,
    processFile,
  } = useExcelUpload({
    expectedHeaders,
    onSuccess: handleBulkUpload,
  });

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      openConfirmDialog(file);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <Button
        variant="contained"
        startIcon={<UploadFile />}
        size="small"
        onClick={handleButtonClick}
        color="primary"
        disabled={!selectedSheet || isUploading}
      >
        {isUploading && uploadProgress.total > 0
          ? `Uploading ${uploadProgress.current}/${uploadProgress.total}`
          : "Upload Excel"}
      </Button>

      <ConfirmUploadDialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        onConfirm={processFile}
        sheetName={selectedSheet}
      />

      <ErrorDialog
        open={errorDialog.open}
        onClose={closeErrorDialog}
        message={errorDialog.message}
      />
    </>
  );
};

export default ExcelUploadButton;
