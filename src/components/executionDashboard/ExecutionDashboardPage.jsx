import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { BarChart } from "@mui/x-charts/BarChart";
import { formatDistanceToNowStrict } from "date-fns";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import CableOutlinedIcon from "@mui/icons-material/CableOutlined";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import RouterOutlinedIcon from "@mui/icons-material/RouterOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import GpsOffOutlinedIcon from "@mui/icons-material/GpsOffOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import FormatListNumberedOutlinedIcon from "@mui/icons-material/FormatListNumberedOutlined";

import executionService from "../../services/executionService.jsx";
import { usePermissions } from "../../hooks/usePermissions";
import { useExecutionConfig, toneColor } from "../../hooks/useExecutionConfig";
import PageHeader from "../common/PageHeader";
import SectionCard from "../common/SectionCard";
import StatTile from "../common/StatTile";
import StatusPill from "../common/StatusPill";
import Meter from "../common/Meter";
import { StackBar } from "../execution/execUi";
import { BAR_ORDER, RESTORATION_ICONS, STATUS_ICONS, toneSx, titleCase } from "../execution/execConstants";
import { DemoChip } from "../blockProfile/DemoBlock";
import { formatNumber } from "../../utils/formatNumber";

// Empty filters show their "All …" option rather than a bare label
const SELECT_PROPS = { select: { displayEmpty: true }, inputLabel: { shrink: true } };

// "" is the server default: everything except deactivated blocks
const STATUS_FILTERS = [
  { value: "", label: "Active and draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ALL", label: "All statuses" },
];
const PERIODS = [7, 30, 90];
const RESTORATION_ORDER = ["APPROVED", "PENDING_APPROVAL", "READY", "REJECTED", "LOCKED"];

// Bars stay thin however few days there are
const GAP_RATIO = { 7: 0.7, 30: 0.35, 90: 0.2 };

const decimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

// Lengths in metres: "850 m", from 1 km up "18.2 km"
const fmtLength = (m) => {
  const value = Number(m) || 0;
  return value >= 1000 ? `${decimal.format(value / 1000)} km` : `${formatNumber(Math.round(value))} m`;
};
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const ago = (date) => (date ? formatDistanceToNowStrict(new Date(date), { addSuffix: true }) : "—");
const dayLabel = (key, long) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
const hoursLabel = (h) => (h == null ? "—" : h >= 48 ? `${decimal.format(h / 24)} days` : `${decimal.format(h)} h`);
const upper = (s) => String(s || "").trim().toUpperCase();

// Planned is the sections' route length; blocks whose sections have no length use the subsections'
const plannedOf = (row) => row.plannedM || row.subPlannedM || 0;

// ---------------------------------------------------------------------------- pieces

const Hero = ({ totals }) => {
  const planned = plannedOf(totals);
  const progress = pct(totals.laidM, planned);
  return (
    <Card sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
        OFC laid
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: "3rem", fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}>{fmtLength(totals.laidM)}</Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          of {fmtLength(planned)} planned
        </Typography>
      </Box>
      <Meter value={progress} height={8} aria-label={`OFC laid: ${progress}% of planned`} />
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {progress}% of planned
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {formatNumber(totals.entries)} entries recorded
        </Typography>
      </Box>
      <Stack direction="row" useFlexGap spacing={3} sx={{ flexWrap: "wrap", pt: 1.5, mt: 0.5, borderTop: 1, borderColor: "divider" }}>
        <Figure label="Remaining" value={fmtLength(Math.max(0, planned - totals.laidM))} />
        <Figure label="Approved" value={`${fmtLength(totals.approvedM)} · ${pct(totals.approvedM, totals.laidM)}% of laid`} />
        <Figure label="Subsections planned" value={fmtLength(totals.subPlannedM)} />
      </Stack>
      <Typography variant="caption" sx={{ color: "text.secondary", mt: "auto" }}>
        Laid length is the entries of HDD, Open Trench and Clamping subsections; planned is the sections&apos; route length.
      </Typography>
    </Card>
  );
};

