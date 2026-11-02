import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import PageHeader from "../common/PageHeader";
import SectionCard from "../common/SectionCard";
import ConfirmDeleteDialog from "../common/ConfirmDeleteDialog";
import { EmptyState, PageState } from "../execution/execUi";
import { showToast } from "../execution/toast";
import { titleCase } from "../execution/execConstants";
import { useLoader } from "../execution/useLoader";
import { useIsAdmin } from "../../hooks/useIsAdmin";
import executionService from "../../services/executionService.jsx";
import { fmtDateTime, fmtSize } from "../../utils/executionFormat";

// Excel reports, Admin only. Pick what the report is about (a block, a section or a subsection),
// then the sheets and columns, then generate: the server builds the workbook and keeps it, and it
// stays in the list below for download. The sheets and columns come from GET /api/reports/catalog.

const LEVELS = ["BLOCK", "SECTION", "SUBSECTION"];
const STEPS = ["What the report is about", "Choose the data", "Generate"];

// The last sheets and columns picked per level, kept in this browser only
const PICKS_KEY = (level) => `reports.picks.${level}`;
const readPicks = (level) => {
  try {
    return JSON.parse(localStorage.getItem(PICKS_KEY(level))) || null;
  } catch {
    return null;
  }
};
const savePicks = (level, picks) => {
  try {
    localStorage.setItem(PICKS_KEY(level), JSON.stringify(picks));
  } catch {
    // Not kept; the next report starts from every column
  }
};

// { sheetKey: Set(columnKeys) } with every sheet and column on, or the saved picks where they still apply
const startingPicks = (sheets, saved) =>
  Object.fromEntries(
    sheets
      .filter((sheet) => !saved || saved[sheet.key])
      .map((sheet) => {
        const keys = sheet.columns.map((c) => c.key);
        const kept = saved?.[sheet.key]?.filter((k) => keys.includes(k));
        return [sheet.key, new Set(kept?.length ? kept : keys)];
      })
  );

const blockLabel = (b) => (b ? `${titleCase(b.block)} · ${titleCase(b.district)}${b.blockCode ? ` (${b.blockCode})` : ""}` : "");

// ---- step 1: the block, section and subsection

