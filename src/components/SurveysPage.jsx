import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
  Collapse,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
  FmdGoodOutlined as FmdGoodOutlinedIcon,
  FilterAltOffOutlined as FilterAltOffOutlinedIcon,
  BusinessOutlined as BusinessOutlinedIcon,
  PlaceOutlined as PlaceOutlinedIcon,
  RouteOutlined as RouteOutlinedIcon,
  AssignmentOutlined as AssignmentOutlinedIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  PhotoCameraOutlined as PhotoCameraOutlinedIcon,
  PlayCircleOutlined as PlayCircleOutlinedIcon,
  InsertDriveFileOutlined as InsertDriveFileOutlinedIcon,
} from '@mui/icons-material';
import surveyService from '../services/surveyService';
import PageHeader from './common/PageHeader';
import StatTile from './common/StatTile';
import StatusPill from './common/StatusPill';
import { formatNumber } from '../utils/formatNumber';
import { getSurveyStatus } from '../constants/surveys';

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================

const SURVEY_TYPES = {
  block: { label: 'Block', Icon: BusinessOutlinedIcon },
  gp: { label: 'GP', Icon: PlaceOutlinedIcon },
  ofc: { label: 'OFC', Icon: RouteOutlinedIcon },
};

const EMPTY_FILTERS = {
  search: '',
  surveyType: '',
  status: '',
  stateName: '',
  districtName: '',
  blockName: '',
};

// Free-text filters are applied after the user pauses typing.
const TEXT_FILTER_KEYS = ['search', 'stateName', 'districtName'];
const TEXT_FILTER_DEBOUNCE_MS = 400;

const TABLE_COLUMNS = 8;

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? format(date, 'd MMM yyyy, h:mm a') : '—';
};

const getStatus = getSurveyStatus;

/**
 * Location to open for a survey: its linked location, or the survey ID as a
 * fallback (LocationDetailsPage resolves it).
 */
const getLocationId = (survey) => {
  if (survey.locationId && typeof survey.locationId === 'object' && survey.locationId._id) {
    return survey.locationId._id;
  }
  if (survey.locationId && typeof survey.locationId === 'string') {
    return survey.locationId;
  }
  return survey._id ?? null;
};

// =============================================================================
// PRESENTATIONAL COMPONENTS
// =============================================================================

const SurveyTypeChip = ({ type }) => {
  const config = SURVEY_TYPES[type];
  const TypeIcon = config?.Icon;
  return (
    <Chip
      size="small"
      variant="outlined"
      icon={TypeIcon ? <TypeIcon /> : undefined}
      label={config?.label ?? (type ? type.toUpperCase() : '—')}
      sx={{
        bgcolor: 'background.paper',
        borderColor: 'divider',
        color: 'text.primary',
        '& .MuiChip-icon': { fontSize: 16, color: 'text.secondary' },
      }}
    />
  );
};

const SubtleHeading = ({ children, sx }) => (
  <Typography variant="overline" component="h3" sx={{ color: 'text.secondary', display: 'block', mb: 1, ...sx }}>
    {children}
  </Typography>
);

const MediaTile = ({ media, showCaption = false }) => {
  const label = media.description || media.fileType || 'Media file';
  const isImage = media.fileType === 'IMAGE' && media.url;
  const FallbackIcon = media.fileType === 'VIDEO' ? PlayCircleOutlinedIcon : InsertDriveFileOutlinedIcon;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        component={media.url ? 'a' : 'div'}
        href={media.url || undefined}
        target={media.url ? '_blank' : undefined}
        rel={media.url ? 'noopener noreferrer' : undefined}
        title={label}
        sx={{
          display: 'grid',
          placeItems: 'center',
          aspectRatio: '1',
          borderRadius: 1,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'grey.100',
          color: 'text.secondary',
        }}
      >
        {isImage ? (
          <Box
            component="img"
            src={media.url}
            alt={label}
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
            <FallbackIcon />
            <Typography variant="caption">{media.fileType || 'File'}</Typography>
          </Stack>
        )}
      </Box>
      {showCaption && (
        <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
          {label}
        </Typography>
      )}
    </Box>
  );
};

