import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  TextField,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  CircularProgress,
  TablePagination,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import StraightenIcon from "@mui/icons-material/Straighten";
import sectionsService from "../services/sectionsService.jsx";
import { LOCATION_URL } from "../API/api-keys.jsx";

const LocationSectionsPage = () => {
  const navigate = useNavigate();
  const { locationId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Location meta for header and auto-fill
  const [locationMeta, setLocationMeta] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    fromLatLong: "",
    toLatLong: "",
    sectionLength: "",
    status: 1,
  });
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await sectionsService.list({
        locationId,
        page: page + 1,
        limit: rowsPerPage,
        q,
      });
      setItems(res.items || []);
      setTotal(res.total || (res.items ? res.items.length : 0));
    } catch (e) {
      setError(e.message || "Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, page, rowsPerPage, q, refreshFlag]);

  useEffect(() => {
    const fetchLocationMeta = async () => {
      try {
        setLocationLoading(true);
        setLocationError("");
        const res = await fetch(`${LOCATION_URL}/api/locations/${locationId}`);
        const json = await res.json();
        const data = json?.data || null;
        setLocationMeta(data);
      } catch (e) {
        setLocationError(e.message || "Failed to load location");
      } finally {
        setLocationLoading(false);
      }
    };
    if (locationId) fetchLocationMeta();
  }, [locationId]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      fromLatLong: "",
      toLatLong: "",
      sectionLength: "",
      status: 1,
    });
  };

  const openAdd = () => {
    resetForm();
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (section) => {
    setEditing(section);
    setForm({
      name: section.name || "",
      description: section.description || "",
      fromLatLong: section.fromLatLong || "",
      toLatLong: section.toLatLong || "",
      sectionLength: section.sectionLength ?? "",
      status: section.status ?? 1,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        sectionLength: form.sectionLength === "" ? 0 : Number(form.sectionLength),
        status: Number(form.status),
        location: locationId,
        // Auto-fill from location meta if available
        state: locationMeta?.state || locationMeta?.stateName || "",
        district: locationMeta?.district || locationMeta?.districtName || "",
        block: locationMeta?.block || locationMeta?.blockName || "",
        stateCode: locationMeta?.state_code || locationMeta?.stateCode || "",
        districtCode: locationMeta?.district_code || locationMeta?.districtCode || "",
        blockCode: locationMeta?.block_code || locationMeta?.blockCode || "",
      };
      if (editing) {
        await sectionsService.update(editing._id, payload);
      } else {
        await sectionsService.create(payload);
      }
      setDialogOpen(false);
      setEditing(null);
      setRefreshFlag((n) => n + 1);
    } catch (e) {
      setError(e.message || "Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await sectionsService.remove(deleteTarget._id);
      setDeleteTarget(null);
      setRefreshFlag((n) => n + 1);
    } catch (e) {
      setError(e.message || "Failed to delete section");
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel = useMemo(() => ({
    1: "Draft",
    2: "In Progress",
    3: "Completed",
    4: "Archived",
  }), []);

  const statusColor = (s) => {
    switch (Number(s)) {
      case 3:
        return "success";
      case 2:
        return "info";
      case 4:
        return "default";
      default:
        return "warning";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate('/map', { state: { preselectLocationId: locationId } })} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Sections
              </Typography>
              {locationLoading ? (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Loading location...
                </Typography>
              ) : locationError ? (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {locationError}
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {locationMeta ? `${locationMeta.block || locationMeta.blockName || 'Unknown Block'} (${locationMeta.district || locationMeta.districtName || 'Unknown District'}), ${locationMeta.state || locationMeta.stateName || 'Unknown State'}` : 'Unknown Location'}
                </Typography>
              )}
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" color="inherit" onClick={() => setRefreshFlag((n) => n + 1)}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" color="secondary" onClick={openAdd}>
              Add Section
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50', border: '1px solid #e0e0e0' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap>
          <TextField
            placeholder="Search sections by name, description, district..."
            value={q}
            onChange={(e) => {
              setPage(0);
              setQ(e.target.value);
            }}
            size="small"
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
            sx={{ width: 360, maxWidth: '100%' }}
          />
        </Stack>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="240px">
          <CircularProgress size={48} />
          <Typography variant="h6" sx={{ ml: 2 }}>Loading sections...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <>
          {items.length === 0 ? (
            <Alert severity="info">No sections found for this location.</Alert>
          ) : (
            <Stack spacing={2}>
              {items.map((s) => (
                <Paper key={s._id} elevation={1} sx={{ p: 2, border: '1px solid #e0e0e0' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6} onClick={() => navigate(`/sections/${s._id}/subsections`)} sx={{ cursor: 'pointer' }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LocationOnIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">{s.name || 'Untitled Section'}</Typography>
                      </Box>
                      {s.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {s.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {s.state && <Chip label={s.state} variant="outlined" size="small" />}
                        {s.district && <Chip label={s.district} variant="outlined" size="small" color="secondary" />}
                        {s.block && <Chip label={s.block} variant="outlined" size="small" color="success" />}
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Stack direction="row" spacing={2} flexWrap>
                        <Chip icon={<SwapHorizIcon />} label={`${s.fromLatLong || 'N/A'} → ${s.toLatLong || 'N/A'}`} variant="outlined" />
                        <Chip icon={<StraightenIcon />} label={`${s.sectionLength ?? 0} m`} color="info" variant="outlined" />
                        <Chip label={statusLabel[s.status] || 'Unknown'} color={statusColor(s.status)} size="small" />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                        <Button size="small" startIcon={<EditIcon />} variant="outlined" onClick={() => openEdit(s)}>
                          Edit
                        </Button>
                        <Button size="small" startIcon={<DeleteIcon />} color="error" variant="outlined" onClick={() => setDeleteTarget(s)}>
                          Delete
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          )}

          {/* Pagination */}
          <Box display="flex" justifyContent="center" mt={3}>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 20, 50]}
              labelRowsPerPage="Per page:"
              sx={{ '& .MuiTablePagination-toolbar': { bgcolor: 'grey.50', borderRadius: 2 } }}
            />
          </Box>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Section' : 'Add Section'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="From Lat,Long"
                value={form.fromLatLong}
                onChange={(e) => setForm((f) => ({ ...f, fromLatLong: e.target.value }))}
                fullWidth
                placeholder="e.g. 22.5726,88.3639"
              />
              <TextField
                label="To Lat,Long"
                value={form.toLatLong}
                onChange={(e) => setForm((f) => ({ ...f, toLatLong: e.target.value }))}
                fullWidth
                placeholder="e.g. 22.5740,88.3700"
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Section Length (m)"
                type="number"
                value={form.sectionLength}
                onChange={(e) => setForm((f) => ({ ...f, sectionLength: e.target.value }))}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Status"
                type="number"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                fullWidth
                helperText="1: Draft, 2: In Progress, 3: Completed, 4: Archived"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Section</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure you want to delete "{deleteTarget?.name || 'this section'}"?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting} startIcon={<DeleteIcon />}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LocationSectionsPage;


