import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  LinearProgress,
  MenuItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import summaryService from "../../services/summaryService";
import { formatNumber } from "../../utils/formatNumber";
import HeaderCell from "./HeaderCell";
import DataRow, { ROW_NUMBER_WIDTH } from "./DataRow";
import DataModal from "./DataModal";
import ColumnSelector from "./ColumnSelector";
import ExcelUploadButton from "./ExcelUploadButton";

const ROW_NUMBER_COLUMN = "Row #";
const DEFAULT_COLUMN_WIDTH = 200;
const ROWS_PER_PAGE_OPTIONS = [50, 100, 250, { label: "All", value: -1 }];

const SheetDataDisplay = ({
  sheetNames,
  selectedSheet,
  onSheetChange,
  refreshData,
}) => {
  const [sheetData, setSheetData] = useState([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState(null);
  const [searchFilters, setSearchFilters] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [visibleHeaders, setVisibleHeaders] = useState([]);
  const [columnWidths, setColumnWidths] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  // Sheet whose data should be shown; responses for other sheets are ignored
  const activeSheet = useRef(selectedSheet);

  const loadSheet = useCallback((sheetName) => {
    activeSheet.current = sheetName;
    setLoadingSheet(true);
    setSheetError(null);
    summaryService
      .getSheetData(sheetName)
      .then((data) => {
        if (activeSheet.current === sheetName) setSheetData(data.data || []);
      })
      .catch(() => {
        if (activeSheet.current === sheetName) setSheetError(`Could not load the "${sheetName}" sheet.`);
      })
      .finally(() => {
        if (activeSheet.current === sheetName) setLoadingSheet(false);
      });
  }, []);

  useEffect(() => {
    if (selectedSheet) {
      // Filters and paging belong to the previous sheet's columns
      setSheetData([]);
      setSearchFilters({});
      setPage(0);
      loadSheet(selectedSheet);
    }
  }, [selectedSheet, loadSheet]);

  // Get headers from first row
  const headers = useMemo(() => {
    if (!sheetData.length) return [];
    return Object.keys(sheetData[0].rowData);
  }, [sheetData]);

  // Initialize column widths when sheet data changes
  useEffect(() => {
    if (headers.length > 0 && selectedSheet) {
      // Initialize column widths
      const savedColumnWidths = localStorage.getItem(
        `columnWidths_${selectedSheet}`
      );
      if (savedColumnWidths) {
        setColumnWidths((prev) => ({
          ...prev,
          [selectedSheet]: JSON.parse(savedColumnWidths),
        }));
      } else {
        // Default widths: 80px for row number, 200px for data columns
        const defaultWidths = {};
        headers.forEach((header) => {
          defaultWidths[header] = DEFAULT_COLUMN_WIDTH;
        });
        setColumnWidths((prev) => ({
          ...prev,
          [selectedSheet]: defaultWidths,
        }));
      }
    }
  }, [headers, selectedSheet]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!Object.keys(searchFilters).length) return sheetData;

    return sheetData.filter((item) =>
      Object.entries(searchFilters).every(([key, value]) => {
        if (!value) return true;
        const rawValue = key === ROW_NUMBER_COLUMN ? item.rowNumber : item.rowData[key];
        const cellValue = rawValue?.toString().toLowerCase() || "";
        return cellValue.includes(value.toLowerCase());
      })
    );
  }, [sheetData, searchFilters]);

  const pagedData = useMemo(
    () => (rowsPerPage === -1 ? filteredData : filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage)),
    [filteredData, page, rowsPerPage]
  );

  // Columns chosen in the selector that exist in the current sheet
  const displayedHeaders = useMemo(
    () => visibleHeaders.filter((header) => headers.includes(header)),
    [visibleHeaders, headers]
  );

  const activeFilters = Object.entries(searchFilters).filter(([, value]) => value);

  const handleSearch = (header, value) => {
    setSearchFilters((prev) => ({
      ...prev,
      [header]: value,
    }));
    setPage(0);
  };

  const clearFilters = () => {
    setSearchFilters({});
    setPage(0);
  };

  const handleColumnResize = (columnName, newWidth) => {
    const clampedWidth = Math.max(80, Math.min(500, newWidth)); // Min 80px, Max 500px
    setColumnWidths((prev) => ({
      ...prev,
      [selectedSheet]: {
        ...prev[selectedSheet],
        [columnName]: clampedWidth,
      },
    }));
    // Save to localStorage
    localStorage.setItem(
      `columnWidths_${selectedSheet}`,
      JSON.stringify({
        ...columnWidths[selectedSheet],
        [columnName]: clampedWidth,
      })
    );
  };

  // Calculate next row number
  const nextRowNumber = useMemo(() => {
    if (!sheetData.length) return 1;
    const maxRowNumber = Math.max(
      ...sheetData.map((item) => item.rowNumber || 0)
    );
    return maxRowNumber + 1;
  }, [sheetData]);

  const handleAddNew = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditData(item);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditData(null);
  };

  const handleSuccess = () => {
    // Refresh data after successful create/update
    refreshData?.();
    if (selectedSheet) loadSheet(selectedSheet);
  };

  const totalColumns = displayedHeaders.length + 1;
  const isInitialLoad = loadingSheet && sheetData.length === 0;

  const recordSummary = isInitialLoad
    ? "Loading records…"
    : activeFilters.length
      ? `${formatNumber(filteredData.length)} of ${formatNumber(sheetData.length)} records`
      : `${formatNumber(sheetData.length)} records`;

  return (
    <Card>
      {/* Toolbar */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "center",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <TextField
          select
          size="small"
          label="Data sheet"
          value={selectedSheet || ""}
          onChange={(e) => onSheetChange(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          {sheetNames?.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>

        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {recordSummary}
          {!isInitialLoad && sheetData.length > 0 && " · click a row to edit"}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <ColumnSelector
          headers={headers}
          selectedSheet={selectedSheet}
          onVisibleHeadersChange={setVisibleHeaders}
        />

        <ExcelUploadButton
          selectedSheet={selectedSheet}
          expectedHeaders={headers}
          onUploadComplete={handleSuccess}
        />

        <Button
          variant="contained"
          startIcon={<Add />}
          size="small"
          onClick={handleAddNew}
        >
          Add record
        </Button>
      </Box>

      {/* Active column filters */}
      {activeFilters.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            Filtered by
          </Typography>
          {activeFilters.map(([column, value]) => (
            <Chip
              key={column}
              size="small"
              label={`${column}: ${value}`}
              onDelete={() => handleSearch(column, "")}
              sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider" }}
            />
          ))}
          <Button size="small" onClick={clearFilters}>
            Clear all
          </Button>
        </Box>
      )}

      <Box sx={{ height: 2 }}>
        {loadingSheet && !isInitialLoad && <LinearProgress sx={{ height: 2, borderRadius: 0 }} />}
      </Box>

      {sheetError && (
        <Alert severity="error" sx={{ m: 2 }} action={<Button color="inherit" size="small" onClick={() => loadSheet(selectedSheet)}>Retry</Button>}>
          {sheetError}
        </Alert>
      )}

      {/* Table */}
      <TableContainer sx={{ maxHeight: "calc(100vh - 300px)", minHeight: 240 }}>
        <Table
          stickyHeader
          size="small"
          sx={{
            minWidth: 800,
            tableLayout: "fixed",
            "& .MuiTableCell-root": {
              borderRight: 1,
              borderRightColor: "divider",
            },
            "& .MuiTableCell-root:last-child": {
              borderRight: "none",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <HeaderCell
                label={ROW_NUMBER_COLUMN}
                onSearch={handleSearch}
                searchValue={searchFilters[ROW_NUMBER_COLUMN] || ""}
                width={ROW_NUMBER_WIDTH}
              />
              {displayedHeaders.map((header) => (
                <HeaderCell
                  key={header}
                  label={header}
                  onSearch={handleSearch}
                  searchValue={searchFilters[header] || ""}
                  width={columnWidths[selectedSheet]?.[header] || DEFAULT_COLUMN_WIDTH}
                  onResize={(newWidth) => handleColumnResize(header, newWidth)}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isInitialLoad ? (
              Array.from({ length: 8 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={Math.max(totalColumns, 2)}>
                    <Skeleton variant="text" />
                  </TableCell>
                </TableRow>
              ))
            ) : pagedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalColumns} sx={{ py: 6, textAlign: "center", borderBottom: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {activeFilters.length ? "No records match these filters" : "This sheet has no records yet"}
                  </Typography>
                  {activeFilters.length > 0 && (
                    <Button size="small" onClick={clearFilters} sx={{ mt: 1 }}>
                      Clear filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pagedData.map((item) => (
                <DataRow
                  key={item._id}
                  rowNumber={item.rowNumber}
                  rowData={item.rowData}
                  visibleHeaders={displayedHeaders}
                  columnWidths={columnWidths[selectedSheet] || {}}
                  onEdit={() => handleEdit(item)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredData.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${formatNumber(count)}`}
        sx={{ borderTop: 1, borderColor: "divider" }}
      />

      {/* Modal */}
      <DataModal
        open={modalOpen}
        onClose={handleModalClose}
        editData={editData}
        sheetName={selectedSheet}
        headers={headers}
        onSuccess={handleSuccess}
        nextRowNumber={nextRowNumber}
      />
    </Card>
  );
};

export default SheetDataDisplay;