const DetailGrid = ({ items }) => (
  <Box
    component="dl"
    sx={{
      m: 0,
      display: 'grid',
      gap: 2,
      gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
    }}
  >
    {items.map((item) => (
      <Box key={item.label} sx={{ minWidth: 0 }}>
        <Typography component="dt" variant="caption" sx={{ color: 'text.secondary' }}>
          {item.label}
        </Typography>
        <Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 500, wordBreak: 'break-word' }}>
          {item.value || '—'}
        </Typography>
      </Box>
    ))}
  </Box>
);

/**
 * Inline preview shown when a row is expanded
 */
const SurveyPreview = ({ survey }) => {
  const fields = survey.fields ?? [];
  const mediaFiles = survey.mediaFiles ?? [];
  const contact = survey.contactPerson;

  return (
    <Box
      sx={{
        py: 2.5,
        pl: { md: 7 },
        pr: 2,
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
      }}
    >
      <Box>
        <SubtleHeading>Description</SubtleHeading>
        <Typography variant="body2" sx={{ color: survey.description ? 'text.primary' : 'text.secondary' }}>
          {survey.description || 'No description provided.'}
        </Typography>
        {contact && (
          <>
            <SubtleHeading sx={{ mt: 2 }}>Contact person</SubtleHeading>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{contact.sdeName || '—'}</Typography>
            {contact.sdeMobile && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{contact.sdeMobile}</Typography>
            )}
            {contact.engineerName && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Engineer: {contact.engineerName}</Typography>
            )}
          </>
        )}
      </Box>

      <Box>
        <SubtleHeading>Survey fields ({fields.length})</SubtleHeading>
        {fields.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>No fields recorded.</Typography>
        ) : (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
            {fields.slice(0, 5).map((field, index) => (
              <Box
                key={field._id ?? index}
                sx={{
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'space-between',
                  px: 1.5,
                  py: 1,
                  '& + &': { borderTop: 1, borderColor: 'divider' },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{field.key}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {field.fieldType} · Seq {field.sequence}
                  </Typography>
                </Box>
                <Typography variant="body2" noWrap sx={{ color: field.value ? 'text.primary' : 'text.disabled', maxWidth: '45%' }}>
                  {field.value || '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        {fields.length > 5 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            + {fields.length - 5} more fields — open the survey to see all
          </Typography>
        )}
      </Box>

      <Box>
        <SubtleHeading>Media files ({mediaFiles.length})</SubtleHeading>
        {mediaFiles.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>No media uploaded.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', maxWidth: 300 }}>
            {mediaFiles.slice(0, 6).map((media, index) => (
              <MediaTile key={index} media={media} />
            ))}
          </Box>
        )}
        {mediaFiles.length > 6 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            + {mediaFiles.length - 6} more files
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const SurveyRow = ({ survey, expanded, onToggle, onView, onOpenLocation, viewing }) => {
  const status = getStatus(survey.status);
  const fieldsCount = survey.fields?.length ?? 0;
  const mediaCount = survey.mediaFiles?.length ?? 0;
  const place = [survey.districtName, survey.stateName].filter(Boolean).join(', ');

  return (
    <>
      <TableRow hover sx={{ '& > td': expanded ? { borderBottom: 0 } : {} }}>
        <TableCell padding="checkbox">
          <IconButton
            size="small"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse survey preview' : 'Expand survey preview'}
            aria-expanded={expanded}
          >
            {expanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ maxWidth: 280 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }} title={survey.name}>
            {survey.name || 'Untitled survey'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {fieldsCount} fields · {mediaCount} media
          </Typography>
        </TableCell>
        <TableCell>
          <SurveyTypeChip type={survey.surveyType} />
        </TableCell>
        <TableCell>
          <StatusPill label={status.label} tone={status.tone} />
        </TableCell>
        <TableCell>
          <Typography variant="body2">{survey.blockName || '—'}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{place || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{survey.contactPerson?.sdeName || '—'}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {survey.contactPerson?.sdeMobile || ''}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatDate(survey.createdOn)}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {survey.createdBy?.email || 'Unknown'}
          </Typography>
        </TableCell>
        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          <Tooltip title="View details">
            <span>
              <IconButton size="small" onClick={onView} disabled={viewing} aria-label="View survey details">
                {viewing ? <CircularProgress size={18} /> : <VisibilityOutlinedIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Open location">
            <IconButton size="small" onClick={onOpenLocation} aria-label="Open location details">
              <FmdGoodOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell
          colSpan={TABLE_COLUMNS}
          sx={{ p: 0, borderBottom: expanded ? 1 : 0, borderColor: 'divider', bgcolor: 'background.default' }}
        >
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            {/* Zero intrinsic width keeps the preview from resizing the table columns */}
            <Box sx={{ width: 0, minWidth: '100%' }}>
              <SurveyPreview survey={survey} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

/**
 * Phone layout: one stacked item per survey instead of a wide table row
 */
const SurveyListItem = ({ survey, onView, onOpenLocation, viewing }) => {
  const status = getStatus(survey.status);
  const place = [survey.blockName, survey.districtName].filter(Boolean).join(' · ');

  return (
    <Box sx={{ px: 2, py: 1.75, '& + &': { borderTop: 1, borderColor: 'divider' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{survey.name || 'Untitled survey'}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{place || '—'}</Typography>
        </Box>
        <StatusPill label={status.label} tone={status.tone} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <SurveyTypeChip type={survey.surveyType} />
        <Typography variant="caption" noWrap sx={{ color: 'text.secondary', flex: 1, minWidth: 0 }}>
          {formatDate(survey.createdOn)}
        </Typography>
        <IconButton size="small" onClick={onView} disabled={viewing} aria-label="View survey details">
          {viewing ? <CircularProgress size={18} /> : <VisibilityOutlinedIcon fontSize="small" />}
        </IconButton>
        <IconButton size="small" onClick={onOpenLocation} aria-label="Open location details">
          <FmdGoodOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

const EmptyState = ({ filtered }) => (
  <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>No surveys found</Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
      {filtered ? 'Try adjusting or clearing the filters.' : 'Surveys will appear here once they are submitted.'}
    </Typography>
  </Box>
);

const LoadingRows = ({ rows }) =>
  Array.from({ length: rows }, (_, index) => (
    <TableRow key={index}>
      {Array.from({ length: TABLE_COLUMNS }, (__, cell) => (
        <TableCell key={cell}>
          <Skeleton variant="text" width={cell === 0 ? 24 : '80%'} />
        </TableCell>
      ))}
    </TableRow>
  ));

const SurveyDetailDialog = ({ survey, open, onClose, onOpenLocation }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const status = survey ? getStatus(survey.status) : null;
  const linkedLocation = survey?.locationId && typeof survey.locationId === 'object' ? survey.locationId : null;
  const fields = survey?.fields ?? [];
  const mediaFiles = survey?.mediaFiles ?? [];
  const hasCoordinates = survey?.latitude !== undefined && survey?.longitude !== undefined;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen} scroll="paper">
      {survey && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pr: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" component="span" sx={{ display: 'block' }}>
                {survey.name || 'Untitled survey'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                <SurveyTypeChip type={survey.surveyType} />
                <StatusPill label={status.label} tone={status.tone} />
              </Stack>
            </Box>
            <IconButton onClick={onClose} aria-label="Close" size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3}>
              {survey.description && <Typography variant="body2">{survey.description}</Typography>}

              <Box>
                <SubtleHeading>Details</SubtleHeading>
                <DetailGrid
                  items={[
                    { label: 'State', value: survey.stateName },
                    { label: 'District', value: linkedLocation?.district ?? survey.districtName },
                    { label: 'Block', value: linkedLocation?.block ?? survey.blockName },
                    { label: 'Coordinates', value: hasCoordinates ? `${survey.latitude}, ${survey.longitude}` : null },
                    { label: 'Created on', value: formatDate(survey.createdOn) },
                    { label: 'Created by', value: survey.createdBy?.email },
                    { label: 'SDE', value: survey.contactPerson?.sdeName },
                    { label: 'SDE mobile', value: survey.contactPerson?.sdeMobile },
                    { label: 'Engineer', value: survey.contactPerson?.engineerName },
                  ]}
                />
              </Box>

              {fields.length > 0 && (
                <Box>
                  <SubtleHeading>Survey fields ({fields.length})</SubtleHeading>
                  <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, maxHeight: 360 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 64 }}>Seq</TableCell>
                          <TableCell>Field</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fields.map((field, index) => (
                          <TableRow key={field._id ?? index} hover>
                            <TableCell sx={{ color: 'text.secondary' }}>{field.sequence}</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{field.key}</TableCell>
                            <TableCell>
                              <Chip label={field.fieldType} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>{field.value || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {mediaFiles.length > 0 && (
                <Box>
                  <SubtleHeading>Media files ({mediaFiles.length})</SubtleHeading>
                  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {mediaFiles.map((media, index) => (
                      <MediaTile key={index} media={media} showCaption />
                    ))}
                  </Box>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            {survey.locationId && (
              <Button
                variant="outlined"
                startIcon={<FmdGoodOutlinedIcon />}
                onClick={() => onOpenLocation(survey)}
              >
                Surveys at this location
              </Button>
            )}
            <Button variant="contained" onClick={onClose}>
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

// =============================================================================
// PAGE
// =============================================================================

const SurveysPage = () => {
  const [surveys, setSurveys] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [expandedSurvey, setExpandedSurvey] = useState(null);

  // Filters sent to the API, and the text inputs that feed them after a pause
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [textFilters, setTextFilters] = useState({ search: '', stateName: '', districtName: '' });

  const latestRequest = useRef(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));

  // Fetch surveys
  const fetchSurveys = async () => {
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);

      const response = await surveyService.getSurveys({
        ...filters,
        page: page + 1,
        limit: rowsPerPage
      });

      // Ignore responses that arrive after a newer request was made
      if (requestId === latestRequest.current && response.success) {
        setSurveys(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      if (requestId === latestRequest.current) setError(err.message);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await surveyService.getSurveyStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Apply typed filters once the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        TEXT_FILTER_KEYS.some((key) => prev[key] !== textFilters[key]) ? { ...prev, ...textFilters } : prev
      );
      setPage(0);
    }, TEXT_FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [textFilters]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleTextFilterChange = (key, value) => {
    setTextFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = Object.values(filters).some(Boolean) || Object.values(textFilters).some(Boolean);

  const clearFilters = () => {
    setTextFilters({ search: '', stateName: '', districtName: '' });
    setFilters(EMPTY_FILTERS);
    setPage(0);
  };

  const handleRefresh = () => {
    fetchSurveys();
    fetchStats();
  };

  // Handle survey detail view
  const handleViewSurvey = async (survey) => {
    setViewingId(survey._id);
    try {
      const response = await surveyService.getSurveyById(survey._id);
      if (response.success) {
        setSelectedSurvey(response.data);
        setDetailDialogOpen(true);
      }
    } catch {
      setError('Error loading survey details');
    } finally {
      setViewingId(null);
    }
  };

  // Handle location click
  const handleLocationClick = (survey) => {
    const locationId = getLocationId(survey);
    if (locationId) {
      navigate(`/location/${locationId}`);
    } else {
      setError('Location information not available for this survey');
    }
  };

  const statValue = (key) => (stats ? stats[key] ?? 0 : '—');
  const statsCards = [
    { title: 'Total surveys', value: statValue('totalSurveys'), icon: <AssignmentOutlinedIcon /> },
    { title: 'Active surveys', value: statValue('activeSurveys'), icon: <CheckCircleOutlineIcon /> },
    { title: 'Block surveys', value: statValue('blockSurveys'), icon: <BusinessOutlinedIcon /> },
    { title: 'GP surveys', value: statValue('gpSurveys'), icon: <PlaceOutlinedIcon /> },
    { title: 'OFC surveys', value: statValue('ofcSurveys'), icon: <RouteOutlinedIcon /> },
    { title: 'Media files', value: statValue('totalMediaFiles'), icon: <PhotoCameraOutlinedIcon /> },
  ];

  const showSkeleton = loading && surveys.length === 0;

  return (
    <Box>
      <PageHeader
        title="Surveys"
        subtitle="Block, GP and OFC surveys captured in the field"
        actions={
          <Button
            variant="outlined"
            size="small"
            onClick={handleRefresh}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
          >
            Refresh
          </Button>
        }
      />

      {/* Statistics */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          mb: 3,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
        }}
      >
        {statsCards.map((stat) => (
          <StatTile key={stat.title} label={stat.title} value={stat.value} icon={stat.icon} />
        ))}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Survey register */}
      <Card>
        <Box
          sx={{
            p: 2,
            display: 'grid',
            gap: 1.5,
            alignItems: 'center',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'minmax(0, 2fr) repeat(4, minmax(0, 1fr)) auto',
            },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <TextField
            size="small"
            placeholder="Search surveys"
            value={textFilters.search}
            onChange={(e) => handleTextFilterChange('search', e.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': 'Search surveys' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Type"
            value={filters.surveyType}
            onChange={(e) => handleFilterChange('surveyType', e.target.value)}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">All types</MenuItem>
            <MenuItem value="block">Block</MenuItem>
            <MenuItem value="gp">GP</MenuItem>
            <MenuItem value="ofc">OFC</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="1">Active</MenuItem>
            <MenuItem value="2">In Progress</MenuItem>
            <MenuItem value="3">Completed</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="State"
            value={textFilters.stateName}
            onChange={(e) => handleTextFilterChange('stateName', e.target.value)}
          />
          <TextField
            size="small"
            label="District"
            value={textFilters.districtName}
            onChange={(e) => handleTextFilterChange('districtName', e.target.value)}
          />
          <Button
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            startIcon={<FilterAltOffOutlinedIcon />}
            sx={{ justifySelf: { xs: 'start', md: 'end' } }}
          >
            Clear
          </Button>
        </Box>

        <Box sx={{ height: 2 }}>{loading && !showSkeleton && <LinearProgress sx={{ height: 2, borderRadius: 0 }} />}</Box>

        {isCompact ? (
          <Box sx={{ opacity: loading && !showSkeleton ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            {showSkeleton ? (
              Array.from({ length: 4 }, (_, index) => (
                <Box key={index} sx={{ px: 2, py: 1.75 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
              ))
            ) : surveys.length === 0 ? (
              <EmptyState filtered={hasActiveFilters} />
            ) : (
              surveys.map((survey) => (
                <SurveyListItem
                  key={survey._id}
                  survey={survey}
                  onView={() => handleViewSurvey(survey)}
                  onOpenLocation={() => handleLocationClick(survey)}
                  viewing={viewingId === survey._id}
                />
              ))
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 1000, opacity: loading && !showSkeleton ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Survey</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {showSkeleton ? (
                  <LoadingRows rows={Math.min(rowsPerPage, 6)} />
                ) : surveys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMNS} sx={{ p: 0, borderBottom: 0 }}>
                      <EmptyState filtered={hasActiveFilters} />
                    </TableCell>
                  </TableRow>
                ) : (
                  surveys.map((survey) => (
                    <SurveyRow
                      key={survey._id}
                      survey={survey}
                      expanded={expandedSurvey === survey._id}
                      onToggle={() => setExpandedSurvey(expandedSurvey === survey._id ? null : survey._id)}
                      onView={() => handleViewSurvey(survey)}
                      onOpenLocation={() => handleLocationClick(survey)}
                      viewing={viewingId === survey._id}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={pagination?.total ?? 0}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${formatNumber(count)}`}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Card>

      <SurveyDetailDialog
        survey={selectedSurvey}
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        onOpenLocation={handleLocationClick}
      />
    </Box>
  );
};

export default SurveysPage;
