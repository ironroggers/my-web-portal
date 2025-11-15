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

const SheetDataDisplay = ({ sheetNames, selectedSheet, onSheetChange, refreshData }) => {
  const [sheetData, setSheetData] = useState([]);
  const [searchFilters, setSearchFilters] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

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

  // Calculate next row number
  const nextRowNumber = useMemo(() => {
    if (!sheetData.length) return 1;
    const maxRowNumber = Math.max(...sheetData.map(item => item.rowNumber || 0));
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
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
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
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <HeaderCell
                label="Row #"
                onSearch={handleSearch}
                searchValue={searchFilters["Row #"] || ""}
              />
              {headers.map((header) => (
                <HeaderCell
                  key={header}
                  label={header}
                  onSearch={handleSearch}
                  searchValue={searchFilters[header] || ""}
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
