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
  Alert,
  CircularProgress,
  TablePagination,
  Breadcrumbs,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import StraightenIcon from "@mui/icons-material/Straighten";
import RouteIcon from "@mui/icons-material/Route";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import LayersIcon from "@mui/icons-material/Layers";
import HomeRepairServiceIcon from "@mui/icons-material/HomeRepairService";
import ShieldIcon from "@mui/icons-material/Shield";
import subsectionsService from "../services/subsectionsService.jsx";
import sectionsService from "../services/sectionsService.jsx";

const SubsectionsPage = () => {
  const navigate = useNavigate();
  const { sectionId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [q, setQ] = useState("");
  const [refreshFlag, setRefreshFlag] = useState(0);

  const [sectionMeta, setSectionMeta] = useState(null);
  const [sectionLoading, setSectionLoading] = useState(true);
  const [sectionError, setSectionError] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    fromLatLong: "",
    toLatLong: "",
    subSectionLength: "",
    roadName: "",
    proposedOfcSide: "",
    alignmentType: "",
    soilStatus: "",
    waterLoggedArea: false,
    roadSurfaceType: "",
    methodOfConstruction: "",
    pitType: "",
    estimatedDepth: "",
    proposedOffsetFromCenterOfRoad: "",
    protectionType: "",
    remarks: "",
    // ROW fields
    rowOwnership: "",
    rowAuthority: "",
    rowAuthorityName: "",
    rowAuthorityAddress: "",
    rowFeasibility: "",
  });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubsections = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await subsectionsService.list({
        sectionId,
        page: page + 1,
        limit: rowsPerPage,
        q,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e.message || "Failed to load subsections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubsections();
  }, [sectionId, page, rowsPerPage, q, refreshFlag]);

  useEffect(() => {
    const loadSection = async () => {
      try {
        setSectionLoading(true);
        setSectionError("");
        const meta = await sectionsService.get(sectionId);
        setSectionMeta(meta);
      } catch (e) {
        setSectionError(e.message || "Failed to load section");
      } finally {
        setSectionLoading(false);
      }
    };
    if (sectionId) loadSection();
  }, [sectionId]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      fromLatLong: "",
      toLatLong: "",
      subSectionLength: "",
      roadName: "",
      proposedOfcSide: "",
      alignmentType: "",
      soilStatus: "",
      waterLoggedArea: false,
      roadSurfaceType: "",
      methodOfConstruction: "",
      pitType: "",
      estimatedDepth: "",
      proposedOffsetFromCenterOfRoad: "",
      protectionType: "",
      remarks: "",
      rowOwnership: "",
      rowAuthority: "",
      rowAuthorityName: "",
      rowAuthorityAddress: "",
      rowFeasibility: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (sub) => {
    setEditing(sub);
    setForm({
      name: sub.name || "",
      description: sub.description || "",
      fromLatLong: sub.fromLatLong || "",
      toLatLong: sub.toLatLong || "",
      subSectionLength: sub.subSectionLength ?? "",
      roadName: sub.roadName || "",
      proposedOfcSide: sub.proposedOfcSide || "",
      alignmentType: sub.alignmentType || "",
      soilStatus: sub.soilStatus || "",
      waterLoggedArea: !!sub.waterLoggedArea,
      roadSurfaceType: sub.roadSurfaceType || "",
      methodOfConstruction: sub.methodOfConstruction || "",
      pitType: sub.pitType || "",
      estimatedDepth: sub.estimatedDepth ?? "",
      proposedOffsetFromCenterOfRoad: sub.proposedOffsetFromCenterOfRoad ?? "",
      protectionType: sub.protectionType || "",
      remarks: sub.remarks || "",
      rowOwnership: sub.row?.rowOwnership || "",
      rowAuthority: sub.row?.rowAuthority || "",
      rowAuthorityName: sub.row?.rowAuthorityName || "",
      rowAuthorityAddress: sub.row?.rowAuthorityAddress || "",
      rowFeasibility: sub.row?.rowFeasibility || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...form,
        section: sectionId,
        subSectionLength:
          form.subSectionLength === "" ? 0 : Number(form.subSectionLength),
        estimatedDepth: form.estimatedDepth === "" ? 0 : Number(form.estimatedDepth),
        proposedOffsetFromCenterOfRoad:
          form.proposedOffsetFromCenterOfRoad === ""
            ? 0
            : Number(form.proposedOffsetFromCenterOfRoad),
        row: {
          rowOwnership: form.rowOwnership || "",
          rowAuthority: form.rowAuthority || "",
          rowAuthorityName: form.rowAuthorityName || "",
          rowAuthorityAddress: form.rowAuthorityAddress || "",
          rowFeasibility: form.rowFeasibility || "",
          others: {},
        },
      };
      if (editing) {
        await subsectionsService.update(editing._id, payload);
      } else {
        await subsectionsService.create(payload);
      }
      setDialogOpen(false);
      setEditing(null);
      setRefreshFlag((n) => n + 1);
    } catch (e) {
      setError(e.message || "Failed to save subsection");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await subsectionsService.remove(deleteTarget._id);
      setDeleteTarget(null);
      setRefreshFlag((n) => n + 1);
    } catch (e) {
      setError(e.message || "Failed to delete subsection");
    } finally {
      setDeleting(false);
    }
  };

  // Page indicators
  const pageIndicators = useMemo(() => {
    return [
      { label: "Location", done: true },
      { label: "Sections", done: true },
      { label: "Subsections", done: false },
    ];
  }, []);

  const indicatorColor = (done) => (done ? "success" : "default");

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header with breadcrumbs and indicators */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: '#fff', borderRadius: 2, boxShadow: '0 4px 14px rgba(30,58,138,.25)' }}>
        <Breadcrumbs sx={{ mb: 2, color: 'rgba(255,255,255,.75)', '& .MuiBreadcrumbs-separator': { color: 'rgba(255,255,255,.6)' }, '& a': { color: 'rgba(255,255,255,.85)' } }}>
          <Link underline="hover" color="inherit" onClick={() => navigate('/map')} sx={{ cursor: 'pointer' }}>
            Map View
          </Link>
          <Link underline="hover" color="inherit" onClick={() => navigate(-1)} sx={{ cursor: 'pointer' }}>
            Sections
          </Link>
          <Typography sx={{ color: "#fff", fontWeight: 600 }}>Subsections</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                Subsections
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {sectionLoading ? 'Loading section...' : sectionError ? sectionError : (sectionMeta?.name || 'Untitled Section')}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            {pageIndicators.map((ind, i) => (
              <Chip key={i} size="small" label={ind.label} sx={{ color: '#fff', bgcolor: ind.done ? 'rgba(255,255,255,.22)' : 'transparent', border: '1px solid rgba(255,255,255,.45)' }} />
            ))}
            <Button startIcon={<RefreshIcon />} variant="outlined" color="inherit" sx={{ borderColor: "rgba(255,255,255,.6)" }} onClick={() => setRefreshFlag((n) => n + 1)}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openAdd} sx={{ bgcolor: "#fff", color: "#1e3a8a", "&:hover": { bgcolor: "#eff6ff" } }}>
              Add Subsection
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" useFlexGap sx={{ flexWrap: "wrap" }}>
          <TextField
            placeholder="Search subsections by name or road name..."
            value={q}
            onChange={(e) => {
              setPage(0);
              setQ(e.target.value);
            }}
            size="small"
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
            sx={{ width: 420, maxWidth: '100%', '& .MuiInputBase-root': { bgcolor: '#f9fafb' } }}
          />
        </Stack>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <CircularProgress size={48} />
          <Typography variant="h6" sx={{ ml: 2 }}>Loading subsections...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <>
          {items.length === 0 ? (
            <Alert severity="info">No subsections found for this section.</Alert>
          ) : (
            <Stack spacing={2}>
              {items.map((s) => (
                <Paper
                  key={s._id}
                  elevation={0}
                  sx={{
                    p: 2.5, bgcolor: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: 2,
                    transition: 'box-shadow .2s, border-color .2s',
                    '&:hover': { boxShadow: '0 4px 14px rgba(15,23,42,.08)', borderColor: '#93c5fd' },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}>
                    <Box onClick={() => navigate(`/subsections/${s._id}/trenching`)} sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <RouteIcon />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1.3 }} noWrap>
                            {s.name || 'Untitled Subsection'}
                          </Typography>
                          {s.description && (
                            <Typography variant="body2" sx={{ color: '#6b7280' }} noWrap>{s.description}</Typography>
                          )}
                        </Box>
                      </Box>
                      {s.roadName && (
                        <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', mt: 1 }}>Road: {s.roadName}</Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                      <Chip icon={<SwapHorizIcon />} size="small" variant="outlined" label={`${s.fromLatLong || 'N/A'} → ${s.toLatLong || 'N/A'}`} />
                      <Chip icon={<StraightenIcon />} size="small" color="info" variant="outlined" label={`${s.subSectionLength ?? 0} m`} />
                      {s.waterLoggedArea && <Chip icon={<WaterDropIcon />} size="small" color="warning" variant="outlined" label="Water Logged" />}
                      {s.roadSurfaceType && <Chip icon={<LayersIcon />} size="small" variant="outlined" label={s.roadSurfaceType} />}
                      {s.methodOfConstruction && <Chip icon={<HomeRepairServiceIcon />} size="small" variant="outlined" label={s.methodOfConstruction} />}
                      {s.protectionType && <Chip icon={<ShieldIcon />} size="small" variant="outlined" label={s.protectionType} />}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexShrink: 0 }}>
                      <Button size="small" startIcon={<EditIcon />} variant="outlined" onClick={() => openEdit(s)}>Edit</Button>
                      <Button size="small" startIcon={<DeleteIcon />} color="error" variant="outlined" onClick={() => setDeleteTarget(s)}>Delete</Button>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
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
              sx={{ '& .MuiTablePagination-toolbar': { bgcolor: '#fff', border: '1px solid #e5e7eb', borderRadius: 2 } }}
            />
          </Box>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Subsection' : 'Add Subsection'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Basic Info */}
            <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 600 }}>Basic Information</Typography>
            <Divider sx={{ mb: 1 }} />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  label="Road Name"
                  value={form.roadName}
                  onChange={(e) => setForm((f) => ({ ...f, roadName: e.target.value }))}
                  fullWidth
                />
              </Box>
            </Stack>
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
              />
              <TextField
                label="To Lat,Long"
                value={form.toLatLong}
                onChange={(e) => setForm((f) => ({ ...f, toLatLong: e.target.value }))}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Subsection Length (m)"
                type="number"
                value={form.subSectionLength}
                onChange={(e) => setForm((f) => ({ ...f, subSectionLength: e.target.value }))}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Estimated Depth (m)"
                type="number"
                value={form.estimatedDepth}
                onChange={(e) => setForm((f) => ({ ...f, estimatedDepth: e.target.value }))}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Offset from Center (m)"
                type="number"
                value={form.proposedOffsetFromCenterOfRoad}
                onChange={(e) => setForm((f) => ({ ...f, proposedOffsetFromCenterOfRoad: e.target.value }))}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </Stack>
            {/* Enums as dropdowns */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Proposed OFC Side</InputLabel>
                <Select
                  label="Proposed OFC Side"
                  value={form.proposedOfcSide}
                  onChange={(e) => setForm((f) => ({ ...f, proposedOfcSide: e.target.value }))}
                >
                  <MenuItem value="">Unspecified</MenuItem>
                  <MenuItem value="LHS">LHS</MenuItem>
                  <MenuItem value="RHS">RHS</MenuItem>
                  <MenuItem value="BOTH">BOTH</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Alignment Type</InputLabel>
                <Select
                  label="Alignment Type"
                  value={form.alignmentType}
                  onChange={(e) => setForm((f) => ({ ...f, alignmentType: e.target.value }))}
                >
                  <MenuItem value="">Unspecified</MenuItem>
                  <MenuItem value="Road Crossing">Road Crossing</MenuItem>
                  <MenuItem value="Along the road">Along the road</MenuItem>
                  <MenuItem value="others">others</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Soil Status</InputLabel>
                <Select
                  label="Soil Status"
                  value={form.soilStatus}
                  onChange={(e) => setForm((f) => ({ ...f, soilStatus: e.target.value }))}
                >
                  <MenuItem value="">Unspecified</MenuItem>
                  <MenuItem value="Hard">Hard</MenuItem>
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Soft">Soft</MenuItem>
                  <MenuItem value="Very Soft">Very Soft</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Road Surface Type</InputLabel>
                <Select
                  label="Road Surface Type"
                  value={form.roadSurfaceType}
                  onChange={(e) => setForm((f) => ({ ...f, roadSurfaceType: e.target.value }))}
                >
                  <MenuItem value="">Unspecified</MenuItem>
                  <MenuItem value="Paved">Paved</MenuItem>
                  <MenuItem value="Unpaved">Unpaved</MenuItem>
                  <MenuItem value="others">others</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Method of Construction</InputLabel>
                <Select
                  label="Method of Construction"
                  value={form.methodOfConstruction}
                  onChange={(e) => setForm((f) => ({ ...f, methodOfConstruction: e.target.value }))}
                >
                  <MenuItem value="">Unspecified</MenuItem>
                  <MenuItem value="Open Trench">Open Trench</MenuItem>
                  <MenuItem value="HDD">HDD</MenuItem>
                  <MenuItem value="Clamping">Clamping</MenuItem>
                  <MenuItem value="In Building">In Building</MenuItem>
                  <MenuItem value="others">others</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Pit Type</InputLabel>
                <Select
                  label="Pit Type"
                  value={form.pitType}
                  onChange={(e) => setForm((f) => ({ ...f, pitType: e.target.value }))}
                >
                  <MenuItem value="">Unspecified</MenuItem>
                  <MenuItem value="Soil">Soil</MenuItem>
                  <MenuItem value="Bitumen">Bitumen</MenuItem>
                  <MenuItem value="Concrete">Concrete</MenuItem>
                  <MenuItem value="others">others</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Protection Type</InputLabel>
                <Select
                  label="Protection Type"
                  value={form.protectionType}
                  onChange={(e) => setForm((f) => ({ ...f, protectionType: e.target.value }))}
                >
                  <MenuItem value="">Unspecified</MenuItem>
                  <MenuItem value="DWC">DWC</MenuItem>
                  <MenuItem value="GI">GI</MenuItem>
                  <MenuItem value="PCC">PCC</MenuItem>
                  <MenuItem value="others">others</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <FormControlLabel
              control={<Switch checked={form.waterLoggedArea} onChange={(e) => setForm((f) => ({ ...f, waterLoggedArea: e.target.checked }))} />}
              label="Water Logged Area"
            />

            {/* ROW Section */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3 }}>Right of Way (RoW)</Typography>
            <Divider sx={{ mb: 1 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>ROW Ownership</InputLabel>
                <Select
                  label="ROW Ownership"
                  value={form.rowOwnership}
                  onChange={(e) => setForm((f) => ({ ...f, rowOwnership: e.target.value }))}
                >
                  <MenuItem value="">Unspecified</MenuItem>
                  {['NHAI', 'State PWD', 'Railway', 'Gas Pipeline', 'Forest', 'Municipality', 'Corporation'].map((v) => (
                    <MenuItem key={v} value={v}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="ROW Authority"
                value={form.rowAuthority}
                onChange={(e) => setForm((f) => ({ ...f, rowAuthority: e.target.value }))}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="ROW Authority Name"
                value={form.rowAuthorityName}
                onChange={(e) => setForm((f) => ({ ...f, rowAuthorityName: e.target.value }))}
                fullWidth
              />
              <TextField
                label="ROW Authority Address"
                value={form.rowAuthorityAddress}
                onChange={(e) => setForm((f) => ({ ...f, rowAuthorityAddress: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              label="ROW Feasibility"
              value={form.rowFeasibility}
              onChange={(e) => setForm((f) => ({ ...f, rowFeasibility: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Remarks"
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
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
        <DialogTitle>Delete Subsection</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure you want to delete "{deleteTarget?.name || 'this subsection'}"?</Typography>
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

export default SubsectionsPage;


