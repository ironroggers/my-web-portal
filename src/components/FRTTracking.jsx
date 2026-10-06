import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Skeleton,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, keyframes, useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import DirectionsCarFilledOutlinedIcon from '@mui/icons-material/DirectionsCarFilledOutlined';
import LocationOffOutlinedIcon from '@mui/icons-material/LocationOffOutlined';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PageHeader from './common/PageHeader';
import StatusPill from './common/StatusPill';
import {
  fetchAllVehicles,
  formatSpeed,
  getBatteryLevel,
  getDistanceToday,
} from '../services/frtTrackingService';

const REFRESH_INTERVAL_MS = 30000;
// Kerala, shown until the first positions arrive
const DEFAULT_CENTER = [9.31, 76.45];
const DEFAULT_ZOOM = 8;
const FOCUS_ZOOM = 15;

// Material "directions_car" glyph, drawn inside each map marker
const CAR_PATH =
  'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16m11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5M5 11l1.5-4.5h11L19 11z';

// Same status grouping as getVehicleStatistics in the tracking service
const STATUS_ALIASES = {
  RUNNING: 'running',
  MOVING: 'running',
  IDLE: 'idle',
  IDLING: 'idle',
  STOPPED: 'stopped',
  PARKED: 'stopped',
  NO_DATA: 'noData',
  NODATA: 'noData',
  OFFLINE: 'offline',
};

