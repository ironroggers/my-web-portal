import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Paper,
  Alert,
  Breadcrumbs,
  Link,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Badge,
  Tooltip,
  CardMedia,
  Collapse,
} from "@mui/material";
import {
  LocationOn as LocationOnIcon,
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  Public as PublicIcon,
  Terrain as TerrainIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  GpsFixed as GPSIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Close as CloseIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Image as ImageIcon,
  OndemandVideo as VideoIcon,
  InsertDriveFile as FileIcon,
  Description as DescriptionIcon,
  Numbers as NumbersIcon,
  List as ListIcon,
  Folder as FolderIcon,
  OpenInNew as OpenInNewIcon,
  GetApp as DownloadIcon,
  PhoneAndroid as PhoneAndroidIcon,
  AccessTime as AccessTimeIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchAllHotoList,
  fetchLocationDetails,
  uploadHotoMedia,
  createHoto,
  deleteHoto,
} from "../services/hotoPageService";

// Import the existing form components
import AddHotoModal from "./hotoPage/components/AddHotoModal";
import EditHotoModal from "./hotoPage/components/EditHotoModal";

const HotoDetailsPage = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();

  // State
  const [location, setLocation] = useState(null);
  const [hotos, setHotos] = useState([]);
  const [filteredHotos, setFilteredHotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedHotos, setExpandedHotos] = useState({});
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

  // Add HOTO Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Edit HOTO Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHotoForEdit, setSelectedHotoForEdit] = useState(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [hotoToDelete, setHotoToDelete] = useState(null);
  const [deletingHoto, setDeletingHoto] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [hasMediaFilter, setHasMediaFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  useEffect(() => {
    fetchHotoData();
  }, [locationId]);

  useEffect(() => {
    applyFilters();
  }, [hotos, searchTerm, typeFilter, hasMediaFilter, dateFilter]);

  const fetchHotoData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch location details and HOTO data
      const [locationResponse, hotoResponse] = await Promise.all([
        fetchLocationDetails(locationId),
        fetchAllHotoList(locationId),
      ]);

      if (!locationResponse.success) {
        throw new Error("Failed to fetch location details");
      }

      setLocation(locationResponse.data);

      // Combine all HOTO types into a single array for the unified view
      const allHotos = [
        ...hotoResponse.blockHotoInfo,
        ...hotoResponse.gpHotoInfo,
        ...hotoResponse.ofcHotoInfo,
      ];

      setHotos(allHotos);
    } catch (err) {
      console.error("Error fetching HOTO data:", err);
      setError(err.message || "Failed to fetch HOTO data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...hotos];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (hoto) =>
          (hoto.hotoType || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (hoto.blockName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (hoto.gpName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (hoto.ofcName || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (hoto.remarks || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (hoto.fields || []).some(
            (field) =>
              (field.key || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              (field.value || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
          )
      );
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter((hoto) => hoto.hotoType === typeFilter);
    }

    // Has media filter
    if (hasMediaFilter) {
      filtered = filtered.filter((hoto) => {
        const hasMedia = (hoto.fields || []).some(
          (field) => field.mediaFiles && field.mediaFiles.length > 0
        );
        return hasMediaFilter === "yes" ? hasMedia : !hasMedia;
      });
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      let filterDate;
      switch (dateFilter) {
        case "today":
          filterDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          filterDate = null;
      }
      if (filterDate) {
        filtered = filtered.filter(
          (hoto) => new Date(hoto.createdAt) >= filterDate
        );
      }
    }

    setFilteredHotos(filtered);
    setPage(0);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setHasMediaFilter("");
    setDateFilter("");
  };

  const toggleHotoExpansion = (hotoId) => {
    setExpandedHotos((prev) => ({
      ...prev,
      [hotoId]: !prev[hotoId],
    }));
  };

  const getHotoTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case "block":
        return "primary";
      case "gp":
        return "secondary";
      case "ofc":
        return "success";
      default:
        return "default";
    }
  };

  const getFieldTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "text":
        return <DescriptionIcon fontSize="small" />;
      case "number":
        return <NumbersIcon fontSize="small" />;
      case "dropdown":
        return <ListIcon fontSize="small" />;
      case "media":
        return <PhotoLibraryIcon fontSize="small" />;
      default:
        return <FolderIcon fontSize="small" />;
    }
  };

  const getMediaIcon = (fileType) => {
    const type = fileType?.toLowerCase();
    if (
      type === "image" ||
      type === "jpg" ||
      type === "jpeg" ||
      type === "png" ||
      type === "gif" ||
      type === "bmp"
    ) {
      return <ImageIcon color="primary" />;
    }
    if (
      type === "video" ||
      type === "mp4" ||
      type === "avi" ||
      type === "mov" ||
      type === "wmv" ||
      type === "flv" ||
      type === "webm"
    ) {
      return <VideoIcon color="secondary" />;
    }
    return <FileIcon color="action" />;
  };

  const formatCoordinate = (coordinate) => {
    if (coordinate === null || coordinate === undefined) return "N/A";
    const num =
      typeof coordinate === "string" ? parseFloat(coordinate) : coordinate;
    return isNaN(num) ? "N/A" : num.toFixed(6);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUniqueValues = (key) => {
    const values = hotos.map((hoto) => hoto[key]).filter(Boolean);
    return [...new Set(values)];
  };

  const getHotoStats = () => {
    return {
      totalHotos: hotos.length,
      blockHotos: hotos.filter((h) => h.hotoType === "block").length,
      gpHotos: hotos.filter((h) => h.hotoType === "gp").length,
      ofcHotos: hotos.filter((h) => h.hotoType === "ofc").length,
      totalFields: hotos.reduce((acc, h) => acc + (h.fields?.length || 0), 0),
      totalMedia: hotos.reduce(
        (acc, h) =>
          acc +
          (h.fields?.reduce(
            (facc, f) => facc + (f.mediaFiles?.length || 0),
            0
          ) || 0),
        0
      ),
    };
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Handle Add HOTO modal
  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  // Handle Edit HOTO modal
  const handleOpenEditModal = (hoto) => {
    setSelectedHotoForEdit(hoto);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedHotoForEdit(null);
  };

  // Handle Delete HOTO
  const handleOpenDeleteConfirm = (hoto) => {
    setHotoToDelete(hoto);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setHotoToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!hotoToDelete) return;

    try {
      setDeletingHoto(true);
      await deleteHoto(hotoToDelete._id);
      await fetchHotoData(); // Refresh the data
      handleCloseDeleteConfirm();
    } catch (error) {
      console.error("Error deleting HOTO:", error);
    } finally {
      setDeletingHoto(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading HOTO details...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="contained"
        >
          Go Back
        </Button>
      </Container>
    );
  }

  const stats = getHotoStats();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: "linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)",
          color: "white",
          borderRadius: 2,
        }}
      >
        <Breadcrumbs
          sx={{ mb: 2, "& .MuiBreadcrumbs-separator": { color: "white" } }}
        >
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate("/map")}
            sx={{ cursor: "pointer" }}
          >
            Map View
          </Link>
          <Typography color="inherit">HOTO Information</Typography>
        </Breadcrumbs>

        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              onClick={handleBack}
              sx={{ color: "white", bgcolor: "rgba(255,255,255,0.1)" }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                🏢 HOTO Information
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                {location?.district}, {location?.block}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={handleOpenAddModal}
              sx={{
                borderRadius: "8px",
                px: 3,
                py: 1,
                fontWeight: 600,
                boxShadow: "0 4px 6px rgba(156, 39, 176, 0.2)",
                bgcolor: "rgba(255,255,255,0.9)",
                color: "secondary.main",
                "&:hover": {
                  bgcolor: "white",
                  transform: "translateY(-1px)",
                  boxShadow: "0 6px 12px rgba(156, 39, 176, 0.3)",
                },
              }}
            >
              Add HOTO
            </Button>
            <Paper
              sx={{
                p: 1.5,
                bgcolor: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                minWidth: "100px",
                width: "100px",
                textAlign: "center",
              }}
            >
              <Typography variant="caption" color="white" display="block">
                Total HOTOs
              </Typography>
              <Typography variant="h6" color="white" fontWeight="bold">
                {stats.totalHotos}
              </Typography>
            </Paper>
            <Paper
              sx={{
                p: 1.5,
                bgcolor: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                minWidth: "100px",
                width: "100px",
                textAlign: "center",
              }}
            >
              <Typography variant="caption" color="white" display="block">
                Total Fields
              </Typography>
              <Typography variant="h6" color="white" fontWeight="bold">
                {stats.totalFields}
              </Typography>
            </Paper>
            <Paper
              sx={{
                p: 1.5,
                bgcolor: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                minWidth: "100px",
                width: "100px",
                textAlign: "center",
              }}
            >
              <Typography variant="caption" color="white" display="block">
                Media Files
              </Typography>
              <Typography variant="h6" color="white" fontWeight="bold">
                {stats.totalMedia}
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Paper>

      {/* Main Content Card */}
      <Card elevation={3} sx={{ borderRadius: 3, overflow: "hidden" }}>
        {/* Location Info Header */}
        <CardContent
          sx={{
            background: "linear-gradient(45deg, #f8f9fa 0%, #e9ecef 100%)",
            borderBottom: "1px solid #dee2e6",
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: "success.main", width: 56, height: 56 }}>
                  <BusinessIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {location?.district}, {location?.block}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1}>
                    <Chip
                      icon={<PublicIcon />}
                      label={location?.district}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                    <Chip
                      icon={<BusinessIcon />}
                      label={location?.block}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  </Stack>
                </Box>
              </Box>
            </Grid>

            <Grid xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid xs={6} sm={3}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "primary.50",
                      border: "1px solid",
                      borderColor: "primary.200",
                      minHeight: "80px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h5"
                      color="primary.main"
                      fontWeight="bold"
                    >
                      {stats.blockHotos}
                    </Typography>
                    <Typography variant="caption">Block</Typography>
                  </Paper>
                </Grid>
                <Grid xs={6} sm={3}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "secondary.50",
                      border: "1px solid",
                      borderColor: "secondary.200",
                      minHeight: "80px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h5"
                      color="secondary.main"
                      fontWeight="bold"
                    >
                      {stats.gpHotos}
                    </Typography>
                    <Typography variant="caption">GP</Typography>
                  </Paper>
                </Grid>
                <Grid xs={6} sm={3}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "success.50",
                      border: "1px solid",
                      borderColor: "success.200",
                      minHeight: "80px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h5"
                      color="success.main"
                      fontWeight="bold"
                    >
                      {stats.ofcHotos}
                    </Typography>
                    <Typography variant="caption">OFC</Typography>
                  </Paper>
                </Grid>
                <Grid xs={6} sm={3}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "info.50",
                      border: "1px solid",
                      borderColor: "info.200",
                      minHeight: "80px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h5"
                      color="info.main"
                      fontWeight="bold"
                    >
                      {stats.totalMedia}
                    </Typography>
                    <Typography variant="caption">Media</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>

        {/* Dynamic Filters */}
        <CardContent
          sx={{ bgcolor: "grey.50", borderBottom: "1px solid #dee2e6" }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <FilterListIcon color="primary" />
              HOTO Filters
            </Typography>
            <Button
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              variant="outlined"
              size="small"
            >
              Clear All
            </Button>
          </Box>

          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              placeholder="Search HOTOs, fields, values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                ),
              }}
              size="small"
              sx={{ width: 280 }}
            />
            <FormControl size="small" sx={{ width: 140 }}>
              <InputLabel>HOTO Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="HOTO Type"
              >
                <MenuItem value="">All Types</MenuItem>
                {getUniqueValues("hotoType").map((type) => (
                  <MenuItem key={type} value={type}>
                    {type?.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: 120 }}>
              <InputLabel>Has Media</InputLabel>
              <Select
                value={hasMediaFilter}
                onChange={(e) => setHasMediaFilter(e.target.value)}
                label="Has Media"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="yes">With Media</MenuItem>
                <MenuItem value="no">Without Media</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: 130 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                label="Date Range"
              >
                <MenuItem value="">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
            </FormControl>
            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchHotoData}
              variant="outlined"
              size="small"
              sx={{ width: 100 }}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>

        {/* HOTO Results */}
        <CardContent>
          {filteredHotos.length === 0 ? (
            <Alert severity="info" sx={{ my: 3 }}>
              {searchTerm || typeFilter || hasMediaFilter || dateFilter
                ? "No HOTO entries match your current filters. Try adjusting your search criteria."
                : "No HOTO entries found for this location."}
            </Alert>
          ) : (
            <>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
              >
                <Typography variant="h6" color="primary">
                  🏢 Showing{" "}
                  {
                    filteredHotos.slice(
                      page * rowsPerPage,
                      page * rowsPerPage + rowsPerPage
                    ).length
                  }{" "}
                  of {filteredHotos.length} HOTO entries
                </Typography>
                {filteredHotos.length !== hotos.length && (
                  <Chip
                    label={`Filtered from ${hotos.length} total`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>

              <Stack spacing={2}>
                {filteredHotos
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((hoto) => (
                    <Accordion
                      key={hoto._id}
                      expanded={expandedHotos[hoto._id] || false}
                      onChange={() => toggleHotoExpansion(hoto._id)}
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: 2,
                        "&:before": { display: "none" },
                        boxShadow: expandedHotos[hoto._id] ? 3 : 1,
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          bgcolor: expandedHotos[hoto._id]
                            ? "primary.50"
                            : "white",
                          "&:hover": {
                            bgcolor: expandedHotos[hoto._id]
                              ? "primary.100"
                              : "grey.50",
                          },
                          borderRadius: expandedHotos[hoto._id]
                            ? "8px 8px 0 0"
                            : 2,
                          minHeight: "80px",
                          "& .MuiAccordionSummary-content": {
                            margin: "16px 0",
                            alignItems: "center",
                          },
                        }}
                      >
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          width="100%"
                          py={1}
                        >
                          <Box display="flex" alignItems="center" gap={3}>
                            <Avatar
                              sx={{
                                bgcolor:
                                  hoto.hotoType === "block"
                                    ? "primary.main"
                                    : hoto.hotoType === "gp"
                                    ? "secondary.main"
                                    : "success.main",
                                width: 48,
                                height: 48,
                              }}
                            >
                              <BusinessIcon />
                            </Avatar>
                            <Box>
                              <Typography
                                variant="h6"
                                fontWeight="bold"
                                color="text.primary"
                                sx={{ mb: 0.5 }}
                              >
                                {hoto.hotoType?.toUpperCase()} -{" "}
                                {hoto.blockName ||
                                  hoto.gpName ||
                                  hoto.ofcName ||
                                  "Unknown"}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: "0.875rem" }}
                              >
                                {hoto.remarks ||
                                  (hoto.contactPerson?.name
                                    ? `Contact: ${hoto.contactPerson.name}`
                                    : "No additional details")}
                              </Typography>
                            </Box>
                          </Box>

                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Chip
                              label={hoto.hotoType?.toUpperCase() || "UNKNOWN"}
                              color={
                                hoto.hotoType === "block"
                                  ? "primary"
                                  : hoto.hotoType === "gp"
                                  ? "secondary"
                                  : "success"
                              }
                              size="small"
                              sx={{
                                fontWeight: 600,
                                minWidth: "70px",
                                height: "28px",
                              }}
                            />
                            <Chip
                              label={`${
                                hoto.fields?.reduce(
                                  (acc, f) => acc + (f.mediaFiles?.length || 0),
                                  0
                                ) || 0
                              } Media`}
                              size="small"
                              variant="outlined"
                              color="info"
                              sx={{
                                fontWeight: 500,
                                minWidth: "80px",
                                height: "28px",
                              }}
                            />
                            <Chip
                              label={`${hoto.fields?.length || 0} Fields`}
                              size="small"
                              variant="outlined"
                              color="default"
                              sx={{
                                fontWeight: 500,
                                minWidth: "70px",
                                height: "28px",
                              }}
                            />

                            {/* Action Buttons */}
                            <Tooltip title="Edit HOTO">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(hoto);
                                }}
                                sx={{
                                  ml: 1,
                                  bgcolor: "warning.50",
                                  color: "warning.main",
                                  "&:hover": {
                                    bgcolor: "warning.100",
                                    transform: "scale(1.05)",
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete HOTO">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteConfirm(hoto);
                                }}
                                sx={{
                                  ml: 0.5,
                                  bgcolor: "error.50",
                                  color: "error.main",
                                  "&:hover": {
                                    bgcolor: "error.100",
                                    transform: "scale(1.05)",
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </AccordionSummary>

                      <AccordionDetails sx={{ bgcolor: "white" }}>
                        <Grid container spacing={3}>
                          {/* HOTO Info */}
                          <Grid xs={12} md={4}>
                            <Paper
                              elevation={1}
                              sx={{ p: 2, bgcolor: "grey.50" }}
                            >
                              <Typography
                                variant="subtitle2"
                                color="primary"
                                fontWeight="bold"
                                gutterBottom
                              >
                                🏢 HOTO Information
                              </Typography>
                              <List dense>
                                <ListItem sx={{ px: 0 }}>
                                  <ListItemIcon>
                                    <CalendarTodayIcon fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary="Created"
                                    secondary={formatDate(hoto.createdAt)}
                                  />
                                </ListItem>
                                {hoto.contactPerson && (
                                  <>
                                    <ListItem sx={{ px: 0 }}>
                                      <ListItemIcon>
                                        <PersonIcon fontSize="small" />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary="Contact Person"
                                        secondary={
                                          hoto.contactPerson.name || "N/A"
                                        }
                                      />
                                    </ListItem>
                                    {hoto.contactPerson.email && (
                                      <ListItem sx={{ px: 0 }}>
                                        <ListItemIcon>
                                          <EmailIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary="Email"
                                          secondary={hoto.contactPerson.email}
                                        />
                                      </ListItem>
                                    )}
                                    {hoto.contactPerson.mobile && (
                                      <ListItem sx={{ px: 0 }}>
                                        <ListItemIcon>
                                          <PhoneIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary="Mobile"
                                          secondary={hoto.contactPerson.mobile}
                                        />
                                      </ListItem>
                                    )}
                                  </>
                                )}
                                {hoto.latitude && hoto.longitude && (
                                  <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon>
                                      <GPSIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary="Coordinates"
                                      secondary={`${formatCoordinate(
                                        hoto.latitude
                                      )}, ${formatCoordinate(hoto.longitude)}`}
                                    />
                                  </ListItem>
                                )}
                              </List>
                            </Paper>
                          </Grid>

                          {/* HOTO Fields */}
                          <Grid xs={12} md={8}>
                            <Typography
                              variant="subtitle2"
                              color="primary"
                              fontWeight="bold"
                              gutterBottom
                            >
                              📋 HOTO Fields ({hoto.fields?.length || 0})
                            </Typography>

                            {hoto.fields && hoto.fields.length > 0 ? (
                              <Stack spacing={2}>
                                {hoto.fields.map((field, fieldIndex) => (
                                  <Paper
                                    key={fieldIndex}
                                    elevation={1}
                                    sx={{ p: 2, border: "1px solid #e0e0e0" }}
                                  >
                                    <Box
                                      display="flex"
                                      justifyContent="space-between"
                                      alignItems="flex-start"
                                      mb={2}
                                    >
                                      <Box
                                        display="flex"
                                        alignItems="center"
                                        gap={1}
                                      >
                                        {getFieldTypeIcon(field.fieldType)}
                                        <Typography
                                          variant="subtitle2"
                                          fontWeight="bold"
                                        >
                                          {field.key}
                                        </Typography>
                                      </Box>
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{
                                          minWidth: "280px",
                                          justifyContent: "flex-end",
                                        }}
                                      >
                                        <Chip
                                          label={`#${
                                            field.sequence || fieldIndex + 1
                                          }`}
                                          size="small"
                                          variant="outlined"
                                          sx={{
                                            minWidth: "60px",
                                            height: "28px",
                                          }}
                                        />
                                        {field.confirmation !== undefined && (
                                          <Chip
                                            icon={
                                              field.confirmation ? (
                                                <CheckCircleIcon />
                                              ) : (
                                                <CancelIcon />
                                              )
                                            }
                                            label={
                                              field.confirmation
                                                ? "Confirmed"
                                                : "Not Confirmed"
                                            }
                                            size="small"
                                            color={
                                              field.confirmation
                                                ? "success"
                                                : "error"
                                            }
                                            variant="outlined"
                                            sx={{
                                              minWidth: "120px",
                                              height: "28px",
                                            }}
                                          />
                                        )}
                                        {field.status !== undefined && (
                                          <Chip
                                            label={
                                              field.status === 1
                                                ? "Active"
                                                : "Inactive"
                                            }
                                            size="small"
                                            color={
                                              field.status === 1
                                                ? "success"
                                                : "default"
                                            }
                                            variant="outlined"
                                            sx={{
                                              minWidth: "80px",
                                              height: "28px",
                                            }}
                                          />
                                        )}
                                      </Stack>
                                    </Box>

                                    <Typography
                                      variant="body2"
                                      sx={{
                                        mb: 2,
                                        bgcolor: "grey.50",
                                        p: 1,
                                        borderRadius: 1,
                                      }}
                                    >
                                      <strong>Value:</strong>{" "}
                                      {field.value || "No value provided"}
                                    </Typography>

                                    {field.remarks && (
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          mb: 2,
                                          bgcolor: "info.50",
                                          p: 1,
                                          borderRadius: 1,
                                        }}
                                      >
                                        <strong>Remarks:</strong>{" "}
                                        {field.remarks}
                                      </Typography>
                                    )}

                                    {field.mediaFiles &&
                                      field.mediaFiles.length > 0 && (
                                        <Box>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            gutterBottom
                                            display="block"
                                          >
                                            📎 Field Media (
                                            {field.mediaFiles.length}):
                                          </Typography>
                                          <Grid
                                            container
                                            spacing={1}
                                            sx={{ mt: 1 }}
                                          >
                                            {field.mediaFiles.map(
                                              (media, mediaIndex) => (
                                                <Grid
                                                  xs={6}
                                                  sm={4}
                                                  md={3}
                                                  key={mediaIndex}
                                                >
                                                  <Paper
                                                    elevation={2}
                                                    sx={{
                                                      p: 1,
                                                      textAlign: "center",
                                                      cursor: "pointer",
                                                      transition:
                                                        "all 0.2s ease",
                                                      minHeight: "140px",
                                                      maxHeight: "140px",
                                                      minWidth: "120px",
                                                      display: "flex",
                                                      flexDirection: "column",
                                                      justifyContent:
                                                        "space-between",
                                                      "&:hover": {
                                                        boxShadow: 4,
                                                        transform:
                                                          "translateY(-2px)",
                                                      },
                                                    }}
                                                    onClick={() => {
                                                      setSelectedMedia(media);
                                                      setMediaDialogOpen(true);
                                                    }}
                                                  >
                                                    <Box
                                                      sx={{
                                                        flex: 1,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                          "center",
                                                      }}
                                                    >
                                                      {media.url &&
                                                      (media.fileType ===
                                                        "IMAGE" ||
                                                        media.fileType ===
                                                          "image") ? (
                                                        <CardMedia
                                                          component="img"
                                                          height="60"
                                                          image={media.url}
                                                          alt={
                                                            media.description ||
                                                            "Field media"
                                                          }
                                                          sx={{
                                                            objectFit: "cover",
                                                            borderRadius: 1,
                                                            maxWidth: "100%",
                                                          }}
                                                        />
                                                      ) : media.url &&
                                                        (media.fileType ===
                                                          "VIDEO" ||
                                                          media.fileType ===
                                                            "video" ||
                                                          media.fileType ===
                                                            "mp4" ||
                                                          media.fileType ===
                                                            "avi" ||
                                                          media.fileType ===
                                                            "mov") ? (
                                                        <Box
                                                          position="relative"
                                                          sx={{ width: "100%" }}
                                                        >
                                                          <video
                                                            width="100%"
                                                            height="60"
                                                            style={{
                                                              objectFit:
                                                                "cover",
                                                              borderRadius: 4,
                                                              maxWidth: "100%",
                                                            }}
                                                            muted
                                                            preload="metadata"
                                                          >
                                                            <source
                                                              src={`${media.url}#t=1`}
                                                              type={`video/${media.fileType?.toLowerCase()}`}
                                                            />
                                                          </video>
                                                          <Box
                                                            position="absolute"
                                                            top="50%"
                                                            left="50%"
                                                            sx={{
                                                              transform:
                                                                "translate(-50%, -50%)",
                                                              bgcolor:
                                                                "rgba(0,0,0,0.6)",
                                                              borderRadius:
                                                                "50%",
                                                              p: 0.5,
                                                            }}
                                                          >
                                                            <VideoIcon
                                                              sx={{
                                                                color: "white",
                                                                fontSize: 16,
                                                              }}
                                                            />
                                                          </Box>
                                                        </Box>
                                                      ) : (
                                                        <Box
                                                          sx={{
                                                            height: 60,
                                                            width: "100%",
                                                            display: "flex",
                                                            alignItems:
                                                              "center",
                                                            justifyContent:
                                                              "center",
                                                            bgcolor: "grey.100",
                                                            borderRadius: 1,
                                                          }}
                                                        >
                                                          {getMediaIcon(
                                                            media.fileType
                                                          )}
                                                        </Box>
                                                      )}
                                                    </Box>

                                                    <Box sx={{ mt: 1 }}>
                                                      <Typography
                                                        variant="caption"
                                                        display="block"
                                                        fontWeight="bold"
                                                        sx={{
                                                          overflow: "hidden",
                                                          textOverflow:
                                                            "ellipsis",
                                                          whiteSpace: "nowrap",
                                                        }}
                                                      >
                                                        {media.fileType ||
                                                          "File"}
                                                      </Typography>
                                                      {media.description && (
                                                        <Typography
                                                          variant="caption"
                                                          color="text.secondary"
                                                          display="block"
                                                          sx={{
                                                            overflow: "hidden",
                                                            textOverflow:
                                                              "ellipsis",
                                                            whiteSpace:
                                                              "nowrap",
                                                            fontSize: "0.65rem",
                                                          }}
                                                        >
                                                          {media.description
                                                            .length > 15
                                                            ? `${media.description.substring(
                                                                0,
                                                                15
                                                              )}...`
                                                            : media.description}
                                                        </Typography>
                                                      )}
                                                      {media.place && (
                                                        <Typography
                                                          variant="caption"
                                                          color="info.main"
                                                          display="block"
                                                          sx={{
                                                            overflow: "hidden",
                                                            textOverflow:
                                                              "ellipsis",
                                                            whiteSpace:
                                                              "nowrap",
                                                            fontSize: "0.65rem",
                                                          }}
                                                        >
                                                          📍{" "}
                                                          {media.place.length >
                                                          12
                                                            ? `${media.place.substring(
                                                                0,
                                                                12
                                                              )}...`
                                                            : media.place}
                                                        </Typography>
                                                      )}
                                                      <Tooltip title="Click to view details">
                                                        <IconButton
                                                          size="small"
                                                          sx={{
                                                            mt: 0.5,
                                                            p: 0.5,
                                                          }}
                                                        >
                                                          <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                      </Tooltip>
                                                    </Box>
                                                  </Paper>
                                                </Grid>
                                              )
                                            )}
                                          </Grid>
                                        </Box>
                                      )}
                                  </Paper>
                                ))}
                              </Stack>
                            ) : (
                              <Alert severity="info">
                                No fields found for this HOTO entry.
                              </Alert>
                            )}
                          </Grid>
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
              </Stack>

              {/* Pagination */}
              <Box display="flex" justifyContent="center" mt={3}>
                <TablePagination
                  component="div"
                  count={filteredHotos.length}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[3, 6, 12, 24]}
                  labelRowsPerPage="HOTOs per page:"
                  sx={{
                    "& .MuiTablePagination-toolbar": {
                      bgcolor: "grey.50",
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Media Dialog */}
      <Dialog
        open={mediaDialogOpen}
        onClose={() => setMediaDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">
            📷 Media Details & Geotagged Information
          </Typography>
          <IconButton onClick={() => setMediaDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedMedia && (
            <Grid container spacing={3}>
              {/* Media Preview */}
              <Grid xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2, textAlign: "center" }}>
                  {selectedMedia.url &&
                  (selectedMedia.fileType === "IMAGE" ||
                    selectedMedia.fileType === "image") ? (
                    <CardMedia
                      component="img"
                      image={selectedMedia.url}
                      alt={selectedMedia.description || "Media"}
                      sx={{
                        width: "100%",
                        maxHeight: 400,
                        objectFit: "contain",
                        borderRadius: 2,
                        mb: 2,
                      }}
                    />
                  ) : selectedMedia.url &&
                    (selectedMedia.fileType === "VIDEO" ||
                      selectedMedia.fileType === "video" ||
                      selectedMedia.fileType === "mp4" ||
                      selectedMedia.fileType === "avi" ||
                      selectedMedia.fileType === "mov") ? (
                    <Box sx={{ mb: 2 }}>
                      <video
                        controls
                        style={{
                          width: "100%",
                          maxHeight: 400,
                          borderRadius: 8,
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        <source
                          src={selectedMedia.url}
                          type={`video/${selectedMedia.fileType?.toLowerCase()}`}
                        />
                        Your browser does not support the video tag.
                      </video>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "grey.100",
                        borderRadius: 2,
                        mb: 2,
                      }}
                    >
                      {getMediaIcon(selectedMedia.fileType)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {selectedMedia.fileType || "File"}
                      </Typography>
                    </Box>
                  )}

                  {selectedMedia.url && (
                    <Button
                      startIcon={<OpenInNewIcon />}
                      onClick={() => window.open(selectedMedia.url, "_blank")}
                      variant="outlined"
                      size="small"
                      fullWidth
                    >
                      Open Original
                    </Button>
                  )}
                </Paper>
              </Grid>

              {/* Media Information */}
              <Grid xs={12} md={6}>
                <Typography variant="h6" color="primary" gutterBottom>
                  📋 File Information
                </Typography>
                <List dense>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <DescriptionIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Description"
                      secondary={
                        selectedMedia.description || "No description available"
                      }
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <FileIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="File Type"
                      secondary={selectedMedia.fileType || "Unknown"}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <PhoneAndroidIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Device/Source"
                      secondary={
                        selectedMedia.deviceName ||
                        selectedMedia.source ||
                        "Unknown"
                      }
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" color="primary" gutterBottom>
                  🌍 Geotagged Information
                </Typography>
                <List dense>
                  {selectedMedia.latitude || selectedMedia.longitude ? (
                    <>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <GPSIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary="GPS Coordinates"
                          secondary={`${formatCoordinate(
                            selectedMedia.latitude
                          )}, ${formatCoordinate(selectedMedia.longitude)}`}
                        />
                      </ListItem>
                      {selectedMedia.accuracy && (
                        <ListItem sx={{ px: 0 }}>
                          <ListItemIcon>
                            <LocationOnIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="GPS Accuracy"
                            secondary={`±${selectedMedia.accuracy}m`}
                          />
                        </ListItem>
                      )}
                      {selectedMedia.place && (
                        <ListItem sx={{ px: 0 }}>
                          <ListItemIcon>
                            <PublicIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Location"
                            secondary={selectedMedia.place}
                          />
                        </ListItem>
                      )}

                      {/* Google Maps Link */}
                      <ListItem sx={{ px: 0 }}>
                        <Button
                          startIcon={<LocationOnIcon />}
                          variant="contained"
                          size="small"
                          onClick={() => {
                            const lat = selectedMedia.latitude;
                            const lng = selectedMedia.longitude;
                            if (lat && lng) {
                              window.open(
                                `https://www.google.com/maps?q=${lat},${lng}`,
                                "_blank"
                              );
                            }
                          }}
                          disabled={
                            !selectedMedia.latitude || !selectedMedia.longitude
                          }
                          fullWidth
                        >
                          View on Google Maps
                        </Button>
                      </ListItem>
                    </>
                  ) : (
                    <ListItem sx={{ px: 0 }}>
                      <Alert severity="info" sx={{ width: "100%" }}>
                        No GPS coordinates available for this media file.
                      </Alert>
                    </ListItem>
                  )}
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      {/* Add HOTO Modal */}
      <AddHotoModal
        open={isAddModalOpen}
        onClose={handleCloseAddModal}
        locationId={locationId}
        locationName={location?.block}
        locationDistrict={location?.district}
        fetchAllHotoInfo={fetchHotoData}
      />

      {/* Edit HOTO Modal */}
      <EditHotoModal
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        hotoId={selectedHotoForEdit?._id}
        locationId={locationId}
        locationName={location?.block}
        locationDistrict={location?.district}
        fetchAllHotoInfo={fetchHotoData}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <DeleteIcon color="error" />
            <Typography variant="h6">Delete HOTO Entry</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete this HOTO entry?
          </Typography>
          {hotoToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {hotoToDelete.hotoType?.toUpperCase()} -{" "}
                {hotoToDelete.blockName ||
                  hotoToDelete.gpName ||
                  hotoToDelete.ofcName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created: {formatDate(hotoToDelete.createdAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fields: {hotoToDelete.fields?.length || 0} | Media:{" "}
                {hotoToDelete.fields?.reduce(
                  (acc, f) => acc + (f.mediaFiles?.length || 0),
                  0
                ) || 0}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseDeleteConfirm}
            variant="outlined"
            disabled={deletingHoto}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={deletingHoto}
            startIcon={
              deletingHoto ? <CircularProgress size={16} /> : <DeleteIcon />
            }
          >
            {deletingHoto ? "Deleting..." : "Delete HOTO"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HotoDetailsPage;
