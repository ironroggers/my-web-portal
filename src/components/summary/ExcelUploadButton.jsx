import React, { useRef } from "react";
import { Button } from "@mui/material";
import { UploadFile } from "@mui/icons-material";
import { useExcelUpload } from "../../hooks/useExcelUpload";
import ConfirmUploadDialog from "./dialogs/ConfirmUploadDialog";
import ErrorDialog from "./dialogs/ErrorDialog";

const ExcelUploadButton = ({ selectedSheet, expectedHeaders }) => {
  const fileInputRef = useRef(null);

  const {
    confirmDialog,
    errorDialog,
    openConfirmDialog,
    closeConfirmDialog,
    closeErrorDialog,
    processFile,
  } = useExcelUpload({
    expectedHeaders,
    onSuccess: (excelData, fileHeaders) => {
      // TODO: Add upload logic here in next iteration
      console.log("Upload successful!");
      console.log("Data:", excelData);
      console.log("Headers:", fileHeaders);
    },
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
        disabled={!selectedSheet}
      >
        Upload Excel
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
