import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowBack as ArrowBackIcon,
  AssignmentTurnedInOutlined as HotoIcon,
  AccountTreeOutlined as SectionsIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  PhotoLibraryOutlined as PhotoLibraryIcon,
  FilterListOff as FilterListOffIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import surveyService from '../services/surveyService';
import { fetchLocationDetails } from '../services/hotoPageService';
import PageHeader from './common/PageHeader';
import StatTile from './common/StatTile';
import StatusPill from './common/StatusPill';
import MediaViewerDialog from './common/MediaViewerDialog';
import MediaTile from './common/MediaTile';
import DetailRow from './common/DetailRow';
import { getSurveyStatus, getSurveyTypeLabel } from '../constants/surveys';
import { getLocationStatus } from '../constants/locations';
import { formatMediaDate, getCoordinates, googleMapsUrl } from '../utils/mediaUtils';

const DATE_FILTERS = [
  { value: '', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
];

const MEDIA_FILTERS = [
  { value: '', label: 'With or without media' },
  { value: 'yes', label: 'With media' },
  { value: 'no', label: 'Without media' },
];

const countMedia = (survey) =>
  (survey.mediaFiles?.length || 0) + (survey.fields || []).reduce((total, field) => total + (field.mediaFiles?.length || 0), 0);

const formatDate = (value) => formatMediaDate(value) || '—';

const personName = (person) => (person && typeof person === 'object' ? person.name || person.email : null);

const SurveyRow = ({ survey, index, expanded, onToggle, onOpenMedia }) => {
  const status = getSurveyStatus(survey.status);
  const mediaCount = countMedia(survey);
  const coordinates = getCoordinates(survey);
  const contact = survey.contactPerson;
  const panelId = `survey-panel-${survey._id}`;

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <ButtonBase
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        sx={(theme) => ({
          width: '100%',
          display: 'flex',
          // Stretch on phones so long descriptions truncate instead of overflowing
          alignItems: { xs: 'stretch', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 1, md: 2 },
          px: 2.5,
          py: 1.75,
          textAlign: 'left',
          bgcolor: expanded ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
          '&:hover': { bgcolor: 'action.hover' },
          '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
        })}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1, minWidth: 0 }}>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ mt: 0.25, color: 'text.secondary', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {survey.name || survey.title || `Survey ${index + 1}`}
            </Typography>
            {survey.description && (
              <Typography variant="body2" noWrap sx={{ color: 'text.secondary', maxWidth: { md: 560 } }}>
                {survey.description}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, pl: { xs: 4, md: 0 } }}>
          <StatusPill label={getSurveyTypeLabel(survey.surveyType)} tone="default" />
          <StatusPill label={status.label} tone={status.tone} />
          <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', minWidth: 56 }}>
            <PhotoLibraryIcon sx={{ fontSize: 16 }} />
            {mediaCount}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: { md: 150 }, textAlign: { md: 'right' } }}>
            {formatDate(survey.createdOn || survey.created_on)}
          </Typography>
        </Box>
      </ButtonBase>

      <Collapse in={expanded} unmountOnExit>
        <Box id={panelId} sx={{ px: 2.5, pb: 2.5, pt: 0.5, pl: { md: 6.5 } }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="overline" component="h3" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Survey
              </Typography>
              <Box>
                <DetailRow label="Created">{formatMediaDate(survey.createdOn || survey.created_on)}</DetailRow>
                <DetailRow label="Created by">{personName(survey.createdBy)}</DetailRow>
                <DetailRow label="Updated">{formatMediaDate(survey.updatedOn || survey.updated_on)}</DetailRow>
                <DetailRow label="SDE">{[contact?.sdeName, contact?.sdeMobile].filter(Boolean).join(' · ')}</DetailRow>
                <DetailRow label="Engineer">{[contact?.engineerName, contact?.engineerMobile].filter(Boolean).join(' · ')}</DetailRow>
                <DetailRow label="Coordinates">
                  {coordinates && (
                    <>
                      {coordinates.latitude}, {coordinates.longitude}
                      <Link
                        href={googleMapsUrl(coordinates.latitude, coordinates.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'block', fontWeight: 600 }}
                      >
                        Google Maps
                      </Link>
                    </>
                  )}
                </DetailRow>
              </Box>
              {survey.mediaFiles?.length > 0 && (
                <>
                  <Typography variant="overline" component="h3" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mt: 2 }}>
                    Survey media ({survey.mediaFiles.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                    {survey.mediaFiles.map((media, mediaIndex) => (
                      <MediaTile
                        key={mediaIndex}
                        media={media}
                        label={media.description || `Survey media ${mediaIndex + 1}`}
                        onOpen={(item) => onOpenMedia(item, 'Survey media')}
                      />
                    ))}
                  </Box>
                </>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="overline" component="h3" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Fields ({survey.fields?.length || 0})
              </Typography>
              {survey.fields?.length > 0 ? (
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
                  {survey.fields.map((field, fieldIndex) => (
                    <Box
                      key={field._id || fieldIndex}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 2fr) minmax(0, 3fr)' },
                        gap: { xs: 0.5, sm: 2 },
                        px: 1.5,
                        py: 1.25,
                        '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {field.key}
                        </Typography>
                        {field.fieldType && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {field.fieldType.charAt(0).toUpperCase() + field.fieldType.slice(1).toLowerCase()}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ color: field.value ? 'text.primary' : 'text.disabled', overflowWrap: 'anywhere' }}>
                          {field.value || 'No value'}
                        </Typography>
                        {field.dropdownOptions?.length > 0 && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Options: {field.dropdownOptions.join(', ')}
                          </Typography>
                        )}
                        {field.mediaFiles?.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {field.mediaFiles.map((media, mediaIndex) => (
                              <MediaTile
                                key={mediaIndex}
                                media={media}
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
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No fields recorded for this survey.
                </Typography>
              )}
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
};

const LocationDetailsPage = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();

  const [location, setLocation] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [surveysError, setSurveysError] = useState(null);
  const [expandedSurveys, setExpandedSurveys] = useState({});
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasMediaFilter, setHasMediaFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  const fetchLocationData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSurveysError(null);

    // Surveys carry their populated location; the location record covers locations without surveys yet
    const [surveyResult, locationResult] = await Promise.allSettled([
      surveyService.getSurveysByLocation(locationId),
      fetchLocationDetails(locationId),
    ]);

    const locationSurveys =
      surveyResult.status === 'fulfilled' && surveyResult.value?.success && Array.isArray(surveyResult.value.data)
        ? surveyResult.value.data
        : [];
    const record =
      locationResult.status === 'fulfilled' && locationResult.value?.success ? locationResult.value.data : null;
    const firstSurvey = locationSurveys[0];
    const populated = firstSurvey?.locationId && typeof firstSurvey.locationId === 'object' ? firstSurvey.locationId : null;
    const source = record || populated;

    if (!source && !firstSurvey) {
      setLocation(null);
      setSurveys([]);
      setError(
        surveyResult.status === 'rejected' && locationResult.status === 'rejected'
          ? "Couldn't reach the survey or location service. Check your connection and try again."
          : "This location couldn't be found. It may have been removed."
      );
      setLoading(false);
      return;
    }

    if (surveyResult.status === 'rejected') {
      setSurveysError("Couldn't load this location's surveys.");
    }

    setLocation({
      id: locationId,
      stateName: source?.state || firstSurvey?.stateName || '',
      districtName: source?.district || firstSurvey?.districtName || '',
      districtCode: source?.district_code || firstSurvey?.districtCode || '',
      blockName: source?.block || firstSurvey?.blockName || '',
      blockCode: source?.block_code || firstSurvey?.blockCode || '',
      status: source?.status,
    });
    setSurveys(locationSurveys);
    setLoading(false);
  }, [locationId]);

  useEffect(() => {
    fetchLocationData();
  }, [fetchLocationData]);

  const filteredSurveys = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let since = null;
    const now = new Date();
    if (dateFilter === 'today') since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateFilter === 'week') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (dateFilter === 'month') since = new Date(now.getFullYear(), now.getMonth(), 1);

    return surveys.filter((survey) => {
      if (
        query &&
        !(
          (survey.name || '').toLowerCase().includes(query) ||
          (survey.description || '').toLowerCase().includes(query) ||
          (survey.fields || []).some(
            (field) => (field.key || '').toLowerCase().includes(query) || String(field.value ?? '').toLowerCase().includes(query)
          )
        )
      ) {
        return false;
      }
      if (typeFilter && survey.surveyType !== typeFilter) return false;
      if (statusFilter && survey.status !== parseInt(statusFilter, 10)) return false;
      if (hasMediaFilter && (countMedia(survey) > 0) !== (hasMediaFilter === 'yes')) return false;
      if (since && new Date(survey.createdOn || survey.created_on) < since) return false;
      return true;
    });
  }, [surveys, searchTerm, typeFilter, statusFilter, hasMediaFilter, dateFilter]);

  // Back to the first page whenever the filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, typeFilter, statusFilter, hasMediaFilter, dateFilter]);

  const currentPage = Math.min(page, Math.max(0, Math.ceil(filteredSurveys.length / rowsPerPage) - 1));
  const pageSurveys = filteredSurveys.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);
  const filtersActive = Boolean(searchTerm || typeFilter || statusFilter || hasMediaFilter || dateFilter);

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setHasMediaFilter('');
    setDateFilter('');
  };

  const typeOptions = [...new Set(surveys.map((survey) => survey.surveyType).filter(Boolean))];
  const statusOptions = [...new Set(surveys.map((survey) => survey.status).filter((status) => status !== undefined && status !== null))];

  const stats = useMemo(() => {
    const byType = typeOptions.map((type) => `${getSurveyTypeLabel(type)} ${surveys.filter((survey) => survey.surveyType === type).length}`);
    const totalFields = surveys.reduce((total, survey) => total + (survey.fields?.length || 0), 0);
    return {
      byType: byType.join(' · '),
      totalFields,
      averageFields: surveys.length ? Math.round(totalFields / surveys.length) : 0,
      totalMedia: surveys.reduce((total, survey) => total + countMedia(survey), 0),
      surveysWithMedia: surveys.filter((survey) => countMedia(survey) > 0).length,
    };
    // typeOptions is derived from surveys
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveys]);

  const title = location?.blockName || location?.districtName || 'Location';
  const locationStatus = location?.status !== undefined ? getLocationStatus(location.status) : null;

  const headerActions = (
    <>
      <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
        Back
      </Button>
      {location && (
        <>
          <Button variant="outlined" startIcon={<HotoIcon />} onClick={() => navigate(`/hoto-details/${locationId}`)}>
            HOTO
          </Button>
          <Button variant="outlined" startIcon={<SectionsIcon />} onClick={() => navigate(`/location/${locationId}/sections`)}>
            Sections
          </Button>
        </>
      )}
    </>
  );

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

  if (error) {
    return (
      <Box>
        <PageHeader title="Location details" actions={headerActions} />
        <Card sx={{ py: 6, px: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {error}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 2.5 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchLocationData}>
              Try again
            </Button>
            <Button variant="contained" onClick={() => navigate('/map')}>
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
        title={
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {title}
            {locationStatus && <StatusPill label={locationStatus.label} tone={locationStatus.tone} />}
          </Box>
        }
        subtitle={[
          [location.districtName, location.stateName].filter(Boolean).join(', '),
          location.blockCode && `Block code ${location.blockCode}`,
          location.districtCode && `District code ${location.districtCode}`,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={headerActions}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatTile label="Surveys" value={surveys.length} caption={stats.byType || 'No surveys yet'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatTile
            label="Fields recorded"
            value={stats.totalFields}
            caption={surveys.length ? `About ${stats.averageFields} per survey` : 'Across all surveys'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatTile
            label="Media files"
            value={stats.totalMedia}
            caption={surveys.length ? `${stats.surveysWithMedia} of ${surveys.length} surveys have photos or videos` : 'Photos and videos'}
          />
        </Grid>
      </Grid>

      {surveysError && (
        <Alert severity="warning" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={fetchLocationData}>Retry</Button>}>
          {surveysError}
        </Alert>
      )}

      <Card>
        {/* Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder="Search surveys, fields and values"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            sx={{ width: { xs: '100%', md: 300 } }}
            slotProps={{
              htmlInput: { 'aria-label': 'Search surveys' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setSearchTerm('')}>
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
                {getSurveyTypeLabel(type)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">All statuses</MenuItem>
            {statusOptions.map((status) => (
              <MenuItem key={status} value={String(status)}>
                {getSurveyStatus(status).label}
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
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {filtersActive ? `${filteredSurveys.length} of ${surveys.length} surveys` : `${surveys.length} ${surveys.length === 1 ? 'survey' : 'surveys'}`}
          </Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchLocationData} aria-label="Refresh surveys">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Surveys */}
        {filteredSurveys.length === 0 ? (
          <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {filtersActive ? 'No surveys match these filters' : 'No surveys for this location yet'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {filtersActive ? 'Try a different search or clear the filters.' : 'Surveys appear here once they are submitted from the mobile app.'}
            </Typography>
            {filtersActive && (
              <Button size="small" onClick={clearFilters} sx={{ mt: 1.5 }}>
                Clear filters
              </Button>
            )}
          </Box>
        ) : (
          <>
            {pageSurveys.map((survey) => (
              <SurveyRow
                key={survey._id}
                survey={survey}
                index={surveys.indexOf(survey)}
                expanded={Boolean(expandedSurveys[survey._id])}
                onToggle={() => setExpandedSurveys((previous) => ({ ...previous, [survey._id]: !previous[survey._id] }))}
                onOpenMedia={(media, subtitle) => setSelectedMedia({ media, subtitle })}
              />
            ))}
            <TablePagination
              component="div"
              count={filteredSurveys.length}
              page={currentPage}
              onPageChange={(event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[6, 12, 24]}
              labelRowsPerPage="Surveys per page:"
            />
          </>
        )}
      </Card>

      {selectedMedia && (
        <MediaViewerDialog media={selectedMedia.media} subtitle={selectedMedia.subtitle} onClose={() => setSelectedMedia(null)} />
      )}
    </Box>
  );
};

export default LocationDetailsPage;
