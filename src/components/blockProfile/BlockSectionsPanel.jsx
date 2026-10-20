import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import sectionsService from "../../services/sectionsService.jsx";
import StatusPill from "../common/StatusPill";
import FormDialog from "../common/FormDialog";
import ConfirmDeleteDialog from "../common/ConfirmDeleteDialog";
import { formatNumber } from "../../utils/formatNumber";
import { formatLength } from "./blockProfileConstants";
import { RestorationLine, StackBar } from "../execution/execUi";
import { countLabel } from "../../utils/executionFormat";

const SECTION_STATUSES = {
  1: { label: "Draft", tone: "default" },
  2: { label: "In Progress", tone: "warning" },
  3: { label: "Completed", tone: "success" },
  4: { label: "Archived", tone: "default" },
};

// fromNode / toNode hold a node value like "GP:221001" while editing
const EMPTY_FORM = {
  name: "",
  description: "",
  fromNode: "",
  toNode: "",
  sectionLength: "",
  status: 1,
  routeType: "NEW",
};

const ROUTE_TYPES = { NEW: "New route", EXISTING: "Existing route" };

const SEARCH_DEBOUNCE_MS = 400;

// C5: subsections by status and the restoration state
const SectionProgress = ({ section }) =>
  section.restoration ? (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {countLabel(section.restoration.total || 0, "subsection")}
      </Typography>
      <StackBar counts={section.counts} />
      <RestorationLine restoration={section.restoration} sx={{ mt: 0.75 }} />
    </Box>
  ) : null;

// The block's BHQ and GPs: the points a section can start and end at
const blockNodes = (profile) => [
  ...(profile.bhq?.code
    ? [{ type: "BHQ", code: profile.bhq.code, name: profile.bhq.name, latitude: profile.bhq.latitude, longitude: profile.bhq.longitude }]
    : []),
  ...(profile.gps || []).map((gp) => ({ type: "GP", code: gp.lgdCode, name: gp.name, latitude: gp.latitude, longitude: gp.longitude })),
];

// Select values are "TYPE:code"; the server gets { type, code } back and fills in the rest
const nodeValue = (node) => (node?.type && node?.code ? `${node.type}:${node.code}` : "");
const nodeRef = (value) => {
  const separator = value.indexOf(":");
  return { type: value.slice(0, separator), code: value.slice(separator + 1) };
};
const formatCoordinates = (node) => (node.latitude != null && node.longitude != null ? `${node.latitude}, ${node.longitude}` : "");

// A section end in the table: the node's name, or the stored lat/long for older sections
const SectionEnd = ({ node, latLong }) =>
  node ? (
    <>
      <Typography variant="body2">{node.name || node.code}</Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {[node.type, latLong].filter(Boolean).join(" · ")}
      </Typography>
    </>
  ) : (
    <Typography variant="body2" sx={{ color: latLong ? "text.primary" : "text.disabled" }}>
      {latLong || "—"}
    </Typography>
  );

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

/**
 * Sections of one block profile: server-filtered list with add, edit and delete.
 * New sections get the block's names and LGD codes from the server.
 * `onChanged` runs after any change so the parent can refresh its totals.
 */
