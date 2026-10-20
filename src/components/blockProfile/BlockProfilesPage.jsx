import React, { useCallback, useEffect, useRef, useState } from "react";
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
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import blockProfileService from "../../services/blockProfileService.jsx";
import { useBlockPermissions } from "../../hooks/useBlockPermissions";
import PageHeader from "../common/PageHeader";
import StatusPill from "../common/StatusPill";
import { formatNumber } from "../../utils/formatNumber";
import { SITE_TYPES, blockStatus, formatLength } from "./blockProfileConstants";
import ProgressMarks from "./ProgressMarks";
import { DemoBlockButton, DemoChip } from "./DemoBlock";
import executionService from "../../services/executionService.jsx";
import { titleCase } from "../execution/execConstants";

// "" is the server default: everything except deactivated profiles
const STATUS_FILTERS = [
  { value: "", label: "Active and draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ALL", label: "All statuses" },
];

const SEARCH_DEBOUNCE_MS = 400;

const GpCount = ({ profile }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
    <Typography component="span" variant="body2" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
      {formatNumber(profile.numberOfGps)} / {formatNumber(profile.gps?.length || 0)}
    </Typography>
    {profile.gpCountMismatch && <StatusPill label="Mismatch" tone="warning" />}
  </Box>
);

const BlockProfilesPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  const { can, loading: permissionsLoading, error: permissionsError } = useBlockPermissions();

  // undefined while the first page loads
  const [items, setItems] = useState(undefined);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [district, setDistrict] = useState("");
  const [districts, setDistricts] = useState([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    executionService
      .getDistricts()
      .then((res) => setDistricts(res.items || []))
      .catch(() => setDistricts([]));
  }, []);

  const fetchProfiles = useCallback(async () => {
    // Only the latest request updates the list, so quick searches can't show stale results
    const requestId = ++requestIdRef.current;
    setError("");
    try {
      const res = await blockProfileService.list({ page: page + 1, limit: rowsPerPage, q: query, status, district });
      if (requestId !== requestIdRef.current) return;
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setItems((previous) => previous ?? []);
      setError(e.message || "Failed to load block profiles");
    }
  }, [page, rowsPerPage, query, status, district]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Search after a short pause in typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isLoading = items === undefined;
  const canCreate = can("createBlockProfile");
  const openProfile = (profile) => navigate(`/block-profiles/${profile._id}`);

  if (!permissionsLoading && !can("viewBlockProfile")) {
    return (
      <Box>
        <PageHeader title="Block Profile" />
        <Alert severity={permissionsError ? "error" : "info"}>
          {permissionsError ? `Couldn't check your permissions: ${permissionsError}` : "Block profiles aren't available for your role."}
        </Alert>
      </Box>
    );
  }

  const emptyState = (
    <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {query || district ? "No blocks found" : "No block profiles yet"}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        {query || district
          ? "Try another district or clear the search."
          : "A block profile holds the block's GPs, router, KML files and execution sections."}
      </Typography>
      {!query && !district && canCreate && (
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate("/block-profiles/new")} sx={{ mt: 2 }}>
          New block profile
        </Button>
      )}
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Block Profile"
        subtitle="Blocks with their GPs, router, KML files and execution sections"
        actions={
          <>
            <DemoBlockButton onChanged={fetchProfiles} />
            {canCreate && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/block-profiles/new")}>
                New block profile
              </Button>
            )}
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={fetchProfiles}>Retry</Button>}>
          {error}
        </Alert>
      )}

      <Card>
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            size="small"
            placeholder="Search block, GP or LGD code"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ width: { xs: "100%", sm: 340 } }}
            slotProps={{
              htmlInput: { "aria-label": "Search block profiles" },
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
          <TextField
            select
            size="small"
            label="District"
            value={district}
            onChange={(event) => {
              setDistrict(event.target.value);
              setPage(0);
            }}
            sx={{ width: { xs: "100%", sm: 200 } }}
          >
            <MenuItem value="">All districts</MenuItem>
            {districts.map((d) => (
              <MenuItem key={d} value={d}>
                {titleCase(d)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
            sx={{ width: { xs: "100%", sm: 200 } }}
          >
            {STATUS_FILTERS.map((option) => (
              <MenuItem key={option.value || "default"} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1 }} />
          {!isLoading && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {formatNumber(total)} {total === 1 ? "block" : "blocks"}
            </Typography>
          )}
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchProfiles} aria-label="Refresh block profiles">
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
          <Box>
            {items.map((profile) => {
              const statusInfo = blockStatus(profile.status);
              return (
                <Box
                  key={profile._id}
                  onClick={() => openProfile(profile)}
                  sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {profile.block}
                        {profile.isDemo && <DemoChip />}
                      </Typography>
                      <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
                        {[profile.district, `LGD ${profile.blockCode}`].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                    <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mt: 1 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      GPs
                    </Typography>
                    <GpCount profile={profile} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {formatNumber(profile.sectionCount)} sections · {formatLength(profile.sectionLength)} · {profile.kmlFiles?.length || 0} KML
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <ProgressMarks progress={profile.progress} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 1240 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Block</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>LGD code</TableCell>
                  <TableCell>District</TableCell>
                  <TableCell>Site type</TableCell>
                  <TableCell>
                    <Tooltip title="Declared / entered">
                      <span>GPs</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">Sections</TableCell>
                  <TableCell align="right">Length</TableCell>
                  <TableCell align="right">KML</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((profile) => {
                  const statusInfo = blockStatus(profile.status);
                  return (
                    <TableRow key={profile._id} hover onClick={() => openProfile(profile)} sx={{ cursor: "pointer" }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {profile.block}
                          {profile.isDemo && <DemoChip />}
                        </Typography>
                        {profile.state && (
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {profile.state}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <ProgressMarks progress={profile.progress} />
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{profile.blockCode}</TableCell>
                      <TableCell sx={{ color: profile.district ? "text.primary" : "text.disabled" }}>{profile.district || "—"}</TableCell>
                      <TableCell sx={{ color: profile.siteType ? "text.primary" : "text.disabled", whiteSpace: "nowrap" }}>
                        {SITE_TYPES[profile.siteType] || "—"}
                      </TableCell>
                      <TableCell>
                        <GpCount profile={profile} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatNumber(profile.sectionCount)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {formatLength(profile.sectionLength)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {profile.kmlFiles?.length || 0}
                      </TableCell>
                      <TableCell>
                        <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
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
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage={isPhone ? "Rows:" : "Rows per page:"}
            sx={{ borderTop: 1, borderColor: "divider" }}
          />
        )}
      </Card>
    </Box>
  );
};

export default BlockProfilesPage;