// `group` is the filter tab a status belongs to; the three "not reporting" states share one
const STATUS_META = {
  running: { label: 'Running', tone: 'success', group: 'running' },
  idle: { label: 'Idle', tone: 'warning', group: 'idle' },
  stopped: { label: 'Stopped', tone: 'error', group: 'stopped' },
  noData: { label: 'No data', tone: 'default', group: 'noSignal' },
  offline: { label: 'Offline', tone: 'default', group: 'noSignal' },
  unknown: { label: 'Unknown', tone: 'default', group: 'noSignal' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All vehicles' },
  { value: 'running', label: 'Running' },
  { value: 'idle', label: 'Idle' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'noSignal', label: 'No signal' },
];

const getStatusMeta = (status) => STATUS_META[STATUS_ALIASES[String(status || '').toUpperCase()] || 'unknown'];

const getGroupColor = (theme, group) =>
  ({
    running: theme.palette.success.main,
    idle: theme.palette.warning.main,
    stopped: theme.palette.error.main,
  })[group] || theme.palette.text.secondary;

const hasLocation = (vehicle) =>
  typeof vehicle.latitude === 'number' &&
  typeof vehicle.longitude === 'number' &&
  vehicle.latitude !== 0 &&
  vehicle.longitude !== 0;

const parseTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Age of a device report relative to the last refresh, e.g. "5 min ago"
const formatAge = (value, now) => {
  const date = parseTime(value);
  if (!date || !now) return null;
  const minutes = Math.max(0, Math.round((now - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};

const formatBattery = (attributes) => {
  const level = getBatteryLevel(attributes);
  return level === 'N/A' ? '—' : `${level}%`;
};

const byName = (a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });

// Leaflet re-renders a marker whenever its icon object changes, so icons are cached
const iconCache = new Map();
const getVehicleIcon = (color, { moving, selected, muted }) => {
  const key = [color, moving, selected, muted].join('|');
  if (!iconCache.has(key)) {
    const size = selected ? 36 : 30;
    const glyph = Math.round(size * 0.55);
    iconCache.set(
      key,
      L.divIcon({
        className: 'frt-marker',
        html: `<span class="frt-marker__body${moving ? ' is-moving' : ''}${selected ? ' is-selected' : ''}${muted ? ' is-muted' : ''}" style="--marker-color:${color};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" width="${glyph}" height="${glyph}" fill="#fff" aria-hidden="true"><path d="${CAR_PATH}"/></svg></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      })
    );
  }
  return iconCache.get(key);
};

const pulse = keyframes`
  from { transform: scale(1); opacity: 0.7; }
  to { transform: scale(1.9); opacity: 0; }
`;

const markerSx = {
  '& .frt-marker': { background: 'none', border: 0 },
  '& .frt-marker__body': {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    boxSizing: 'border-box',
    borderRadius: '50%',
    bgcolor: 'var(--marker-color)',
    border: '2px solid #fff',
    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.35)',
  },
  '& .frt-marker__body.is-muted': { opacity: 0.8 },
  '& .frt-marker__body.is-selected': { boxShadow: '0 0 0 2px #0f172a, 0 2px 8px rgba(15, 23, 42, 0.4)' },
  // Moving vehicles pulse, so "running" never relies on colour alone
  '& .frt-marker__body.is-moving::after': {
    content: '""',
    position: 'absolute',
    inset: -2,
    borderRadius: '50%',
    border: '2px solid var(--marker-color)',
    animation: `${pulse} 1.8s ease-out infinite`,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none', inset: -6, opacity: 0.5 },
  },
};

// Leaflet measures its container once; re-measure when the layout or fullscreen changes its size
const MapAutoResize = () => {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
};

// Frames the vehicles on first load and when "Show all" is pressed; auto-refresh leaves the view alone
const FitToVehicles = ({ positions, fitRequest }) => {
  const map = useMap();
  const handledRef = useRef(0);
  useEffect(() => {
    if (fitRequest === handledRef.current || positions.length === 0) return;
    handledRef.current = fitRequest;
    if (positions.length === 1) {
      map.setView(positions[0], FOCUS_ZOOM);
    } else {
      map.fitBounds(positions, { padding: [48, 48], maxZoom: FOCUS_ZOOM });
    }
  }, [fitRequest, positions, map]);
  return null;
};

// Flies to a vehicle picked from the list, then opens its popup
const FocusVehicle = ({ selection, markerRefs }) => {
  const map = useMap();
  useEffect(() => {
    if (!selection || selection.source !== 'list') return undefined;
    const openPopup = () => markerRefs.current[selection.id]?.openPopup();
    map.once('moveend', openPopup);
    map.flyTo(selection.position, Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.6 });
    return () => map.off('moveend', openPopup);
  }, [selection, markerRefs, map]);
  return null;
};

const exitBrowserFullscreen = () => {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  return undefined;
};

const getFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

const StatusDot = ({ color, size = 8 }) => (
  <Box component="span" sx={{ width: size, height: size, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
);

const PopupField = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Typography>
  </Box>
);

const FRTTracking = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // null until the first response arrives
  const [vehicles, setVehicles] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // { id, source: 'list' | 'map', position }
  const [selection, setSelection] = useState(null);
  const [fitRequest, setFitRequest] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const workspaceRef = useRef(null);
  const markerRefs = useRef({});
  const listItemRefs = useRef({});
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    // Only the latest request may update the page, so a slow response can't overwrite a newer one
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    try {
      // Includes vehicles without a GPS fix; they are listed but not mapped
      const vehicleData = await fetchAllVehicles();
      if (requestId !== requestIdRef.current) return;
      setVehicles(vehicleData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setVehicles((previous) => previous ?? []);
      setError(err.message);
    } finally {
      if (requestId === requestIdRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh every 30 seconds while the tab is visible
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      if (!document.hidden) fetchData();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Track the browser's fullscreen state (Esc, F11, the exit button)
  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(getFullscreenElement()));
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, []);

  // Esc also leaves the in-page fallback used where the Fullscreen API is unavailable (iPhone Safari)
  useEffect(() => {
    if (!isFullscreen) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape' && !getFullscreenElement()) setIsFullscreen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    if (getFullscreenElement()) {
      await exitBrowserFullscreen()?.catch(() => {});
      return;
    }
    if (isFullscreen) {
      setIsFullscreen(false);
      return;
    }
    const element = workspaceRef.current;
    try {
      if (element.requestFullscreen) await element.requestFullscreen();
      else element.webkitRequestFullscreen?.();
    } catch {
      // Fall back to filling the window
    }
    setIsFullscreen(true);
  };

  const allVehicles = useMemo(() => vehicles ?? [], [vehicles]);

  const counts = useMemo(() => {
    const totals = { all: allVehicles.length, running: 0, idle: 0, stopped: 0, noSignal: 0 };
    allVehicles.forEach((vehicle) => {
      totals[getStatusMeta(vehicle.status).group] += 1;
    });
    return totals;
  }, [allVehicles]);

  const visibleVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allVehicles
      .filter((vehicle) => statusFilter === 'all' || getStatusMeta(vehicle.status).group === statusFilter)
      .filter(
        (vehicle) =>
          !query ||
          (vehicle.name || '').toLowerCase().includes(query) ||
          String(vehicle.deviceId).toLowerCase().includes(query)
      )
      .sort(byName);
  }, [allVehicles, statusFilter, searchQuery]);

  const mappedVehicles = useMemo(() => visibleVehicles.filter(hasLocation), [visibleVehicles]);
  const positions = useMemo(() => mappedVehicles.map((vehicle) => [vehicle.latitude, vehicle.longitude]), [mappedVehicles]);
  const unlocatedCount = visibleVehicles.length - mappedVehicles.length;

  // Bring the matching list row into view when a marker is clicked on the map
  useEffect(() => {
    if (!isDesktop || selection?.source !== 'map') return;
    listItemRefs.current[selection.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selection, isDesktop]);

  const selectFromList = (vehicle) => {
    setSelection({ id: vehicle.deviceId, source: 'list', position: [vehicle.latitude, vehicle.longitude] });
  };

  const now = lastUpdate?.getTime();
  const isLoading = vehicles === null;
  const showList = !(isFullscreen && !isDesktop);

  const headerActions = (
    <>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        {lastUpdate ? `Updated ${format(lastUpdate, 'h:mm:ss a')}` : error ? 'Not connected' : 'Connecting…'}
      </Typography>
      <FormControlLabel
        control={<Switch size="small" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />}
        label={<Typography variant="body2">Auto-refresh (30 s)</Typography>}
        sx={{ mr: 0 }}
      />
      <Button
        variant="outlined"
        startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
        onClick={fetchData}
        disabled={refreshing}
      >
        Refresh
      </Button>
    </>
  );

  const emptyListMessage = (() => {
    if (!lastUpdate && error) return { title: 'Vehicle positions unavailable', body: 'The list fills in once AiroTrack responds.' };
    if (searchQuery.trim()) return { title: `No vehicles match "${searchQuery.trim()}"`, body: 'Try a different vehicle name or device ID.' };
    if (statusFilter !== 'all') {
      const label = STATUS_FILTERS.find((filter) => filter.value === statusFilter).label.toLowerCase();
      return { title: `No vehicles are ${label === 'no signal' ? 'without a signal' : label}`, body: 'Switch to "All vehicles" to see the whole fleet.' };
    }
    return { title: 'No vehicles reported', body: 'AiroTrack returned no vehicles for this account.' };
  })();

  const renderVehicleRow = (vehicle) => {
    const meta = getStatusMeta(vehicle.status);
    const color = getGroupColor(theme, meta.group);
    const located = hasLocation(vehicle);
    const isSelected = selection?.id === vehicle.deviceId;
    const age = formatAge(vehicle.deviceTime, now);

    return (
      <Box
        key={vehicle.deviceId}
        ref={(node) => {
          if (node) listItemRefs.current[vehicle.deviceId] = node;
          else delete listItemRefs.current[vehicle.deviceId];
        }}
        component={located ? 'button' : 'div'}
        type={located ? 'button' : undefined}
        onClick={located ? () => selectFromList(vehicle) : undefined}
        aria-pressed={located ? isSelected : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          width: '100%',
          px: 2,
          py: 1.25,
          border: 0,
          borderBottom: 1,
          borderColor: 'divider',
          borderLeft: '3px solid',
          borderLeftColor: isSelected ? 'primary.main' : 'transparent',
          bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          cursor: located ? 'pointer' : 'default',
          '&:hover': located && !isSelected ? { bgcolor: 'action.hover' } : undefined,
          '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            borderRadius: '50%',
            flexShrink: 0,
            color,
            bgcolor: alpha(color, 0.12),
          }}
        >
          <DirectionsCarFilledOutlinedIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="body2" noWrap title={vehicle.name} sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
              {vehicle.name}
            </Typography>
            {age && (
              <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {age}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1, rowGap: 0.5, mt: 0.5 }}>
            <StatusPill label={meta.label} tone={meta.tone} />
            {meta.group === 'running' && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {formatSpeed(vehicle.speed)}
              </Typography>
            )}
            {!located && (
              <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <LocationOffOutlinedIcon sx={{ fontSize: 14 }} />
                No GPS fix
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  const renderPopup = (vehicle, meta) => {
    const reported = parseTime(vehicle.deviceTime);
    const age = formatAge(vehicle.deviceTime, now);
    return (
      <Popup>
        {/* Leaflet gives popup paragraphs a large margin; Typography handles spacing here */}
        <Box sx={{ width: 240, '& p.MuiTypography-root': { m: 0 } }}>
          <Typography variant="body2" sx={{ fontWeight: 600, pr: 2.5, overflowWrap: 'anywhere' }}>
            {vehicle.name}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <StatusPill label={meta.label} tone={meta.tone} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mt: 1.5 }}>
            <PopupField label="Speed" value={formatSpeed(vehicle.speed)} />
            <PopupField label="Battery" value={formatBattery(vehicle.attributes)} />
            <PopupField label="Distance today" value={getDistanceToday(vehicle.attributes)} />
            <PopupField label="Last report" value={age || '—'} />
          </Box>
          <Divider sx={{ my: 1.25 }} />
          {reported && (
            <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
              Reported {format(reported, 'd MMM yyyy, h:mm a')}
            </Typography>
          )}
          <Typography variant="caption" component="div" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {vehicle.latitude.toFixed(5)}, {vehicle.longitude.toFixed(5)}
          </Typography>
          <Link
            href={`https://www.google.com/maps/search/?api=1&query=${vehicle.latitude},${vehicle.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            // Leaflet's `.leaflet-container a` colour would otherwise win
            sx={{ '&&': { color: 'primary.main' }, display: 'inline-block', mt: 0.5, fontWeight: 600 }}
          >
            Open in Google Maps
          </Link>
        </Box>
      </Popup>
    );
  };

  // Tooltips render inside the workspace so they still show in browser fullscreen
  const inlineTooltip = { popper: { disablePortal: true } };

  return (
    <Box>
      <PageHeader
        title="FRT Tracking"
        subtitle="Live vehicle positions from AiroTrack GPS trackers"
        actions={headerActions}
      />

      {error && (
        <Alert
          severity={lastUpdate ? 'warning' : 'error'}
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchData} disabled={refreshing}>
              Retry
            </Button>
          }
        >
          {lastUpdate
            ? `Couldn't refresh vehicle positions. Showing positions from ${format(lastUpdate, 'h:mm:ss a')}.`
            : "Couldn't load vehicle positions from AiroTrack. Check the connection and try again."}
        </Alert>
      )}

      <Card
        ref={workspaceRef}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: { xs: 'auto', md: 'max(560px, calc(100vh - 188px))' },
          ...(isFullscreen && {
            position: 'fixed',
            inset: 0,
            zIndex: theme.zIndex.modal,
            height: '100dvh',
            borderRadius: 0,
            border: 0,
          }),
        }}
      >
        <Tabs
          value={statusFilter}
          onChange={(event, value) => setStatusFilter(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Filter vehicles by status"
          sx={{ px: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
        >
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <Tab
                key={filter.value}
                value={filter.value}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {filter.value !== 'all' && <StatusDot color={getGroupColor(theme, filter.value)} />}
                    {filter.label}
                    <Box
                      component="span"
                      sx={{
                        px: 0.75,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'action.hover',
                        color: active ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      {lastUpdate ? counts[filter.value] : '–'}
                    </Box>
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Vehicle list: left of the map on desktop, below it on phones */}
          {showList && (
            <Box
              sx={{
                order: { xs: 2, md: 1 },
                width: { md: 340 },
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                borderRight: { md: `1px solid ${theme.palette.divider}` },
                borderTop: { xs: `1px solid ${theme.palette.divider}`, md: 0 },
              }}
            >
              <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search vehicle or device ID"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  slotProps={{
                    htmlInput: { 'aria-label': 'Search vehicles' },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery && (
                        <InputAdornment position="end">
                          <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setSearchQuery('')}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, overflowY: { md: 'auto' } }}>
                {isLoading ? (
                  Array.from({ length: 6 }, (_, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5 }}>
                      <Skeleton variant="circular" width={34} height={34} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="35%" />
                      </Box>
                    </Box>
                  ))
                ) : visibleVehicles.length === 0 ? (
                  <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {emptyListMessage.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      {emptyListMessage.body}
                    </Typography>
                  </Box>
                ) : (
                  visibleVehicles.map(renderVehicleRow)
                )}
              </Box>

              {!isLoading && visibleVehicles.length > 0 && (
                <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {visibleVehicles.length === allVehicles.length
                      ? `${allVehicles.length} vehicles`
                      : `${visibleVehicles.length} of ${allVehicles.length} vehicles`}
                    {unlocatedCount > 0 && ` · ${unlocatedCount} without a GPS fix (list only)`}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Map */}
          <Box
            sx={{
              order: { xs: 1, md: 2 },
              position: 'relative',
              // Keeps Leaflet's pane and control z-indexes inside the map
              zIndex: 0,
              flex: 1,
              minWidth: 0,
              minHeight: { xs: isFullscreen ? 0 : 'clamp(320px, 60vh, 520px)', md: 0 },
              ...markerSx,
            }}
          >
            {/* Absolutely filled: on phones the panel only has a min-height, which a 100% height can't resolve against */}
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ position: 'absolute', inset: 0 }} scrollWheelZoom>
              <MapAutoResize />
              <FitToVehicles positions={positions} fitRequest={fitRequest} />
              <FocusVehicle selection={selection} markerRefs={markerRefs} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mappedVehicles.map((vehicle) => {
                const meta = getStatusMeta(vehicle.status);
                const id = vehicle.deviceId;
                return (
                  <Marker
                    key={id}
                    ref={(marker) => {
                      if (marker) markerRefs.current[id] = marker;
                      else delete markerRefs.current[id];
                    }}
                    position={[vehicle.latitude, vehicle.longitude]}
                    icon={getVehicleIcon(getGroupColor(theme, meta.group), {
                      moving: meta.group === 'running',
                      selected: selection?.id === id,
                      muted: meta.group === 'noSignal',
                    })}
                    zIndexOffset={selection?.id === id ? 1000 : 0}
                    eventHandlers={{
                      popupopen: () =>
                        setSelection((current) =>
                          current?.id === id ? current : { id, source: 'map', position: [vehicle.latitude, vehicle.longitude] }
                        ),
                      popupclose: () => setSelection((current) => (current?.id === id ? null : current)),
                    }}
                  >
                    {renderPopup(vehicle, meta)}
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Map controls */}
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'stretch',
                bgcolor: 'background.paper',
                borderRadius: 1.5,
                boxShadow: 3,
              }}
            >
              <Button
                size="small"
                color="inherit"
                startIcon={<ZoomOutMapIcon fontSize="small" />}
                onClick={() => setFitRequest((value) => value + 1)}
                disabled={positions.length === 0}
                sx={{ px: 1.5, borderRadius: 0, fontWeight: 600 }}
              >
                Show all
              </Button>
              <Divider orientation="vertical" flexItem />
              <Tooltip title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'} placement="bottom-end" slotProps={inlineTooltip}>
                <IconButton
                  aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                  onClick={toggleFullscreen}
                  size="small"
                  sx={{ borderRadius: 0, px: 1 }}
                >
                  {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Legend */}
            <Box
              sx={{
                position: 'absolute',
                left: 12,
                bottom: 24,
                zIndex: 1000,
                display: 'flex',
                flexWrap: 'wrap',
                columnGap: 1.5,
                rowGap: 0.5,
                maxWidth: 'calc(100% - 24px)',
                px: 1.5,
                py: 0.75,
                bgcolor: alpha(theme.palette.background.paper, 0.95),
                borderRadius: 1.5,
                boxShadow: 2,
              }}
            >
              {STATUS_FILTERS.filter((filter) => filter.value !== 'all').map((filter) => (
                <Box key={filter.value} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <StatusDot color={getGroupColor(theme, filter.value)} size={10} />
                  <Typography variant="caption" sx={{ color: 'text.primary' }}>
                    {filter.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {isLoading && (
              <Box sx={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, bgcolor: 'background.paper', borderRadius: 1.5, boxShadow: 3 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2">Loading vehicle positions…</Typography>
                </Box>
              </Box>
            )}

            {!isLoading && allVehicles.length > 0 && positions.length === 0 && (
              <Box sx={{ position: 'absolute', top: 12, left: 56, right: 72, zIndex: 1000, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper', borderRadius: 1.5, boxShadow: 3 }}>
                  <Typography variant="body2">No vehicles in this view have a GPS fix to show on the map.</Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default FRTTracking;
