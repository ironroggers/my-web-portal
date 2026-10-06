import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  Collapse,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Skeleton,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
  PhotoLibraryOutlined as PhotoLibraryIcon,
  FilterListOff as FilterListOffIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAllHotoList, fetchLocationDetails, deleteHoto } from "../services/hotoPageService";
import AddHotoModal from "./hotoPage/components/AddHotoModal";
import EditHotoModal from "./hotoPage/components/EditHotoModal";
import ExportButton from "./hotoPage/components/ExportButton";
import { getHotoTypeLabel } from "./hotoPage/hotoTypes";
import PageHeader from "./common/PageHeader";
import StatTile from "./common/StatTile";
import StatusPill from "./common/StatusPill";
import MediaViewerDialog from "./common/MediaViewerDialog";
import MediaTile from "./common/MediaTile";
import DetailRow from "./common/DetailRow";
import ConfirmDeleteDialog from "./common/ConfirmDeleteDialog";
import { formatMediaDate, getCoordinates, googleMapsUrl } from "../utils/mediaUtils";

const DATE_FILTERS = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
];

const MEDIA_FILTERS = [
  { value: "", label: "With or without media" },
  { value: "yes", label: "With media" },
  { value: "no", label: "Without media" },
];

const countMedia = (hoto) => (hoto.fields || []).reduce((total, field) => total + (field.mediaFiles?.length || 0), 0);

// "Block · Vypin", "GP · Elamkunnapuzha"…
const getHotoTitle = (hoto) => {
  const type = hoto.hotoType?.toLowerCase();
  const name = (type === "gp" && hoto.gpName) || (type === "ofc" && hoto.ofcName) || hoto.blockName || hoto.gpName || hoto.ofcName;
  return `${getHotoTypeLabel(hoto.hotoType) || "HOTO"} · ${name || "Unnamed"}`;
};

