import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Switch,
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
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import subsectionsService from "../services/subsectionsService.jsx";
import sectionsService from "../services/sectionsService.jsx";
import PageHeader from "./common/PageHeader";
import StatusPill from "./common/StatusPill";
import FormDialog from "./common/FormDialog";
import ConfirmDeleteDialog from "./common/ConfirmDeleteDialog";
import { formatNumber } from "../utils/formatNumber";

const EMPTY_FORM = {
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
  // Right of way
  rowOwnership: "",
  rowAuthority: "",
  rowAuthorityName: "",
  rowAuthorityAddress: "",
  rowFeasibility: "",
};

// Values are stored as listed; "others" is shown as "Other"
const OPTIONS = {
  proposedOfcSide: ["LHS", "RHS", "BOTH"],
  alignmentType: ["Road Crossing", "Along the road", "others"],
  soilStatus: ["Hard", "Normal", "Soft", "Very Soft"],
  roadSurfaceType: ["Paved", "Unpaved", "others"],
  methodOfConstruction: ["Open Trench", "HDD", "Clamping", "In Building", "others"],
  pitType: ["Soil", "Bitumen", "Concrete", "others"],
  protectionType: ["DWC", "GI", "PCC", "others"],
  rowOwnership: ["NHAI", "State PWD", "Railway", "Gas Pipeline", "Forest", "Municipality", "Corporation"],
};

const SEARCH_DEBOUNCE_MS = 400;

const optionLabel = (value) => (value === "others" ? "Other" : value);
const formatLength = (meters) => (meters ? `${formatNumber(Number(meters))} m` : "—");

const SubsectionActions = ({ subsection, onEdit, onDelete }) => (
  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }} onClick={(event) => event.stopPropagation()}>
    <Tooltip title="Edit subsection">
      <IconButton size="small" aria-label={`Edit ${subsection.name || "subsection"}`} onClick={() => onEdit(subsection)}>
        <EditOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip title="Delete subsection">
      <IconButton
        size="small"
        aria-label={`Delete ${subsection.name || "subsection"}`}
        onClick={() => onDelete(subsection)}
        sx={{ "&:hover": { color: "error.main" } }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Box>
);

const SectionTitle = ({ children }) => (
  <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600, gridColumn: "1 / -1", mt: 1 }}>
    {children}
  </Typography>
);

