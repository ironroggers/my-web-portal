import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  IconButton,
  InputAdornment,
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
  Tooltip,
  Typography,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import sectionsService from "../services/sectionsService.jsx";
import { LOCATION_URL } from "../API/api-keys.jsx";
import PageHeader from "./common/PageHeader";
import StatusPill from "./common/StatusPill";
import FormDialog from "./common/FormDialog";
import ConfirmDeleteDialog from "./common/ConfirmDeleteDialog";
import { formatNumber } from "../utils/formatNumber";

const SECTION_STATUSES = {
  1: { label: "Draft", tone: "default" },
  2: { label: "In Progress", tone: "warning" },
  3: { label: "Completed", tone: "success" },
  4: { label: "Archived", tone: "default" },
};

const EMPTY_FORM = {
  name: "",
  description: "",
  fromLatLong: "",
  toLatLong: "",
  sectionLength: "",
  status: 1,
};

// The sections API can't filter by location, so every page is fetched and filtered here
const FETCH_PAGE_SIZE = 200;
const SEARCH_DEBOUNCE_MS = 300;

const fetchAllSections = async () => {
  const first = await sectionsService.list({ page: 1, limit: FETCH_PAGE_SIZE });
  const items = [...(first.items || [])];
  const total = first.total || items.length;
  const pages = Math.ceil(total / FETCH_PAGE_SIZE);
  for (let page = 2; page <= pages; page += 1) {
    const next = await sectionsService.list({ page, limit: FETCH_PAGE_SIZE });
    items.push(...(next.items || []));
  }
  return items;
};

const formatLength = (meters) => (meters ? `${formatNumber(Number(meters))} m` : "—");

const SectionActions = ({ section, onEdit, onDelete }) => (
  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }} onClick={(event) => event.stopPropagation()}>
    <Tooltip title="Edit section">
      <IconButton size="small" aria-label={`Edit ${section.name || "section"}`} onClick={() => onEdit(section)}>
        <EditOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip title="Delete section">
      <IconButton
        size="small"
        aria-label={`Delete ${section.name || "section"}`}
        onClick={() => onDelete(section)}
        sx={{ "&:hover": { color: "error.main" } }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Box>
);