const HotoRow = ({ hoto, expanded, onToggle, onEdit, onDelete, onOpenMedia }) => {
  const mediaCount = countMedia(hoto);
  const coordinates = getCoordinates(hoto);
  const contact = hoto.contactPerson || {};
  const panelId = `hoto-panel-${hoto._id}`;

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Box sx={{ display: "flex", alignItems: "stretch" }}>
        <ButtonBase
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            display: "flex",
            // Stretch on phones so long text truncates instead of overflowing
            alignItems: { xs: "stretch", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 1, md: 2 },
            pl: 2.5,
            pr: 1,
            py: 1.75,
            textAlign: "left",
            bgcolor: expanded ? alpha(theme.palette.primary.main, 0.03) : "transparent",
            "&:hover": { bgcolor: "action.hover" },
            "&.Mui-focusVisible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
          })}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flex: 1, minWidth: 0 }}>
            <ExpandMoreIcon
              fontSize="small"
              sx={{ mt: 0.25, color: "text.secondary", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {getHotoTitle(hoto)}
              </Typography>
              <Typography variant="body2" noWrap sx={{ color: "text.secondary", maxWidth: { md: 520 } }}>
                {hoto.remarks || (contact.name ? `Contact: ${contact.name}` : "No remarks")}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, pl: { xs: 4, md: 0 } }}>
            <StatusPill label={getHotoTypeLabel(hoto.hotoType) || "Unknown"} tone="default" />
            <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 56 }}>
              {hoto.fields?.length || 0} {hoto.fields?.length === 1 ? "field" : "fields"}
            </Typography>
            <Typography variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "text.secondary", minWidth: 40 }}>
              <PhotoLibraryIcon sx={{ fontSize: 16 }} />
              {mediaCount}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", minWidth: { md: 150 }, textAlign: { md: "right" } }}>
              {formatMediaDate(hoto.createdAt) || "—"}
            </Typography>
          </Box>
        </ButtonBase>
        <Box sx={{ display: "flex", alignItems: { xs: "flex-start", md: "center" }, gap: 0.5, pr: 1.5, pt: { xs: 1.5, md: 0 } }}>
          <Tooltip title="Edit HOTO">
            <IconButton size="small" aria-label={`Edit ${getHotoTitle(hoto)}`} onClick={() => onEdit(hoto)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete HOTO">
            <IconButton
              size="small"
              aria-label={`Delete ${getHotoTitle(hoto)}`}
              onClick={() => onDelete(hoto)}
              sx={{ "&:hover": { color: "error.main" } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Box id={panelId} sx={{ px: 2.5, pb: 2.5, pt: 0.5, pl: { md: 6.5 } }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" component="h3" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Record
              </Typography>
              <Box>
                <DetailRow label="Created">{formatMediaDate(hoto.createdAt)}</DetailRow>
                <DetailRow label="Updated">{formatMediaDate(hoto.updatedAt)}</DetailRow>
                <DetailRow label="Block">{[hoto.blockName, hoto.blockCode].filter(Boolean).join(" · ")}</DetailRow>
                <DetailRow label="GP">{[hoto.gpName, hoto.gpCode].filter(Boolean).join(" · ")}</DetailRow>
                <DetailRow label="OFC">{[hoto.ofcName, hoto.ofcCode].filter(Boolean).join(" · ")}</DetailRow>
                <DetailRow label="Coordinates">
                  {coordinates && (
                    <>
                      {coordinates.latitude}, {coordinates.longitude}
                      <Link
                        href={googleMapsUrl(coordinates.latitude, coordinates.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: "block", fontWeight: 600 }}
                      >
                        Google Maps
                      </Link>
                    </>
                  )}
                </DetailRow>
              </Box>

              {(contact.name || contact.mobile || contact.email || contact.description) && (
                <>
                  <Typography variant="overline" component="h3" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mt: 2 }}>
                    Contact person
                  </Typography>
                  <Box>
                    <DetailRow label="Name">{contact.name}</DetailRow>
                    <DetailRow label="Mobile">{contact.mobile}</DetailRow>
                    <DetailRow label="Email">{contact.email}</DetailRow>
                    <DetailRow label="Notes">{contact.description}</DetailRow>
                  </Box>
                </>
              )}

              {hoto.remarks && (
                <>
                  <Typography variant="overline" component="h3" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mt: 2 }}>
                    Remarks
                  </Typography>
                  <Typography variant="body2">{hoto.remarks}</Typography>
                </>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="overline" component="h3" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Fields ({hoto.fields?.length || 0})
              </Typography>
              {hoto.fields?.length > 0 ? (
                <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, bgcolor: "background.paper" }}>
                  {hoto.fields.map((field, fieldIndex) => (
                    <Box
                      key={field._id || fieldIndex}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 2fr) minmax(0, 3fr)" },
                        gap: { xs: 0.5, sm: 2 },
                        px: 1.5,
                        py: 1.25,
                        "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          <Box component="span" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", mr: 1 }}>
                            {field.sequence || fieldIndex + 1}
                          </Box>
                          {field.key}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
                          {field.confirmation !== undefined && (
                            <StatusPill label={field.confirmation ? "Confirmed" : "Not confirmed"} tone={field.confirmation ? "success" : "warning"} />
                          )}
                          {field.status === 0 && <StatusPill label="Inactive" tone="default" />}
                        </Box>
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ color: field.value ? "text.primary" : "text.disabled", overflowWrap: "anywhere" }}>
                          {field.value || "No value"}
                        </Typography>
                        {field.remarks && (
                          <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 0.25 }}>
                            {field.remarks}
                          </Typography>
                        )}
                        {field.mediaFiles?.length > 0 && (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                            {field.mediaFiles.map((media, mediaIndex) => (
                              <MediaTile
                                key={mediaIndex}
                                media={media}
                                size={64}
                                label={media.description || `${field.key} ${mediaIndex + 1}`}
                                onOpen={(item) => onOpenMedia(item, `Field: ${field.key}`)}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No fields recorded for this HOTO.
                </Typography>
              )}
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
};

const HotoDetailsPage = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();

  const [location, setLocation] = useState(null);
  const [hotos, setHotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedHotos, setExpandedHotos] = useState({});
  const [selectedMedia, setSelectedMedia] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHotoForEdit, setSelectedHotoForEdit] = useState(null);

  const [hotoToDelete, setHotoToDelete] = useState(null);
  const [deletingHoto, setDeletingHoto] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [hasMediaFilter, setHasMediaFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  // `quiet` refreshes after a save or delete without swapping the page for a skeleton
  const fetchHotoData = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        setError(null);
        const [locationResponse, hotoResponse] = await Promise.all([
          fetchLocationDetails(locationId),
          fetchAllHotoList(locationId),
        ]);

        if (!locationResponse.success) {
          throw new Error("This location couldn't be found. It may have been removed.");
        }

        setLocation(locationResponse.data);
        setHotos([...hotoResponse.blockHotoInfo, ...hotoResponse.gpHotoInfo, ...hotoResponse.ofcHotoInfo]);
      } catch (err) {
        setError(err.message || "Failed to fetch HOTO data");
      } finally {
        setLoading(false);
      }
    },
    [locationId]
  );

  useEffect(() => {
    fetchHotoData();
  }, [fetchHotoData]);

  const filteredHotos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let since = null;
    const now = new Date();
    if (dateFilter === "today") since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateFilter === "week") since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (dateFilter === "month") since = new Date(now.getFullYear(), now.getMonth(), 1);

    return hotos.filter((hoto) => {
      if (
        query &&
        ![hoto.hotoType, hoto.blockName, hoto.gpName, hoto.ofcName, hoto.remarks].some((value) => (value || "").toLowerCase().includes(query)) &&
        !(hoto.fields || []).some(
          (field) => (field.key || "").toLowerCase().includes(query) || String(field.value ?? "").toLowerCase().includes(query)
        )
      ) {
        return false;
      }
      if (typeFilter && hoto.hotoType !== typeFilter) return false;
      if (hasMediaFilter && (countMedia(hoto) > 0) !== (hasMediaFilter === "yes")) return false;
      if (since && new Date(hoto.createdAt) < since) return false;
      return true;
    });
  }, [hotos, searchTerm, typeFilter, hasMediaFilter, dateFilter]);

  // Back to the first page whenever the filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, typeFilter, hasMediaFilter, dateFilter]);

  const currentPage = Math.min(page, Math.max(0, Math.ceil(filteredHotos.length / rowsPerPage) - 1));
  const pageHotos = filteredHotos.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);
  const filtersActive = Boolean(searchTerm || typeFilter || hasMediaFilter || dateFilter);
  const typeOptions = [...new Set(hotos.map((hoto) => hoto.hotoType).filter(Boolean))];

  const stats = useMemo(() => {
    const byType = ["block", "gp", "ofc"]
      .map((type) => [type, hotos.filter((hoto) => hoto.hotoType === type).length])
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${getHotoTypeLabel(type)} ${count}`);
    return {
      byType: byType.join(" · "),
      totalFields: hotos.reduce((total, hoto) => total + (hoto.fields?.length || 0), 0),
      totalMedia: hotos.reduce((total, hoto) => total + countMedia(hoto), 0),
      withMedia: hotos.filter((hoto) => countMedia(hoto) > 0).length,
    };
  }, [hotos]);

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setHasMediaFilter("");
    setDateFilter("");
  };

  const handleOpenEditModal = (hoto) => {
    setSelectedHotoForEdit(hoto);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedHotoForEdit(null);
  };

  const askDelete = (hoto) => {
    setDeleteError("");
    setHotoToDelete(hoto);
  };

  const handleConfirmDelete = async () => {
    if (!hotoToDelete) return;
    try {
      setDeletingHoto(true);
      setDeleteError("");
      await deleteHoto(hotoToDelete._id);
      setHotoToDelete(null);
      await fetchHotoData(true);
    } catch (err) {
      setDeleteError(err.message || "Couldn't delete this HOTO. Please try again.");
    } finally {
      setDeletingHoto(false);
    }
  };

  const locationTitle = [location?.block, location?.district].filter(Boolean).join(", ");

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={240} height={40} />
        <Skeleton variant="text" width={320} sx={{ mb: 3 }} />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Array.from({ length: 3 }, (_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 4 }}>
              <Skeleton variant="rounded" height={112} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={360} />
      </Box>
    );
  }

  if (error && !location) {
    return (
      <Box>
        <PageHeader
          title="HOTO"
          actions={
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
              Back
            </Button>
          }
        />
        <Card sx={{ py: 6, px: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {error}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, mt: 2.5 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchHotoData()}>
              Try again
            </Button>
            <Button variant="contained" onClick={() => navigate("/map")}>
              Go to Locations
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="HOTO"
        subtitle={[locationTitle, "Handover and takeover records"].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
              Back
            </Button>
            <ExportButton hotos={hotos} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsAddModalOpen(true)}>
              Add HOTO
            </Button>
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={() => fetchHotoData(true)}>Retry</Button>}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatTile label="HOTO records" value={hotos.length} caption={stats.byType || "None recorded yet"} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatTile
            label="Fields recorded"
            value={stats.totalFields}
            caption={hotos.length ? `About ${Math.round(stats.totalFields / hotos.length)} per record` : "Across all records"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatTile
            label="Media files"
            value={stats.totalMedia}
            caption={hotos.length ? `${stats.withMedia} of ${hotos.length} records have photos or videos` : "Photos and videos"}
          />
        </Grid>
      </Grid>

      <Card>
        {/* Filters */}
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            size="small"
            placeholder="Search names, remarks, fields and values"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            sx={{ width: { xs: "100%", md: 320 } }}
            slotProps={{
              htmlInput: { "aria-label": "Search HOTO records" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setSearchTerm("")}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField select size="small" label="Type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">All types</MenuItem>
            {typeOptions.map((type) => (
              <MenuItem key={type} value={type}>
                {getHotoTypeLabel(type)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Media" value={hasMediaFilter} onChange={(event) => setHasMediaFilter(event.target.value)} sx={{ minWidth: 180 }}>
            {MEDIA_FILTERS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Created" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} sx={{ minWidth: 140 }}>
            {DATE_FILTERS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          {filtersActive && (
            <Button size="small" startIcon={<FilterListOffIcon />} onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {filtersActive ? `${filteredHotos.length} of ${hotos.length} records` : `${hotos.length} ${hotos.length === 1 ? "record" : "records"}`}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => fetchHotoData(true)} aria-label="Refresh HOTO records">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {filteredHotos.length === 0 ? (
          <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {filtersActive ? "No HOTO records match these filters" : "No HOTO records for this location yet"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {filtersActive ? "Try a different search or clear the filters." : "Add the block, GP or OFC handover details to get started."}
            </Typography>
            {filtersActive ? (
              <Button size="small" onClick={clearFilters} sx={{ mt: 1.5 }}>
                Clear filters
              </Button>
            ) : (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setIsAddModalOpen(true)} sx={{ mt: 2 }}>
                Add HOTO
              </Button>
            )}
          </Box>
        ) : (
          <>
            {pageHotos.map((hoto) => (
              <HotoRow
                key={hoto._id}
                hoto={hoto}
                expanded={Boolean(expandedHotos[hoto._id])}
                onToggle={() => setExpandedHotos((previous) => ({ ...previous, [hoto._id]: !previous[hoto._id] }))}
                onEdit={handleOpenEditModal}
                onDelete={askDelete}
                onOpenMedia={(media, subtitle) => setSelectedMedia({ media, subtitle })}
              />
            ))}
            <TablePagination
              component="div"
              count={filteredHotos.length}
              page={currentPage}
              onPageChange={(event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[6, 12, 24]}
              labelRowsPerPage="Records per page:"
            />
          </>
        )}
      </Card>

      {selectedMedia && (
        <MediaViewerDialog media={selectedMedia.media} subtitle={selectedMedia.subtitle} onClose={() => setSelectedMedia(null)} />
      )}

      <AddHotoModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        locationId={locationId}
        locationName={location?.block}
        locationDistrict={location?.district}
        fetchAllHotoInfo={() => fetchHotoData(true)}
      />

      <EditHotoModal
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        hotoId={selectedHotoForEdit?._id}
        locationId={locationId}
        locationName={location?.block}
        locationDistrict={location?.district}
        fetchAllHotoInfo={() => fetchHotoData(true)}
      />

      <ConfirmDeleteDialog
        open={Boolean(hotoToDelete)}
        title="Delete HOTO record?"
        error={deleteError}
        deleting={deletingHoto}
        onCancel={() => setHotoToDelete(null)}
        onConfirm={handleConfirmDelete}
        confirmLabel="Delete HOTO"
      >
        {hotoToDelete && (
          <>
            "{getHotoTitle(hotoToDelete)}", with its {hotoToDelete.fields?.length || 0} fields and {countMedia(hotoToDelete)} media
            files, will be deleted. This can't be undone.
          </>
        )}
      </ConfirmDeleteDialog>
    </Box>
  );
};

export default HotoDetailsPage;