// Metres laid per day: one series, so the card title names it and there is no legend
const DailyTrend = ({ trend, days }) => {
  const theme = useTheme();
  const period = trend.reduce(
    (acc, d) => ({ laidM: acc.laidM + d.laidM, started: acc.started + d.started, ended: acc.ended + d.ended, approved: acc.approved + d.approved }),
    { laidM: 0, started: 0, ended: 0, approved: 0 }
  );
  const activeDays = trend.filter((d) => d.laidM > 0).length;
  const peak = trend.reduce((best, d) => (d.laidM > (best?.laidM || 0) ? d : best), null);
  // Fewer date labels on a phone so they don't run into each other
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const every = days > 30 ? (isPhone ? 30 : 14) : days > 7 ? (isPhone ? 10 : 5) : isPhone ? 2 : 1;

  return (
    <Box>
      <Stack direction="row" useFlexGap spacing={3} sx={{ flexWrap: "wrap", mb: 1 }}>
        <Figure label="Laid in period" value={fmtLength(period.laidM)} />
        <Figure label="Per working day" value={activeDays ? fmtLength(period.laidM / activeDays) : "—"} />
        <Figure label="Best day" value={peak ? `${fmtLength(peak.laidM)} · ${dayLabel(peak.date)}` : "—"} />
        <Figure label="Started · ended · approved" value={`${period.started} · ${period.ended} · ${period.approved}`} />
      </Stack>
      {period.laidM === 0 ? (
        <Box sx={{ height: 240, display: "grid", placeItems: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No ducting entries in the last {days} days.
          </Typography>
        </Box>
      ) : (
        <BarChart
          height={240}
          borderRadius={4}
          hideLegend
          grid={{ horizontal: true }}
          margin={{ left: 0, right: 20, top: 12, bottom: 0 }}
          xAxis={[
            {
              scaleType: "band",
              data: trend.map((d) => d.date),
              valueFormatter: (key, context) => dayLabel(key, context.location === "tooltip"),
              tickLabelInterval: (value, index) => (trend.length - 1 - index) % every === 0,
              categoryGapRatio: GAP_RATIO[days] ?? 0.35,
              disableTicks: true,
            },
          ]}
          yAxis={[{ width: 48, valueFormatter: (v) => compact.format(v), disableTicks: true, disableLine: true }]}
          series={[
            {
              data: trend.map((d) => d.laidM),
              label: "Laid",
              color: theme.palette.primary.main,
              valueFormatter: (v, { dataIndex }) => `${fmtLength(v)} · ${trend[dataIndex].entries} entries`,
            },
          ]}
          sx={{
            "& .MuiChartsGrid-line": { stroke: theme.palette.divider },
            "& .MuiChartsAxis-tickLabel": { fill: theme.palette.text.secondary },
            "& .MuiChartsAxis-line": { stroke: theme.palette.divider },
          }}
        />
      )}
    </Box>
  );
};

const Figure = ({ label, value }) => (
  <Box>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
    <Typography variant="body1" sx={{ fontWeight: 600 }}>
      {value}
    </Typography>
  </Box>
);

// One status per row: icon, label, count and share
const StateList = ({ order, counts, labelOf, icons }) => {
  const total = order.reduce((s, k) => s + (counts[k] || 0), 0);
  return (
    <Stack spacing={1}>
      {order.map((key) => {
        const { label, tone } = labelOf(key);
        const Icon = icons[key];
        return (
          <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {Icon && <Icon sx={{ fontSize: 18, color: toneSx(tone) }} />}
            <Typography variant="body2" sx={{ flex: 1 }}>
              {label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {formatNumber(counts[key] || 0)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", width: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {pct(counts[key] || 0, total)}%
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
};

// Restoration split in the same shape as the subsection bar
const RestorationBar = ({ counts }) => {
  const { restorationOf } = useExecutionConfig();
  const total = RESTORATION_ORDER.reduce((s, k) => s + (counts[k] || 0), 0);
  if (!total) return null;
  const color = (k) => {
    const c = toneColor(restorationOf(k).tone);
    return c === "default" ? "grey.400" : `${c}.main`;
  };
  return (
    <Box sx={{ display: "flex", gap: "2px", height: 8, borderRadius: 1, overflow: "hidden", mt: 1 }} role="img" aria-label="Restoration split">
      {RESTORATION_ORDER.filter((k) => counts[k]).map((k) => (
        <Tooltip key={k} title={`${restorationOf(k).label}: ${counts[k]}`}>
          <Box sx={{ flex: counts[k], bgcolor: color(k) }} />
        </Tooltip>
      ))}
    </Box>
  );
};

// A labelled meter: "GP infra  6 / 31  19%"
const MeterRow = ({ label, done, total, caption, valueText }) => (
  <Box>
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 0.75 }}>
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {valueText ?? `${formatNumber(done)} / ${formatNumber(total)}`}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", width: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {pct(done, total)}%
      </Typography>
    </Box>
    <Meter value={pct(done, total)} color={total > 0 && done >= total ? "success" : "primary"} aria-label={`${label}: ${pct(done, total)}%`} />
    {caption && (
      <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 0.5 }}>
        {caption}
      </Typography>
    )}
  </Box>
);

const QualityRow = ({ icon, label, value, hint, tone }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}>
    <Box sx={{ display: "flex", color: tone ? `${tone}.main` : "text.secondary", "& svg": { fontSize: 20 } }}>{icon}</Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {hint}
        </Typography>
      )}
    </Box>
    <Typography variant="body1" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
      {value}
    </Typography>
  </Box>
);

// ---------------------------------------------------------------------------- block table

const SORTS = {
  block: (b) => upper(b.block),
  district: (b) => upper(b.district),
  sections: (b) => b.sections,
  planned: plannedOf,
  laid: (b) => b.laidM,
  progress: (b) => (plannedOf(b) ? b.laidM / plannedOf(b) : -1),
  subs: (b) => b.subsTotal,
  pending: (b) => b.subs.PENDING_APPROVAL + b.restorations.PENDING_APPROVAL,
  activity: (b) => (b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0),
};

const SortHead = ({ id, sort, onSort, children, align }) => (
  <TableCell align={align} sortDirection={sort.by === id ? sort.dir : false}>
    <TableSortLabel active={sort.by === id} direction={sort.by === id ? sort.dir : "desc"} onClick={() => onSort(id)}>
      {children}
    </TableSortLabel>
  </TableCell>
);

const BlockProgressTable = ({ blocks }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  const [sort, setSort] = useState({ by: "laid", dir: "desc" });

  const rows = useMemo(() => {
    const key = SORTS[sort.by];
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...blocks].sort((a, b) => {
      const x = key(a);
      const y = key(b);
      return x < y ? -sign : x > y ? sign : upper(a.block).localeCompare(upper(b.block));
    });
  }, [blocks, sort]);

  const onSort = (by) => setSort((s) => ({ by, dir: s.by === by && s.dir === "desc" ? "asc" : "desc" }));
  const open = (b) => navigate(`/block-profiles/${b._id}`, { state: { blockProfileId: b._id, blockProfileName: b.block } });

  if (!blocks.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", p: 2.5 }}>
        No blocks match the filters.
      </Typography>
    );
  }

  if (isPhone) {
    return (
      <Box>
        {rows.map((b) => {
          const progress = pct(b.laidM, plannedOf(b));
          return (
            <Box
              key={b._id}
              onClick={() => open(b)}
              sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}
            >
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <Typography variant="body2" component="div" sx={{ fontWeight: 600, flex: 1 }}>
                  {b.block}
                  {b.isDemo && <DemoChip />}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {progress}%
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {[titleCase(b.district), `${b.sections} sections`, `${fmtLength(b.laidM)} of ${fmtLength(plannedOf(b))}`].filter(Boolean).join(" · ")}
              </Typography>
              <Meter value={progress} sx={{ mt: 1 }} aria-label={`${b.block}: ${progress}%`} />
              <StackBar counts={b.subs} />
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 1100, "& td, & th": { py: 1.25 } }}>
        <TableHead>
          <TableRow>
            <SortHead id="block" sort={sort} onSort={onSort}>Block</SortHead>
            <SortHead id="district" sort={sort} onSort={onSort}>District</SortHead>
            <TableCell>Infra</TableCell>
            <SortHead id="sections" sort={sort} onSort={onSort} align="right">Sections</SortHead>
            <SortHead id="planned" sort={sort} onSort={onSort} align="right">Planned</SortHead>
            <SortHead id="laid" sort={sort} onSort={onSort} align="right">Laid</SortHead>
            <SortHead id="progress" sort={sort} onSort={onSort}>Progress</SortHead>
            <SortHead id="subs" sort={sort} onSort={onSort}>Subsections</SortHead>
            <TableCell>Restoration</TableCell>
            <SortHead id="pending" sort={sort} onSort={onSort} align="right">Waiting</SortHead>
            <SortHead id="activity" sort={sort} onSort={onSort}>Last activity</SortHead>
            <TableCell padding="checkbox" />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((b) => {
            const planned = plannedOf(b);
            const progress = pct(b.laidM, planned);
            const pending = b.subs.PENDING_APPROVAL + b.restorations.PENDING_APPROVAL;
            return (
              <TableRow key={b._id} hover onClick={() => open(b)} sx={{ cursor: "pointer" }}>
                <TableCell>
                  <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
                    {b.block}
                    {b.isDemo && <DemoChip />}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    LGD {b.blockCode}
                    {b.status !== "ACTIVE" && ` · ${titleCase(b.status)}`}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{titleCase(b.district) || "—"}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Typography variant="body2">{b.infraDone ? "Block ✓" : "Block —"}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    GPs {b.gpsInfra}/{b.gpsEntered}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatNumber(b.sections)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {planned ? fmtLength(planned) : "—"}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {fmtLength(b.laidM)}
                </TableCell>
                <TableCell sx={{ width: 160 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Meter value={progress} sx={{ flex: 1 }} color={progress >= 100 ? "success" : "primary"} aria-label={`${b.block}: ${progress}%`} />
                    <Typography variant="caption" sx={{ width: 34, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {planned ? `${progress}%` : "—"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ width: 170 }}>
                  {b.subsTotal ? (
                    <Tooltip
                      title={BAR_ORDER.filter((k) => b.subs[k])
                        .map((k) => `${b.subs[k]} ${k.toLowerCase().replace(/_/g, " ")}`)
                        .join(" · ")}
                    >
                      <Box>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {b.subs.APPROVED}/{b.subsTotal} approved
                        </Typography>
                        <Box sx={{ mt: -0.5 }}>
                          <StackBar counts={b.subs} />
                        </Box>
                      </Box>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" sx={{ color: "text.disabled" }}>
                      None yet
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {b.sections ? `${b.restorations.APPROVED}/${b.sections} restored` : "—"}
                </TableCell>
                <TableCell align="right">
                  {pending ? <StatusPill label={formatNumber(pending)} tone="warning" /> : <Typography variant="caption" sx={{ color: "text.disabled" }}>0</Typography>}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>{ago(b.lastActivityAt)}</TableCell>
                <TableCell padding="checkbox">
                  <ChevronRightIcon fontSize="small" sx={{ color: "text.disabled", display: "block" }} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ---------------------------------------------------------------------------- page

const LoadingState = () => (
  <Grid container spacing={2.5}>
    <Grid size={{ xs: 12, md: 5 }}>
      <Skeleton variant="rounded" height={210} />
    </Grid>
    <Grid size={{ xs: 12, md: 7 }}>
      <Skeleton variant="rounded" height={210} />
    </Grid>
    <Grid size={{ xs: 12, md: 8 }}>
      <Skeleton variant="rounded" height={340} />
    </Grid>
    <Grid size={{ xs: 12, md: 4 }}>
      <Skeleton variant="rounded" height={340} />
    </Grid>
  </Grid>
);

const ExecutionDashboardPage = () => {
  const { can, loading: permissionsLoading, error: permissionsError } = usePermissions();
  const { statusOf, restorationOf } = useExecutionConfig();
  const [filters, setFilters] = useState({ state: "", district: "", blockProfile: "", status: "", days: 30 });
  const [data, setData] = useState(undefined);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    // Only the latest request updates the page, so quick filter changes can't show stale figures
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    setError("");
    try {
      const res = await executionService.getExecutionDashboard(filters);
      if (requestId === requestIdRef.current) setData(res);
    } catch (e) {
      if (requestId === requestIdRef.current) {
        setData((previous) => previous ?? null);
        setError(e.message || "Failed to load the execution dashboard");
      }
    } finally {
      if (requestId === requestIdRef.current) setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Filter options from every visible block; districts follow the state, blocks the district
  const options = useMemo(() => {
    const all = data?.options || [];
    const unique = (values) => [...new Map(values.filter(Boolean).map((v) => [upper(v), v])).values()].sort((a, b) => upper(a).localeCompare(upper(b)));
    const inState = all.filter((o) => !filters.state || upper(o.state) === upper(filters.state));
    const inDistrict = inState.filter((o) => !filters.district || upper(o.district) === upper(filters.district));
    return {
      states: unique(all.map((o) => o.state)),
      districts: unique(inState.map((o) => o.district)),
      blocks: inDistrict,
    };
  }, [data?.options, filters.state, filters.district]);

  const setFilter = (key, value) =>
    setFilters((f) => ({
      ...f,
      [key]: value,
      // A narrower choice made under the old parent no longer applies
      ...(key === "state" ? { district: "", blockProfile: "" } : {}),
      ...(key === "district" ? { blockProfile: "" } : {}),
    }));

  if (!permissionsLoading && !can("viewExecution")) {
    return (
      <Box>
        <PageHeader title="Execution Dashboard" />
        <Alert severity={permissionsError ? "error" : "info"}>
          {permissionsError ? `Couldn't check your permissions: ${permissionsError}` : "The execution dashboard isn't available for your role."}
        </Alert>
      </Box>
    );
  }

  const totals = data?.totals;
  const quality = data?.quality;
  const generatedAt = data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : null;
  const filtered = filters.state || filters.district || filters.blockProfile || filters.status;

  return (
    <Box>
      <PageHeader
        title="Execution Dashboard"
        subtitle="OFC execution progress across block profiles: length laid, subsections, restoration, infra and the field team"
        actions={
          <>
            {generatedAt && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Updated {generatedAt}
              </Typography>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={refreshing}>
              Refresh
            </Button>
          </>
        }
      />

      {/* Filters, in one row above everything they change */}
      <Card sx={{ p: 2, mb: 2.5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
        <TextField select size="small" label="State" slotProps={SELECT_PROPS} value={filters.state} onChange={(e) => setFilter("state", e.target.value)} sx={{ width: { xs: "100%", sm: 170 } }}>
          <MenuItem value="">All states</MenuItem>
          {options.states.map((s) => (
            <MenuItem key={s} value={s}>
              {titleCase(s)}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="District" slotProps={SELECT_PROPS} value={filters.district} onChange={(e) => setFilter("district", e.target.value)} sx={{ width: { xs: "100%", sm: 190 } }}>
          <MenuItem value="">All districts</MenuItem>
          {options.districts.map((d) => (
            <MenuItem key={d} value={d}>
              {titleCase(d)}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Block" slotProps={SELECT_PROPS} value={filters.blockProfile} onChange={(e) => setFilter("blockProfile", e.target.value)} sx={{ width: { xs: "100%", sm: 220 } }}>
          <MenuItem value="">All blocks</MenuItem>
          {options.blocks.map((b) => (
            <MenuItem key={b._id} value={b._id}>
              {b.block}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Block status" slotProps={SELECT_PROPS} value={filters.status} onChange={(e) => setFilter("status", e.target.value)} sx={{ width: { xs: "100%", sm: 170 } }}>
          {STATUS_FILTERS.map((o) => (
            <MenuItem key={o.value || "default"} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        {filtered && (
          <Button size="small" onClick={() => setFilters((f) => ({ ...f, state: "", district: "", blockProfile: "", status: "" }))}>
            Clear filters
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filters.days}
          onChange={(e, days) => days && setFilter("days", days)}
          aria-label="Period for the trend and the field team"
        >
          {PERIODS.map((d) => (
            <ToggleButton key={d} value={d} sx={{ px: 1.5 }}>
              Last {d} days
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }} action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {data === undefined ? (
        <LoadingState />
      ) : !totals ? null : (
        <Box sx={{ opacity: refreshing ? 0.6 : 1, transition: "opacity 120ms" }}>
          <Grid container spacing={2.5}>
            {/* Headline */}
            <Grid size={{ xs: 12, lg: 5 }}>
              <Hero totals={totals} />
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Grid container spacing={2.5} sx={{ height: "100%" }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <StatTile
                    label="Blocks"
                    value={totals.blocks}
                    icon={<ViewModuleOutlinedIcon />}
                    caption={`${formatNumber(totals.gpsEntered)} GPs · ${formatNumber(totals.sections)} sections · ${formatNumber(totals.sectionsWithWork)} with work`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <StatTile
                    label="Subsections approved"
                    value={totals.subs.APPROVED}
                    suffix={` / ${formatNumber(totals.subsTotal)}`}
                    icon={<CableOutlinedIcon />}
                    meterValue={pct(totals.subs.APPROVED, totals.subsTotal)}
                    caption={`${pct(totals.subs.APPROVED, totals.subsTotal)}% · ${formatNumber(totals.subs.IN_PROGRESS)} in progress`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <StatTile
                    label="Waiting approval"
                    value={totals.pendingApprovals}
                    icon={<HourglassTopIcon />}
                    caption={`${formatNumber(totals.subs.PENDING_APPROVAL)} subsections · ${formatNumber(totals.restorations.PENDING_APPROVAL)} restorations`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <StatTile
                    label="Sections restored"
                    value={totals.restorations.APPROVED}
                    suffix={` / ${formatNumber(totals.sections)}`}
                    icon={<VerifiedOutlinedIcon />}
                    meterValue={pct(totals.restorations.APPROVED, totals.sections)}
                    caption={`${formatNumber(totals.restorations.READY)} ready to capture`}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Trend and status */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <SectionCard title="Metres laid per day" subtitle={`Ducting entries, last ${data.days} days (India time)`} icon={<TimelineOutlinedIcon />} sx={{ height: "100%" }}>
                <DailyTrend trend={data.trend} days={data.days} />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <SectionCard title="Subsection status" subtitle={`${formatNumber(totals.subsTotal)} subsections`} icon={<DonutLargeOutlinedIcon />} sx={{ height: "100%" }}>
                {totals.subsTotal ? (
                  <>
                    <Box sx={{ mt: -1, mb: 2 }}>
                      <StackBar counts={totals.subs} />
                    </Box>
                    <StateList order={BAR_ORDER} counts={totals.subs} labelOf={statusOf} icons={STATUS_ICONS} />
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No subsections yet.
                  </Typography>
                )}
                {totals.sections > 0 && (
                  <Box sx={{ mt: 2.5, pt: 2, borderTop: 1, borderColor: "divider" }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Restoration · {formatNumber(totals.sections)} sections
                    </Typography>
                    <Box sx={{ mb: 1.5 }}>
                      <RestorationBar counts={totals.restorations} />
                    </Box>
                    <StateList order={RESTORATION_ORDER} counts={totals.restorations} labelOf={restorationOf} icons={RESTORATION_ICONS} />
                  </Box>
                )}
              </SectionCard>
            </Grid>

            {/* Work type and infra */}
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="Work by type" subtitle="Laid against the subsections' planned length" icon={<ConstructionOutlinedIcon />} sx={{ height: "100%" }}>
                <Stack spacing={2}>
                  {data.byType
                    .filter((t) => t.ducting)
                    .map((t) => (
                      <MeterRow
                        key={t.typeOfWork}
                        label={t.label}
                        done={t.laidM}
                        total={t.plannedM}
                        valueText={`${fmtLength(t.laidM)} / ${fmtLength(t.plannedM)}`}
                        caption={`${formatNumber(t.subsections)} subsections · ${formatNumber(t.approved)} approved`}
                      />
                    ))}
                  {data.byType.some((t) => !t.ducting) && (
                    <Box sx={{ pt: 1.5, borderTop: 1, borderColor: "divider" }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Other work
                      </Typography>
                      <Stack direction="row" useFlexGap spacing={3} sx={{ flexWrap: "wrap" }}>
                        {data.byType
                          .filter((t) => !t.ducting)
                          .map((t) => (
                            <Figure key={t.typeOfWork} label={t.label} value={`${t.approved} / ${t.subsections} approved`} />
                          ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="Infra and equipment" subtitle="Captured on the mobile app and the equipment sheets" icon={<RouterOutlinedIcon />} sx={{ height: "100%" }}>
                <Stack spacing={2}>
                  <MeterRow label="Block router infra" done={totals.blocksInfra} total={totals.blocks} caption="Location and photos of the block router site" />
                  <MeterRow label="GP infra" done={totals.gpsInfra} total={totals.gpsEntered} caption={`${formatNumber(totals.gpsDeclared)} GPs declared on the profiles`} />
                  <MeterRow label="Block equipment sheets" done={totals.equipment.block} total={totals.blocks} />
                  <MeterRow label="GP equipment sheets" done={totals.equipment.gp} total={totals.gpsEntered} caption={`${formatNumber(totals.equipment.misc)} misc sheets`} />
                </Stack>
              </SectionCard>
            </Grid>

            {/* Quality and team */}
            <Grid size={{ xs: 12, md: 5 }}>
              <SectionCard title="Quality checks" subtitle="What the approver looks at twice" icon={<RuleOutlinedIcon />} sx={{ height: "100%" }} contentSx={{ py: 1 }}>
                <QualityRow
                  icon={<ErrorOutlineIcon />}
                  label="Needs fix"
                  hint={`${formatNumber(quality.restorationsRejected)} restorations too`}
                  value={formatNumber(quality.rejected)}
                  tone={quality.rejected ? "error" : undefined}
                />
                <QualityRow
                  icon={<GpsOffOutlinedIcon />}
                  label="Entries above the GPS limit"
                  hint={`${pct(quality.entriesAboveLimit, totals.entries)}% of ${formatNumber(totals.entries)} entries`}
                  value={formatNumber(quality.entriesAboveLimit)}
                  tone={quality.entriesAboveLimit ? "warning" : undefined}
                />
                <QualityRow
                  icon={<StraightenOutlinedIcon />}
                  label="Off the planned length"
                  hint="Ended ducting more than 10% off plan"
                  value={formatNumber(quality.planDeviation)}
                  tone={quality.planDeviation ? "warning" : undefined}
                />
                <QualityRow
                  icon={<ScheduleOutlinedIcon />}
                  label="Median time to approval"
                  hint={quality.approvalsMeasured ? `From end of work, over ${formatNumber(quality.approvalsMeasured)} approvals` : "No approvals yet"}
                  value={hoursLabel(quality.approvalMedianHours)}
                />
                <QualityRow
                  icon={<FormatListNumberedOutlinedIcon />}
                  label="GP count mismatch"
                  hint="Blocks whose declared GPs differ from the GP list"
                  value={formatNumber(quality.gpCountMismatch)}
                  tone={quality.gpCountMismatch ? "warning" : undefined}
                />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <SectionCard title="Field team" subtitle={`Who recorded entries in the last ${data.days} days`} icon={<GroupsOutlinedIcon />} sx={{ height: "100%" }} contentSx={{ p: 0 }}>
                {data.team.length ? (
                  <TableContainer>
                    <Table size="small" sx={{ "& td, & th": { py: 1.25 } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell sx={{ width: "38%" }}>Laid</TableCell>
                          <TableCell align="right">Entries</TableCell>
                          <TableCell align="right">Subsections</TableCell>
                          <TableCell>Last entry</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.team.map((t) => (
                          <TableRow key={t.name}>
                            <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Meter value={pct(t.laidM, data.team[0].laidM || 1)} sx={{ flex: 1 }} aria-label={`${t.name}: ${fmtLength(t.laidM)}`} />
                                <Typography variant="caption" sx={{ width: 58, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                  {fmtLength(t.laidM)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              {formatNumber(t.entries)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                              {formatNumber(t.subsections)}
                            </TableCell>
                            <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>{ago(t.lastAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary", p: 2.5 }}>
                    No entries recorded in the last {data.days} days.
                  </Typography>
                )}
              </SectionCard>
            </Grid>

            {/* Districts, when there is more than one to compare */}
            {data.districts.length > 1 && (
              <Grid size={12}>
                <SectionCard title="Progress by district" subtitle={`${data.districts.length} districts`} icon={<MapOutlinedIcon />} contentSx={{ p: 0 }}>
                  <TableContainer>
                    <Table size="small" sx={{ minWidth: 760, "& td, & th": { py: 1.25 } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>District</TableCell>
                          <TableCell align="right">Blocks</TableCell>
                          <TableCell align="right">GPs</TableCell>
                          <TableCell align="right">Sections</TableCell>
                          <TableCell align="right">Planned</TableCell>
                          <TableCell align="right">Laid</TableCell>
                          <TableCell sx={{ width: 200 }}>Progress</TableCell>
                          <TableCell align="right">Subsections approved</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...data.districts]
                          .sort((a, b) => b.laidM - a.laidM || upper(a.district).localeCompare(upper(b.district)))
                          .map((d) => {
                            const progress = pct(d.laidM, d.plannedM);
                            return (
                              <TableRow
                                key={`${upper(d.state)}|${upper(d.district)}`}
                                hover
                                onClick={() => setFilters((f) => ({ ...f, state: d.state, district: d.district, blockProfile: "" }))}
                                sx={{ cursor: "pointer" }}
                              >
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {titleCase(d.district) || "No district"}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                    {titleCase(d.state)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">{formatNumber(d.blocks)}</TableCell>
                                <TableCell align="right">{formatNumber(d.gps)}</TableCell>
                                <TableCell align="right">{formatNumber(d.sections)}</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                  {d.plannedM ? fmtLength(d.plannedM) : "—"}
                                </TableCell>
                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                  {fmtLength(d.laidM)}
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Meter value={progress} sx={{ flex: 1 }} aria-label={`${d.district}: ${progress}%`} />
                                    <Typography variant="caption" sx={{ width: 34, textAlign: "right", fontWeight: 600 }}>
                                      {d.plannedM ? `${progress}%` : "—"}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                  {formatNumber(d.subsApproved)} / {formatNumber(d.subsTotal)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </SectionCard>
              </Grid>
            )}

            {/* Every block */}
            <Grid size={12}>
              <SectionCard
                title="Progress by block"
                subtitle={`${formatNumber(data.blocks.length)} ${data.blocks.length === 1 ? "block" : "blocks"} · open one for its sections and map`}
                icon={<ViewModuleOutlinedIcon />}
                contentSx={{ p: 0 }}
              >
                <BlockProgressTable blocks={data.blocks} />
              </SectionCard>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default ExecutionDashboardPage;