const useBlockSearch = () => {
  const [q, setQ] = useState("");
  const [state, setState] = useState({ options: [], loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(() => {
      executionService
        .listBlocks({ q: q.trim() || undefined, limit: 25 })
        .then((data) => active && setState({ options: data.items || [], loading: false, error: "" }))
        .catch((error) => active && setState({ options: [], loading: false, error: error.message || "Couldn't load blocks" }));
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q]);
  return { ...state, setQ };
};

const TargetStep = ({ catalog, target, setTarget }) => {
  const blocks = useBlockSearch();
  const [sections, setSections] = useState({ items: [], loading: false, error: "" });
  const [subs, setSubs] = useState({ items: [], loading: false, error: "" });
  const blockId = target.block?._id;
  const sectionId = target.section?._id;

  useEffect(() => {
    if (!blockId || target.level === "BLOCK") return undefined;
    let active = true;
    setSections({ items: [], loading: true, error: "" });
    executionService
      .listSections(blockId)
      .then((data) => active && setSections({ items: [...(data.items || [])].sort((a, b) => String(a.name).localeCompare(String(b.name))), loading: false, error: "" }))
      .catch((error) => active && setSections({ items: [], loading: false, error: error.message || "Couldn't load sections" }));
    return () => {
      active = false;
    };
  }, [blockId, target.level]);

  useEffect(() => {
    if (!sectionId || target.level !== "SUBSECTION") return undefined;
    let active = true;
    setSubs({ items: [], loading: true, error: "" });
    executionService
      .listSubsections(sectionId)
      .then((data) => active && setSubs({ items: (data.items || []).filter((s) => s.typeOfWork), loading: false, error: "" }))
      .catch((error) => active && setSubs({ items: [], loading: false, error: error.message || "Couldn't load subsections" }));
    return () => {
      active = false;
    };
  }, [sectionId, target.level]);

  const pickSelect = (label, list, value, onPick, emptyText) => (
    <TextField
      select
      fullWidth
      size="small"
      label={label}
      value={value?._id || ""}
      onChange={(e) => onPick(list.items.find((item) => item._id === e.target.value) || null)}
      disabled={list.loading || !list.items.length}
      error={Boolean(list.error)}
      helperText={list.error || (list.loading ? "Loading…" : !list.items.length ? emptyText : " ")}
    >
      {list.items.map((item) => (
        <MenuItem key={item._id} value={item._id}>
          {item.name}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Report on a
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={target.level}
          onChange={(e, level) => level && setTarget((t) => ({ ...t, level, ...(level === "BLOCK" ? { section: null, sub: null } : level === "SECTION" ? { sub: null } : {}) }))}
        >
          {LEVELS.map((level) => (
            <ToggleButton key={level} value={level} sx={{ px: 2.5 }}>
              {catalog[level]?.label || level}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Autocomplete
        size="small"
        options={blocks.options}
        value={target.block}
        loading={blocks.loading}
        filterOptions={(x) => x}
        getOptionLabel={blockLabel}
        isOptionEqualToValue={(a, b) => a._id === b._id}
        onInputChange={(e, value, reason) => reason === "input" && blocks.setQ(value)}
        onChange={(e, block) => setTarget((t) => ({ ...t, block, section: null, sub: null }))}
        noOptionsText={blocks.error || "No blocks found"}
        renderInput={(params) => <TextField {...params} label="Block" placeholder="Search by block, district or LGD code" helperText=" " />}
      />
      {target.level !== "BLOCK" &&
        target.block &&
        pickSelect("Section", sections, target.section, (section) => setTarget((t) => ({ ...t, section, sub: null })), "This block has no sections yet")}
      {target.level === "SUBSECTION" &&
        target.section &&
        pickSelect("Subsection", subs, target.sub, (sub) => setTarget((t) => ({ ...t, sub })), "This section has no subsections yet")}
    </Stack>
  );
};

// ---- step 2: sheets and columns

const SheetRow = ({ sheet, picked, onChange }) => {
  const [open, setOpen] = useState(false);
  const on = Boolean(picked);
  const count = picked?.size || 0;
  const all = sheet.columns.map((c) => c.key);
  const toggleColumn = (key) => {
    const next = new Set(picked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1 }}>
        <Checkbox checked={on} onChange={() => onChange(on ? null : new Set(all))} inputProps={{ "aria-label": sheet.label }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {sheet.label}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {sheet.description}
          </Typography>
        </Box>
        <Button
          size="small"
          color="inherit"
          disabled={!on}
          onClick={() => setOpen((o) => !o)}
          endIcon={open && on ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ whiteSpace: "nowrap", color: count && count < all.length ? "warning.dark" : "text.secondary" }}
        >
          {on ? `${count} of ${all.length} columns` : `${all.length} columns`}
        </Button>
      </Box>
      <Collapse in={open && on} unmountOnExit>
        <Box sx={{ px: { xs: 2, sm: 7 }, pb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button size="small" onClick={() => onChange(new Set(all))}>
              All columns
            </Button>
            <Button size="small" onClick={() => onChange(new Set())}>
              None
            </Button>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, columnGap: 2 }}>
            {sheet.columns.map((c) => (
              <FormControlLabel
                key={c.key}
                control={<Checkbox size="small" checked={picked.has(c.key)} onChange={() => toggleColumn(c.key)} />}
                label={<Typography variant="body2">{c.label}</Typography>}
              />
            ))}
          </Box>
          {count === 0 && (
            <Typography variant="caption" sx={{ color: "error.main" }}>
              Pick at least one column, or untick the sheet.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

const DataStep = ({ sheets, picks, setPicks }) => {
  const onCount = Object.keys(picks).length;
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center", flexWrap: "wrap" }} useFlexGap>
        <Typography variant="body2" sx={{ color: "text.secondary", flex: 1, minWidth: 200 }}>
          Each ticked sheet becomes a tab in the workbook. Open the column count to leave columns out.
        </Typography>
        <Button size="small" onClick={() => setPicks(startingPicks(sheets, null))}>
          Every sheet
        </Button>
        <Button size="small" onClick={() => setPicks({})} disabled={!onCount}>
          Clear
        </Button>
      </Stack>
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
        {sheets.map((sheet) => (
          <SheetRow
            key={sheet.key}
            sheet={sheet}
            picked={picks[sheet.key]}
            onChange={(next) =>
              setPicks((p) => {
                const copy = { ...p };
                if (next) copy[sheet.key] = next;
                else delete copy[sheet.key];
                return copy;
              })
            }
          />
        ))}
      </Box>
    </Box>
  );
};

// ---- step 3: review and generate

const targetLine = (target) => [blockLabel(target.block), target.section?.name, target.sub?.name].filter(Boolean).join(" › ");

const GenerateStep = ({ catalog, target, sheets, picks, error }) => (
  <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
    {error && <Alert severity="error">{error}</Alert>}
    <Typography variant="body2">
      <b>{catalog[target.level]?.label} report:</b> {targetLine(target)}
    </Typography>
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        {Object.keys(picks).length} sheets
      </Typography>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
        {sheets
          .filter((s) => picks[s.key])
          .map((s) => (
            <Chip key={s.key} size="small" label={picks[s.key].size === s.columns.length ? s.label : `${s.label} · ${picks[s.key].size}/${s.columns.length}`} />
          ))}
      </Stack>
    </Box>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      The workbook also gets an About tab saying what it covers, when and by whom. Photos and videos are not included.
    </Typography>
  </Stack>
);

// ---- stored reports

const StoredReports = ({ catalog, refreshKey, onDownload }) => {
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [deleting, setDeleting] = useState({ report: null, busy: false, error: "" });
  const [downloading, setDownloading] = useState(null);
  const load = useCallback(() => executionService.listReports({ level: level || undefined, page: page + 1, limit }), [level, page, limit]);
  const { data, error, reload } = useLoader(load);

  useEffect(() => {
    if (refreshKey) reload();
  }, [refreshKey, reload]);

  const download = async (report) => {
    setDownloading(report._id);
    try {
      await onDownload(report);
    } finally {
      setDownloading(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting((d) => ({ ...d, busy: true, error: "" }));
    try {
      await executionService.deleteReport(deleting.report._id);
      setDeleting({ report: null, busy: false, error: "" });
      showToast("Report deleted");
      reload();
    } catch (err) {
      setDeleting((d) => ({ ...d, busy: false, error: err.message || "Couldn't delete the report" }));
    }
  };

  return (
    <SectionCard
      title="Saved reports"
      subtitle={data ? `${data.total} in all` : undefined}
      contentSx={{ p: 0 }}
      action={
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <TextField select size="small" value={level} onChange={(e) => {
            setLevel(e.target.value);
            setPage(0);
          }} sx={{ minWidth: 140 }} SelectProps={{ displayEmpty: true }}>
            <MenuItem value="">Every level</MenuItem>
            {LEVELS.map((l) => (
              <MenuItem key={l} value={l}>
                {catalog[l]?.label || l}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="Refresh">
            <IconButton onClick={reload} aria-label="Refresh">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {!data ? (
        <Box sx={{ p: 2.5 }}>
          <PageState error={error} onRetry={reload} height={120} />
        </Box>
      ) : !data.reports.length ? (
        <EmptyState icon={<SummarizeOutlinedIcon />} title="No reports yet" text={level ? "None at this level." : "Generate one above; it stays here to download again."} />
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Report</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Sheets</TableCell>
                  <TableCell>Generated</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.reports.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={r.title}>
                        {titleCase(r.names?.block) || r.title}
                        {r.names?.section ? ` › ${r.names.section}` : ""}
                        {r.names?.subSection ? ` › ${r.names.subSection}` : ""}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap component="p" title={r.fileName}>
                        {r.fileName}
                      </Typography>
                    </TableCell>
                    <TableCell>{catalog[r.level]?.label || r.level}</TableCell>
                    <TableCell>
                      <Tooltip title={(r.sheets || []).map((s) => `${s.label} (${s.rows} rows)`).join(", ")}>
                        <span>{(r.sheets || []).length}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{fmtDateTime(r.createdAt)}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {r.createdBy?.name || ""}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{fmtSize(r.sizeBytes)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="Download">
                        <span>
                          <IconButton size="small" onClick={() => download(r)} disabled={downloading === r._id} aria-label="Download">
                            {downloading === r._id ? <CircularProgress size={18} /> : <DownloadIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleting({ report: r, busy: false, error: "" })} aria-label="Delete">
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data.total}
            page={page}
            rowsPerPage={limit}
            rowsPerPageOptions={[10, 20, 50]}
            onPageChange={(e, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(0);
            }}
          />
        </>
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleting.report)}
        title="Delete this report?"
        error={deleting.error}
        deleting={deleting.busy}
        onCancel={() => setDeleting({ report: null, busy: false, error: "" })}
        onConfirm={confirmDelete}
      >
        {deleting.report?.fileName} will be removed for every admin. The data it came from stays; you can generate it again.
      </ConfirmDeleteDialog>
    </SectionCard>
  );
};

// ---- the page

const ReportsPage = () => {
  const isAdmin = useIsAdmin();
  const loadCatalog = useCallback(() => (isAdmin ? executionService.getReportCatalog() : Promise.resolve(null)), [isAdmin]);
  const { data: catalogData, error: catalogError, reload: reloadCatalog } = useLoader(loadCatalog);
  const catalog = useMemo(() => catalogData?.levels || {}, [catalogData]);

  const [step, setStep] = useState(0);
  const [target, setTarget] = useState({ level: "BLOCK", block: null, section: null, sub: null });
  const sheets = useMemo(() => catalog[target.level]?.sheets || [], [catalog, target.level]);
  const [picks, setPicks] = useState({});
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // A new level starts from that level's last picks (or everything)
  useEffect(() => {
    if (sheets.length) setPicks(startingPicks(sheets, readPicks(target.level)));
  }, [sheets, target.level]);

  const download = async (report) => {
    try {
      const name = await executionService.downloadReport(report);
      showToast(`Downloaded ${name}`);
    } catch (err) {
      showToast(err.message || "Download failed", "error");
    }
  };

  if (!isAdmin) {
    return (
      <Box>
        <PageHeader title="Reports" />
        <Alert severity="info">Only Admin can generate and download reports.</Alert>
      </Box>
    );
  }

  const targetReady =
    Boolean(target.block) && (target.level === "BLOCK" || Boolean(target.section)) && (target.level !== "SUBSECTION" || Boolean(target.sub));
  const pickedSheets = Object.entries(picks);
  const dataReady = pickedSheets.length > 0 && pickedSheets.every(([, cols]) => cols.size > 0);
  const canNext = step === 0 ? targetReady : step === 1 ? dataReady : false;

  const generate = async () => {
    setGenerating(true);
    setGenerateError("");
    const body = {
      level: target.level,
      blockProfile: target.block._id,
      section: target.section?._id,
      subSection: target.sub?._id,
      sheets: pickedSheets.map(([key, cols]) => ({ key, columns: [...cols] })),
    };
    try {
      const report = await executionService.createReport(body);
      savePicks(target.level, Object.fromEntries(pickedSheets.map(([key, cols]) => [key, [...cols]])));
      showToast("Report generated");
      setRefreshKey((k) => k + 1);
      setStep(0);
      await download(report);
    } catch (err) {
      setGenerateError(err.message || "Couldn't generate the report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Reports" subtitle="Excel reports of a block, a section or a subsection, kept here to download again" />
      {!catalogData ? (
        <PageState error={catalogError} onRetry={reloadCatalog} height={240} />
      ) : (
        <>
          <SectionCard title="New report" sx={{ mb: 3 }}>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {step === 0 && <TargetStep catalog={catalog} target={target} setTarget={setTarget} />}
            {step === 1 && <DataStep sheets={sheets} picks={picks} setPicks={setPicks} />}
            {step === 2 && <GenerateStep catalog={catalog} target={target} sheets={sheets} picks={picks} error={generateError} />}
            <Stack direction="row" spacing={1.5} sx={{ mt: 3, justifyContent: "flex-end" }}>
              {step > 0 && (
                <Button onClick={() => {
                    setStep((s) => s - 1);
                    setGenerateError("");
                  }} disabled={generating}>
                  Back
                </Button>
              )}
              {step < 2 ? (
                <Button variant="contained" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={generate}
                  disabled={generating || !dataReady}
                  startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
                >
                  {generating ? "Generating…" : "Generate and download"}
                </Button>
              )}
            </Stack>
          </SectionCard>
          <StoredReports catalog={catalog} refreshKey={refreshKey} onDownload={download} />
        </>
      )}
    </Box>
  );
};

export default ReportsPage;
