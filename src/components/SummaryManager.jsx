import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  Button,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  InputAdornment,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import TableChartIcon from "@mui/icons-material/TableChart";
import summaryService from "../services/summaryService.jsx";

function tryParseJson(value, fallback = {}) {
  if (typeof value === "object" && value !== null) return value;
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function prettyJson(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

const EmptyState = ({ title, subtitle }) => {
  return (
    <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
      <TableChartIcon sx={{ fontSize: 48, mb: 1, color: "divider" }} />
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Typography variant="body2">{subtitle}</Typography>
    </Box>
  );
};

const SummaryManager = () => {
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create"); // create | edit
  const [formSheetName, setFormSheetName] = useState("");
  const [formRowNumber, setFormRowNumber] = useState("");
  const [formRowData, setFormRowData] = useState("{}");
  const [formOthers, setFormOthers] = useState("{}");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const loadSheets = async () => {
    setError("");
    try {
      const result = await summaryService.getSheets();
      setSheets(result?.data || []);
      if (!selectedSheet && (result?.data || []).length > 0) {
        setSelectedSheet(result.data[0]);
      }
    } catch (e) {
      setError(e.message || "Failed to load sheets");
    }
  };

  const loadRows = async (sheetName) => {
    if (!sheetName) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await summaryService.getSheetData(sheetName);
      setRows(result?.data || []);
    } catch (e) {
      setError(e.message || "Failed to load rows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRows(selectedSheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSheet]);

  const unionColumns = useMemo(() => {
    const keys = new Set(); // removed rowNumber from visible columns
    const excludeTop = new Set([
      "_id",
      "__v",
      "sheetName",
      "rowData",
      "others",
      "createdAt",
      "updatedAt",
    ]);
    rows.forEach((r) => {
      const rd = r?.rowData || {};
      Object.keys(rd || {}).forEach((k) => keys.add(k));
      const others = r?.others || {};
      Object.keys(others || {}).forEach((k) => keys.add(k));
      Object.keys(r || {}).forEach((k) => {
        if (!excludeTop.has(k)) keys.add(k);
      });
    });
    return Array.from(keys);
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (String(r?.rowNumber ?? "").toLowerCase().includes(q)) return true;
      const rd = r?.rowData || {};
      return Object.values(rd).some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [rows, search]);

  const openCreate = () => {
    if (!selectedSheet) return;
    setDialogMode("create");
    setEditingId(null);
    setFormSheetName(selectedSheet || "");
    setFormRowNumber("");
    setFormRowData("{}");
    setFormOthers("{}");
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setDialogMode("edit");
    setEditingId(row._id);
    setFormSheetName(row.sheetName || selectedSheet || "");
    setFormRowNumber(row?.rowNumber ?? "");
    setFormRowData(prettyJson(row?.rowData || {}));
    setFormOthers(prettyJson(row?.others || {}));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const handleDelete = async (row) => {
    if (!confirm("Delete this record?")) return;
    try {
      await summaryService.deleteRecord(row._id);
      await loadRows(selectedSheet);
    } catch (e) {
      alert(e.message || "Failed to delete");
    }
  };

  const handleSubmit = async () => {
    const payload = {
      sheetName: (dialogMode === "create" ? selectedSheet : formSheetName)?.trim(),
      rowNumber: formRowNumber === "" ? undefined : Number(formRowNumber),
      rowData: tryParseJson(formRowData, {}),
      others: tryParseJson(formOthers, {}),
    };
    if (!payload.sheetName) {
      alert("Sheet name is required");
      return;
    }
    setSubmitting(true);
    try {
      if (dialogMode === "create") {
        await summaryService.createRecord(payload);
        if (!sheets.includes(payload.sheetName)) {
          setSheets((prev) => [...prev, payload.sheetName]);
        }
        if (payload.sheetName === selectedSheet) {
          await loadRows(selectedSheet);
        } else {
          setSelectedSheet(payload.sheetName);
        }
      } else {
        await summaryService.updateRecord(editingId, payload);
        await loadRows(selectedSheet);
      }
      setDialogOpen(false);
    } catch (e) {
      alert(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 2, minHeight: "calc(100vh - 140px)" }}>
      <Paper sx={{ width: 280, flexShrink: 0 }}>
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">Sheets</Typography>
          <Tooltip title="Refresh sheets">
            <IconButton onClick={loadSheets} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />
        <List dense>
          {sheets.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No sheets found. Create a record to start a new sheet.
              </Typography>
            </Box>
          )}
          {sheets.map((name) => (
            <ListItemButton
              key={name}
              selected={name === selectedSheet}
              onClick={() => setSelectedSheet(name)}
            >
              <ListItemText primary={name} />
            </ListItemButton>
          ))}
        </List>
      </Paper>

      <Paper sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                {selectedSheet || "No sheet selected"}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`${rows.length} rows`} size="small" />
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search in visible rows…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Box>
        <Divider />
        <Box sx={{ p: 2, pt: 1 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadRows(selectedSheet)}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={!selectedSheet}>
              Add Row
            </Button>
          </Stack>
          {error && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {loading ? (
            <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title={selectedSheet ? "No rows in this sheet" : "Select a sheet"}
              subtitle={selectedSheet ? "Add rows or refresh." : "Choose a sheet from the left or create a new record."}
            />
          ) : (
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {unionColumns.map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 600, bgcolor: "background.default" }}>
                        {col}
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 600, bgcolor: "background.default" }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.map((r) => {
                    const rd = r?.rowData || {};
                    return (
                      <TableRow key={r._id} hover>
                        {unionColumns.map((col) => {
                          let value = "";
                          if (col === "rowNumber") {
                            value = r?.rowNumber ?? "";
                          } else if (rd && Object.prototype.hasOwnProperty.call(rd, col)) {
                            value = rd[col];
                          } else if (r?.others && Object.prototype.hasOwnProperty.call(r.others, col)) {
                            value = r.others[col];
                          } else if (Object.prototype.hasOwnProperty.call(r || {}, col)) {
                            value = r[col];
                          }
                          return (
                            <TableCell key={col}>
                              {typeof value === "object" && value !== null
                                ? JSON.stringify(value)
                                : String(value ?? "")}
                            </TableCell>
                          );
                        })}
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(r)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(r)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>{dialogMode === "create" ? "Create Record" : "Edit Record"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Sheet Name"
              value={formSheetName}
              onChange={(e) => setFormSheetName(e.target.value)}
              fullWidth
              disabled={dialogMode === "create"}
            />
            <TextField
              label="Row Number"
              value={formRowNumber}
              onChange={(e) => setFormRowNumber(e.target.value)}
              type="number"
              fullWidth
            />
            <TextField
              label="Row Data (JSON)"
              value={formRowData}
              onChange={(e) => setFormRowData(e.target.value)}
              fullWidth
              multiline
              minRows={6}
              placeholder='{"ColumnA": "value", "ColumnB": 123}'
            />
            <TextField
              label="Others (JSON)"
              value={formOthers}
              onChange={(e) => setFormOthers(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              placeholder='{"notes": "optional"}'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SummaryManager;