const SubsectionsPage = () => {
  const navigate = useNavigate();
  const { sectionId } = useParams();
  // Set when the section was opened from a block profile; drives breadcrumbs and the sidebar
  const { pathname, search, state: routeState } = useLocation();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));

  // undefined while the first page loads
  const [items, setItems] = useState(undefined);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const requestIdRef = useRef(0);

  const [sectionMeta, setSectionMeta] = useState(null);

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

  const fetchSubsections = useCallback(async () => {
    // Only the latest request updates the list, so quick searches can't show stale results
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    setError("");
    try {
      const res = await subsectionsService.list({ sectionId, page: page + 1, limit: rowsPerPage, q: query });
      if (requestId !== requestIdRef.current) return;
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setItems((previous) => previous ?? []);
      setError(e.message || "Failed to load subsections");
    } finally {
      if (requestId === requestIdRef.current) setRefreshing(false);
    }
  }, [sectionId, page, rowsPerPage, query]);

  useEffect(() => {
    fetchSubsections();
  }, [fetchSubsections]);

  useEffect(() => {
    if (!sectionId) return;
    sectionsService
      .get(sectionId)
      .then(setSectionMeta)
      .catch(() => setSectionMeta(null));
  }, [sectionId]);

  // Opened by URL or from the trenching page: recover the block from the section itself
  const blockProfileId = sectionMeta?.blockProfile ? String(sectionMeta.blockProfile) : null;
  useEffect(() => {
    if (!blockProfileId || routeState?.blockProfileId === blockProfileId) return;
    navigate(
      { pathname, search },
      { replace: true, state: { ...routeState, blockProfileId, blockProfileName: sectionMeta.block } }
    );
  }, [blockProfileId, routeState, sectionMeta, navigate, pathname, search]);

  // Search after a short pause in typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isLoading = items === undefined;

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setNameError(false);
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
    setFormError("");
    setNameError(false);
    setDialogOpen(true);
  };

  const updateForm = (key) => (event) => {
    const value = key === "waterLoggedArea" ? event.target.checked : event.target.value;
    setForm((previous) => ({ ...previous, [key]: value }));
    if (key === "name" && String(value).trim()) setNameError(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setNameError(true);
      setFormError("Give the subsection a name before saving.");
      return;
    }
    setFormError("");
    try {
      setSaving(true);
      const payload = {
        ...form,
        section: sectionId,
        subSectionLength: form.subSectionLength === "" ? 0 : Number(form.subSectionLength),
        estimatedDepth: form.estimatedDepth === "" ? 0 : Number(form.estimatedDepth),
        proposedOffsetFromCenterOfRoad:
          form.proposedOffsetFromCenterOfRoad === "" ? 0 : Number(form.proposedOffsetFromCenterOfRoad),
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
      fetchSubsections();
    } catch (e) {
      setFormError(e.message || "Failed to save subsection");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError("");
      await subsectionsService.remove(deleteTarget._id);
      setDeleteTarget(null);
      fetchSubsections();
    } catch (e) {
      setDeleteError(e.message || "Failed to delete subsection");
    } finally {
      setDeleting(false);
    }
  };

  const openSubsection = (sub) => navigate(`/subsections/${sub._id}/trenching`, { state: routeState });
  const askDelete = (sub) => {
    setDeleteError("");
    setDeleteTarget(sub);
  };
  // Go back to this section's block or location, not just the previous page
  const backToSections = () => {
    if (blockProfileId) navigate(`/block-profiles/${blockProfileId}?tab=sections`);
    else if (sectionMeta?.location) navigate(`/location/${sectionMeta.location}/sections`);
    else navigate(-1);
  };

  const sectionContext = sectionMeta
    ? [`Section: ${sectionMeta.name || "Untitled section"}`, [sectionMeta.block, sectionMeta.district].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" · ")
    : null;

  const selectField = (key, label) => (
    <TextField select label={label} value={form[key]} onChange={updateForm(key)} size="small">
      <MenuItem value="">
        <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
          Not specified
        </Typography>
      </MenuItem>
      {OPTIONS[key].map((option) => (
        <MenuItem key={option} value={option}>
          {optionLabel(option)}
        </MenuItem>
      ))}
    </TextField>
  );

  const conditions = (sub) =>
    [sub.methodOfConstruction, sub.roadSurfaceType, sub.protectionType].filter(Boolean).map(optionLabel).join(" · ");

  const emptyState = (
    <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {query ? `No subsections match "${query}"` : "No subsections in this section yet"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        {query ? "Try a different name or road." : "Subsections record road, soil and construction details for each stretch."}
      </Typography>
      {!query && (
        <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd} sx={{ mt: 2 }}>
          Add subsection
        </Button>
      )}
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Subsections"
        subtitle={sectionContext || "Stretches of this section"}
        actions={
          <>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={backToSections}>
              Back to sections
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
              Add subsection
            </Button>
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={fetchSubsections}>Retry</Button>}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            size="small"
            placeholder="Search by name or road"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ width: { xs: "100%", sm: 320 } }}
            slotProps={{
              htmlInput: { "aria-label": "Search subsections" },
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
              {total} {total === 1 ? "subsection" : "subsections"}
            </Typography>
          )}
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchSubsections} aria-label="Refresh subsections">
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
        ) : items.length === 0 ? (
          emptyState
        ) : isPhone ? (
          <Box sx={{ opacity: refreshing ? 0.6 : 1, transition: "opacity 150ms" }}>
            {items.map((sub) => (
              <Box
                key={sub._id}
                onClick={() => openSubsection(sub)}
                sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {sub.name || "Untitled subsection"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {[sub.roadName, formatLength(sub.subSectionLength)].filter((value) => value && value !== "—").join(" · ") || "—"}
                    </Typography>
                  </Box>
                  <SubsectionActions subsection={sub} onEdit={openEdit} onDelete={askDelete} />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 1 }}>
                  {conditions(sub) && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {conditions(sub)}
                    </Typography>
                  )}
                  {sub.waterLoggedArea && <StatusPill label="Water-logged" tone="warning" />}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <TableContainer sx={{ opacity: refreshing ? 0.6 : 1, transition: "opacity 150ms" }}>
            <Table sx={{ minWidth: 960 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Subsection</TableCell>
                  <TableCell>From → To</TableCell>
                  <TableCell align="right">Length</TableCell>
                  <TableCell>Construction · surface · protection</TableCell>
                  <TableCell>Flags</TableCell>
                  <TableCell align="right">Actions</TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((sub) => (
                  <TableRow key={sub._id} hover onClick={() => openSubsection(sub)} sx={{ cursor: "pointer" }}>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {sub.name || "Untitled subsection"}
                      </Typography>
                      {(sub.roadName || sub.description) && (
                        <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
                          {sub.roadName ? `Road: ${sub.roadName}` : sub.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      <Typography variant="body2">{sub.fromLatLong || "—"}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {sub.toLatLong || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {formatLength(sub.subSectionLength)}
                    </TableCell>
                    <TableCell sx={{ color: conditions(sub) ? "text.primary" : "text.disabled" }}>{conditions(sub) || "—"}</TableCell>
                    <TableCell>{sub.waterLoggedArea ? <StatusPill label="Water-logged" tone="warning" /> : <Typography variant="body2" sx={{ color: "text.disabled" }}>—</Typography>}</TableCell>
                    <TableCell align="right">
                      <SubsectionActions subsection={sub} onEdit={openEdit} onDelete={askDelete} />
                    </TableCell>
                    <TableCell padding="checkbox">
                      <ChevronRightIcon fontSize="small" sx={{ color: "text.disabled", display: "block" }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!isLoading && total > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
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

      {/* Add / edit subsection */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit subsection" : "Add subsection"}
        subtitle={sectionContext}
        saving={saving}
        submitLabel={editing ? "Save changes" : "Add subsection"}
        onSubmit={handleSave}
        error={formError}
        onDismissError={() => setFormError("")}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
          <SectionTitle>Basic information</SectionTitle>
          <TextField
            label="Name"
            value={form.name}
            onChange={updateForm("name")}
            size="small"
            required
            error={nameError}
            helperText={nameError ? "Required" : undefined}
          />
          <TextField label="Road name" value={form.roadName} onChange={updateForm("roadName")} size="small" />
          <TextField
            label="Length (m)"
            type="number"
            value={form.subSectionLength}
            onChange={updateForm("subSectionLength")}
            size="small"
            slotProps={{ htmlInput: { min: 0 } }}
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
          <TextField label="From (lat, long)" value={form.fromLatLong} onChange={updateForm("fromLatLong")} size="small" />
          <TextField label="To (lat, long)" value={form.toLatLong} onChange={updateForm("toLatLong")} size="small" />
          <Box sx={{ display: { xs: "none", md: "block" } }} />

          <Divider sx={{ gridColumn: "1 / -1", my: 1 }} />
          <SectionTitle>Route conditions</SectionTitle>
          {selectField("proposedOfcSide", "Proposed OFC side")}
          {selectField("alignmentType", "Alignment type")}
          {selectField("soilStatus", "Soil status")}
          {selectField("roadSurfaceType", "Road surface")}
          {selectField("methodOfConstruction", "Method of construction")}
          {selectField("pitType", "Pit type")}
          {selectField("protectionType", "Protection type")}
          <TextField
            label="Estimated depth (m)"
            type="number"
            value={form.estimatedDepth}
            onChange={updateForm("estimatedDepth")}
            size="small"
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            label="Offset from road centre (m)"
            type="number"
            value={form.proposedOffsetFromCenterOfRoad}
            onChange={updateForm("proposedOffsetFromCenterOfRoad")}
            size="small"
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <FormControlLabel
            control={<Switch checked={form.waterLoggedArea} onChange={updateForm("waterLoggedArea")} />}
            label="Water-logged area"
            sx={{ gridColumn: "1 / -1" }}
          />

          <Divider sx={{ gridColumn: "1 / -1", my: 1 }} />
          <SectionTitle>Right of way</SectionTitle>
          {selectField("rowOwnership", "Ownership")}
          <TextField label="Authority" value={form.rowAuthority} onChange={updateForm("rowAuthority")} size="small" />
          <TextField label="Authority contact name" value={form.rowAuthorityName} onChange={updateForm("rowAuthorityName")} size="small" />
          <TextField
            label="Authority address"
            value={form.rowAuthorityAddress}
            onChange={updateForm("rowAuthorityAddress")}
            size="small"
            sx={{ gridColumn: "1 / -1" }}
          />
          <TextField
            label="Feasibility"
            value={form.rowFeasibility}
            onChange={updateForm("rowFeasibility")}
            size="small"
            multiline
            minRows={2}
            sx={{ gridColumn: "1 / -1" }}
          />

          <Divider sx={{ gridColumn: "1 / -1", my: 1 }} />
          <TextField
            label="Remarks"
            value={form.remarks}
            onChange={updateForm("remarks")}
            size="small"
            multiline
            minRows={2}
            sx={{ gridColumn: "1 / -1" }}
          />
        </Box>
      </FormDialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Delete subsection?"
        error={deleteError}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      >
        "{deleteTarget?.name || "This subsection"}" will be deleted. This can't be undone.
      </ConfirmDeleteDialog>
    </Box>
  );
};

export default SubsectionsPage;