const LocationSectionsPage = () => {
  const navigate = useNavigate();
  const { locationId } = useParams();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));

  // undefined while loading
  const [sections, setSections] = useState(undefined);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  // Location meta for the header and to fill new sections' admin fields
  const [locationMeta, setLocationMeta] = useState(null);

  // Add / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchSections = useCallback(async () => {
    setError("");
    try {
      const all = await fetchAllSections();
      setSections(all.filter((section) => String(section.location) === String(locationId)));
    } catch (e) {
      setSections((previous) => previous ?? []);
      setError(e.message || "Failed to load sections");
    }
  }, [locationId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    if (!locationId) return;
    fetch(`${LOCATION_URL}/api/locations/${locationId}`)
      .then((res) => res.json())
      .then((json) => setLocationMeta(json?.data || null))
      .catch(() => setLocationMeta(null));
  }, [locationId]);

  // Search after a short pause in typing
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [query]);

  // Same fields the API's own search covers
  const filtered = useMemo(
    () =>
      (sections || []).filter(
        (section) =>
          !query ||
          [section.name, section.description, section.district].some((value) => String(value || "").toLowerCase().includes(query))
      ),
    [sections, query]
  );

  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));
  const pageItems = filtered.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);
  const totalLength = (sections || []).reduce((total, section) => total + (Number(section.sectionLength) || 0), 0);
  const isLoading = sections === undefined;

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setFormError("");
    setNameError(false);
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
    setFormError("");
    setNameError(false);
    setDialogOpen(true);
  };

  const updateForm = (key) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [key]: value }));
    if (key === "name" && value.trim()) setNameError(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setNameError(true);
      setFormError("Give the section a name before saving.");
      return;
    }
    setFormError("");
    try {
      setSaving(true);
      const payload = {
        ...form,
        sectionLength: form.sectionLength === "" ? 0 : Number(form.sectionLength),
        status: Number(form.status),
        location: locationId,
        // Admin fields come from the location
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
      fetchSections();
    } catch (e) {
      setFormError(e.message || "Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError("");
      await sectionsService.remove(deleteTarget._id);
      setDeleteTarget(null);
      fetchSections();
    } catch (e) {
      setDeleteError(e.message || "Failed to delete section");
    } finally {
      setDeleting(false);
    }
  };

  const openSection = (section) => navigate(`/sections/${section._id}/subsections`);
  const askDelete = (section) => {
    setDeleteError("");
    setDeleteTarget(section);
  };

  const locationName = locationMeta
    ? [locationMeta.block || locationMeta.blockName, locationMeta.district || locationMeta.districtName, locationMeta.state || locationMeta.stateName]
        .filter(Boolean)
        .join(", ")
    : null;

  const emptyState = (
    <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {query ? `No sections match "${searchInput.trim()}"` : "No sections for this location yet"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        {query ? "Try a different name, description or district." : "Sections split the location's OFC route into stretches you can track."}
      </Typography>
      {!query && (
        <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd} sx={{ mt: 2 }}>
          Add section
        </Button>
      )}
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Sections"
        subtitle={locationName || "OFC route sections for this location"}
        actions={
          <>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/map", { state: { preselectLocationId: locationId } })}>
              Back to map
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
              Add section
            </Button>
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={fetchSections}>Retry</Button>}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            size="small"
            placeholder="Search by name, description or district"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ width: { xs: "100%", sm: 340 } }}
            slotProps={{
              htmlInput: { "aria-label": "Search sections" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setSearchInput("")}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box sx={{ flex: 1 }} />
          {!isLoading && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {sections.length} {sections.length === 1 ? "section" : "sections"}
              {totalLength > 0 && ` · ${formatNumber(totalLength)} m in total`}
            </Typography>
          )}
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchSections} aria-label="Refresh sections">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} variant="text" height={48} />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          emptyState
        ) : isPhone ? (
          <Box>
            {pageItems.map((section) => {
              const status = SECTION_STATUSES[section.status] || { label: "Unknown", tone: "default" };
              return (
                <Box
                  key={section._id}
                  onClick={() => openSection(section)}
                  sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {section.name || "Untitled section"}
                      </Typography>
                      {section.description && (
                        <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
                          {section.description}
                        </Typography>
                      )}
                    </Box>
                    <SectionActions section={section} onEdit={openEdit} onDelete={askDelete} />
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 1 }}>
                    <StatusPill label={status.label} tone={status.tone} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {formatLength(section.sectionLength)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Section</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell align="right">Length</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {pageItems.map((section) => {
                  const status = SECTION_STATUSES[section.status] || { label: "Unknown", tone: "default" };
                  return (
                    <TableRow key={section._id} hover onClick={() => openSection(section)} sx={{ cursor: "pointer" }}>
                      <TableCell sx={{ maxWidth: 360 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {section.name || "Untitled section"}
                        </Typography>
                        {section.description && (
                          <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
                            {section.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: section.fromLatLong ? "text.primary" : "text.disabled", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {section.fromLatLong || "—"}
                      </TableCell>
                      <TableCell sx={{ color: section.toLatLong ? "text.primary" : "text.disabled", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {section.toLatLong || "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {formatLength(section.sectionLength)}
                      </TableCell>
                      <TableCell>
                        <StatusPill label={status.label} tone={status.tone} />
                      </TableCell>
                      <TableCell align="right">
                        <SectionActions section={section} onEdit={openEdit} onDelete={askDelete} />
                      </TableCell>
                      <TableCell padding="checkbox">
                        <ChevronRightIcon fontSize="small" sx={{ color: "text.disabled", display: "block" }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!isLoading && filtered.length > 0 && (
          <TablePagination
            component="div"
            count={filtered.length}
            page={currentPage}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 20, 50]}
            labelRowsPerPage={isPhone ? "Rows:" : "Rows per page:"}
            sx={{ borderTop: 1, borderColor: "divider" }}
          />
        )}
      </Card>

      {/* Add / edit section */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit section" : "Add section"}
        subtitle={locationName}
        maxWidth="sm"
        saving={saving}
        submitLabel={editing ? "Save changes" : "Add section"}
        onSubmit={handleSave}
        error={formError}
        onDismissError={() => setFormError("")}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={updateForm("name")}
            size="small"
            required
            error={nameError}
            helperText={nameError ? "Required" : undefined}
            sx={{ gridColumn: "1 / -1" }}
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={updateForm("description")}
            size="small"
            multiline
            minRows={2}
            sx={{ gridColumn: "1 / -1" }}
          />
          <TextField label="From (lat, long)" value={form.fromLatLong} onChange={updateForm("fromLatLong")} size="small" placeholder="e.g. 9.9816, 76.2999" />
          <TextField label="To (lat, long)" value={form.toLatLong} onChange={updateForm("toLatLong")} size="small" placeholder="e.g. 9.9902, 76.3051" />
          <TextField
            label="Length (m)"
            type="number"
            value={form.sectionLength}
            onChange={updateForm("sectionLength")}
            size="small"
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField select label="Status" value={form.status} onChange={updateForm("status")} size="small">
            {Object.entries(SECTION_STATUSES).map(([value, status]) => (
              <MenuItem key={value} value={Number(value)}>
                {status.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </FormDialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete section?"
        error={deleteError}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      >
        "{deleteTarget?.name || "This section"}" will be deleted. This can't be undone.
      </ConfirmDeleteDialog>
    </Box>
  );
};

export default LocationSectionsPage;