const BlockSectionsPanel = ({ blockProfile, canManage = false, onChanged }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  const blockProfileId = blockProfile._id;
  const nodes = useMemo(() => blockNodes(blockProfile), [blockProfile]);
  const canAddSections = nodes.length >= 2;

  // undefined while the first page loads
  const [items, setItems] = useState(undefined);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const requestIdRef = useRef(0);

  // Add / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [nameError, setNameError] = useState(false);
  const [endErrors, setEndErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchSections = useCallback(async () => {
    // Only the latest request updates the list, so quick searches can't show stale results
    const requestId = ++requestIdRef.current;
    setError("");
    try {
      const res = await sectionsService.list({ blockProfileId, page: page + 1, limit: rowsPerPage, q: query });
      if (requestId !== requestIdRef.current) return;
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setItems((previous) => previous ?? []);
      setError(e.message || "Failed to load sections");
    }
  }, [blockProfileId, page, rowsPerPage, query]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // Search after a short pause in typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isLoading = items === undefined;

  const refresh = () => {
    fetchSections();
    onChanged?.();
  };

  const nodeByValue = (value) => nodes.find((node) => nodeValue(node) === value);
  // Ends that are no longer in the block (or older sections without ends) start empty
  const knownNodeValue = (ref) => (nodeByValue(nodeValue(ref)) ? nodeValue(ref) : "");
  const suggestedName = ({ fromNode, toNode }) => {
    const from = nodeByValue(fromNode);
    const to = nodeByValue(toNode);
    return from && to ? `${from.name} – ${to.name}` : "";
  };

  const openDialog = (section, values) => {
    setEditing(section);
    setForm(values);
    setFormError("");
    setNameError(false);
    setEndErrors({});
    setDialogOpen(true);
  };

  const openAdd = () => openDialog(null, EMPTY_FORM);

  const openEdit = (section) =>
    openDialog(section, {
      name: section.name || "",
      description: section.description || "",
      fromNode: knownNodeValue(section.fromNode),
      toNode: knownNodeValue(section.toNode),
      sectionLength: section.sectionLength ?? "",
      status: section.status ?? 1,
      routeType: section.routeType || "NEW",
    });

  const updateForm = (key) => (event) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [key]: value }));
    if (key === "name" && value.trim()) setNameError(false);
  };

  // The name follows the chosen ends until it's typed by hand
  const updateEnd = (key) => (event) => {
    const { value } = event.target;
    setForm((previous) => {
      const next = { ...previous, [key]: value };
      const followsEnds = !previous.name.trim() || previous.name === suggestedName(previous);
      if (followsEnds && suggestedName(next)) next.name = suggestedName(next);
      return next;
    });
    setEndErrors((previous) => ({ ...previous, [key]: "" }));
    setNameError(false);
  };

  const handleSave = async () => {
    const missingEnds = {
      fromNode: form.fromNode ? "" : "Required",
      toNode: form.toNode ? "" : "Required",
    };
    if (!form.name.trim() || missingEnds.fromNode || missingEnds.toNode) {
      setNameError(!form.name.trim());
      setEndErrors(missingEnds);
      setFormError("Choose where the section starts and ends, and give it a name.");
      return;
    }
    setFormError("");
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        description: form.description,
        sectionLength: form.sectionLength === "" ? 0 : Number(form.sectionLength),
        status: Number(form.status),
        routeType: form.routeType,
        // The server copies the block's names and LGD codes onto the section,
        // and the end coordinates from these nodes
        blockProfile: blockProfileId,
        fromNode: nodeRef(form.fromNode),
        toNode: nodeRef(form.toNode),
      };
      if (editing) {
        await sectionsService.update(editing._id, payload);
      } else {
        await sectionsService.create(payload);
      }
      setDialogOpen(false);
      setEditing(null);
      refresh();
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
      refresh();
    } catch (e) {
      setDeleteError(e.message || "Failed to delete section");
    } finally {
      setDeleting(false);
    }
  };

  // The state tells the subsections page (and its breadcrumbs) to lead back to this block
  const openSection = (section) =>
    navigate(`/sections/${section._id}/subsections`, {
      state: { blockProfileId, blockProfileName: blockProfile.block },
    });
  const askDelete = (section) => {
    setDeleteError("");
    setDeleteTarget(section);
  };

  const emptyState = (
    <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {query ? `No sections match "${query}"` : "No sections in this block yet"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        {query ? "Try a different name, description or district." : "Sections split the block's OFC route into stretches you can track."}
      </Typography>
      {!query && canManage && canAddSections && (
        <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd} sx={{ mt: 2 }}>
          Add section
        </Button>
      )}
    </Box>
  );

  return (
    <>
      {canManage && !canAddSections && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Sections run between the block's BHQ and GPs. Add at least two of them to this block profile before adding sections.
        </Alert>
      )}

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
              {formatNumber(total)} {total === 1 ? "section" : "sections"}
              {!query && blockProfile.sectionLength > 0 && ` · ${formatNumber(blockProfile.sectionLength)} m in total`}
            </Typography>
          )}
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={refresh} aria-label="Refresh sections">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {canManage && (
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openAdd} disabled={!canAddSections}>
              Add section
            </Button>
          )}
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
          <Box>
            {items.map((section) => {
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
                      {section.fromNode && section.toNode && (
                        <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
                          {section.fromNode.name} → {section.toNode.name}
                        </Typography>
                      )}
                      {section.description && (
                        <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
                          {section.description}
                        </Typography>
                      )}
                    </Box>
                    {canManage && <SectionActions section={section} onEdit={openEdit} onDelete={askDelete} />}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 1 }}>
                    <StatusPill label={status.label} tone={status.tone} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {formatLength(section.sectionLength)}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <SectionProgress section={section} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Section</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell align="right">Length</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ width: 280 }}>Execution</TableCell>
                  {canManage && <TableCell align="right">Actions</TableCell>}
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((section) => {
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
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        <SectionEnd node={section.fromNode} latLong={section.fromLatLong} />
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        <SectionEnd node={section.toNode} latLong={section.toLatLong} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {formatLength(section.sectionLength)}
                      </TableCell>
                      <TableCell>
                        <StatusPill label={status.label} tone={status.tone} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <SectionProgress section={section} />
                      </TableCell>
                      {canManage && (
                        <TableCell align="right">
                          <SectionActions section={section} onEdit={openEdit} onDelete={askDelete} />
                        </TableCell>
                      )}
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

      {/* Add / edit section */}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit section" : "Add section"}
        subtitle={[blockProfile.block, blockProfile.district].filter(Boolean).join(", ")}
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
          {[
            { key: "fromNode", label: "From", other: "toNode", previous: editing?.fromLatLong },
            { key: "toNode", label: "To", other: "fromNode", previous: editing?.toLatLong },
          ].map(({ key, label, other, previous }) => {
            const node = nodeByValue(form[key]);
            const hint = node
              ? formatCoordinates(node) || `No coordinates on this ${node.type} yet; add them on the block profile`
              : previous && `Was ${previous}`;
            return (
              <TextField
                key={key}
                select
                label={label}
                value={form[key]}
                onChange={updateEnd(key)}
                size="small"
                required
                error={Boolean(endErrors[key])}
                helperText={endErrors[key] || hint || " "}
                slotProps={{
                  // The closed field shows just the node; the menu also lists codes and coordinates
                  select: { renderValue: (value) => (nodeByValue(value) ? `${nodeByValue(value).type} · ${nodeByValue(value).name}` : "") },
                }}
              >
                {nodes.map((option) => {
                  const value = nodeValue(option);
                  return (
                    // A section can't start and end at the same node
                    <MenuItem key={value} value={value} disabled={value === form[other]}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" noWrap>
                          {option.type} · {option.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {[option.type === "GP" ? `LGD ${option.code}` : `Code ${option.code}`, formatCoordinates(option) || "no coordinates"].join(" · ")}
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}
              </TextField>
            );
          })}
          <TextField
            label="Length (m)"
            type="number"
            value={form.sectionLength}
            onChange={updateForm("sectionLength")}
            size="small"
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            select
            label="Route type"
            value={form.routeType}
            onChange={updateForm("routeType")}
            size="small"
            helperText="Existing routes are drawn dashed on the diagrams"
          >
            {Object.entries(ROUTE_TYPES).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
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
    </>
  );
};

export default BlockSectionsPanel;
