import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import * as XLSX from "xlsx";
import summaryService from "../../services/summaryService";
import ErrorDialog from "./dialogs/ErrorDialog";

// Excel sheet names: at most 31 characters, none of : \ / ? * [ ], and unique in a workbook
const workbookSheetName = (name, taken = new Set()) => {
  const base = String(name || "Sheet").replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Sheet";
  let candidate = base;
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) candidate = `${base.slice(0, 31 - String(n).length - 1)} ${n}`;
  taken.add(candidate.toLowerCase());
  return candidate;
};
const fileSafe = (name) => String(name || "sheet").replace(/[^a-z0-9_-]+/gi, "_");
const today = () => new Date().toISOString().slice(0, 10);

// The layout Upload Excel reads: one header row with the sheet's columns, then a row per
// record in row-number order. Columns are those of the first record, as the table shows them.
const sheetRows = (rows, headers = Object.keys(rows[0]?.rowData || {})) => {
  const ordered = [...rows].sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
  return headers.length ? [headers, ...ordered.map((row) => headers.map((header) => row.rowData?.[header] ?? ""))] : [];
};

/**
 * Downloads the whole sheet as Excel in the layout Upload Excel reads. Filters don't apply, so
 * the file can be edited and uploaded back to replace the sheet.
 */
const ExcelDownloadButton = ({ selectedSheet, headers, rows }) => {
  const handleDownload = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheetRows(rows, headers)), workbookSheetName(selectedSheet));
    XLSX.writeFile(workbook, `${fileSafe(selectedSheet)}_${today()}.xlsx`);
  };

  return (
    <Button variant="outlined" startIcon={<FileDownloadOutlined />} size="small" onClick={handleDownload} color="primary" disabled={!selectedSheet || !rows.length}>
      Download Excel
    </Button>
  );
};

/**
 * Downloads every sheet into one workbook, a tab per sheet in the order of the sheet list,
 * each in the same layout as Download Excel. A sheet with no records is an empty tab.
 */
export const ExcelDownloadAllButton = ({ sheetNames = [] }) => {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    try {
      setProgress({ current: 0, total: sheetNames.length });
      const workbook = XLSX.utils.book_new();
      const taken = new Set();
      for (const [index, name] of sheetNames.entries()) {
        const response = await summaryService.getSheetData(name);
        if (response?.success === false) throw new Error(response?.message || `Could not load the "${name}" sheet.`);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheetRows(response?.data || [])), workbookSheetName(name, taken));
        setProgress({ current: index + 1, total: sheetNames.length });
      }
      XLSX.writeFile(workbook, `summary_all_sheets_${today()}.xlsx`);
    } catch (e) {
      setError(e?.message || "Could not download the sheets.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={progress ? <CircularProgress size={14} color="inherit" /> : <FileDownloadOutlined />}
        size="small"
        onClick={handleDownload}
        color="primary"
        disabled={!sheetNames.length || Boolean(progress)}
      >
        {progress ? `Downloading ${progress.current}/${progress.total}` : "Download all sheets"}
      </Button>
      <ErrorDialog open={Boolean(error)} onClose={() => setError("")} message={error} />
    </>
  );
};

export default ExcelDownloadButton;
