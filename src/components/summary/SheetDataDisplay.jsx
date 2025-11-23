import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import summaryService from "../../services/summaryService";
import HeaderCell from "./HeaderCell";
import DataRow from "./DataRow";
import DataModal from "./DataModal";
import ColumnSelector from "./ColumnSelector";
import ExcelUploadButton from "./ExcelUploadButton";

const SheetDataDisplay = ({
  sheetNames,
  selectedSheet,
  onSheetChange,
  refreshData,
}) => {
  const [sheetData, setSheetData] = useState([]);
  const [searchFilters, setSearchFilters] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [visibleHeaders, setVisibleHeaders] = useState([]);
  const [columnWidths, setColumnWidths] = useState({});

  useEffect(() => {
    if (selectedSheet) {
      summaryService.getSheetData(selectedSheet).then((data) => {
        setSheetData(data.data || []);
      });
    }
  }, [selectedSheet]);

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
          defaultWidths[header] = 200;
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
        const cellValue = item.rowData[key]?.toString().toLowerCase() || "";
        return cellValue.includes(value.toLowerCase());
      })
    );
  }, [sheetData, searchFilters]);

  const handleSearch = (header, value) => {
    setSearchFilters((prev) => ({
      ...prev,
      [header]: value,
    }));
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
    if (selectedSheet) {
      summaryService.getSheetData(selectedSheet).then((data) => {
        setSheetData(data.data || []);
      });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Select
          value={selectedSheet || ""}
          onChange={(e) => onSheetChange(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          {sheetNames?.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>

        <Button
          variant="contained"
          startIcon={<Add />}
          size="small"
          onClick={handleAddNew}
        >
          Add New
        </Button>

        <ExcelUploadButton
          selectedSheet={selectedSheet}
          expectedHeaders={headers}
          onUploadComplete={handleSuccess}
        />
      </Box>

      {/* Column Selector */}
      <ColumnSelector
        headers={headers}
        selectedSheet={selectedSheet}
        onVisibleHeadersChange={setVisibleHeaders}
      />
      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{ maxWidth: "100%", overflow: "auto" }}
      >
        <Table
          size="small"
          sx={{
            minWidth: 800,
            tableLayout: "fixed",
            "& .MuiTableCell-root": {
              borderRight: "1px solid rgba(224, 224, 224, 1)",
            },
            "& .MuiTableCell-root:last-child": {
              borderRight: "none",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <HeaderCell
                label="Row #"
                onSearch={handleSearch}
                searchValue={searchFilters["Row #"] || ""}
                width={80}
                onResize={(newWidth) => handleColumnResize("Row #", newWidth)}
              />
              {visibleHeaders.map((header) => (
                <HeaderCell
                  key={header}
                  label={header}
                  onSearch={handleSearch}
                  searchValue={searchFilters[header] || ""}
                  width={columnWidths[selectedSheet]?.[header] || 200}
                  onResize={(newWidth) => handleColumnResize(header, newWidth)}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((item) => (
              <DataRow
                key={item._id}
                rowNumber={item.rowNumber}
                rowData={item.rowData}
                visibleHeaders={visibleHeaders}
                columnWidths={columnWidths[selectedSheet] || {}}
                onEdit={() => handleEdit(item)}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
    </Box>
  );
};

export default SheetDataDisplay;
