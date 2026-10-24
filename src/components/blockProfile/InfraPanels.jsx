import React, { Fragment, useCallback, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  Collapse,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import AddAPhotoOutlinedIcon from "@mui/icons-material/AddAPhotoOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import RouterOutlinedIcon from "@mui/icons-material/RouterOutlined";
import executionService from "../../services/executionService.jsx";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { countLabel, fmtAccuracy, fmtDateTime, fmtDistance, fmtLatLong } from "../../utils/executionFormat";
import StatusPill from "../common/StatusPill";
import SectionCard from "../common/SectionCard";
import DetailRow from "../common/DetailRow";
import ChipGroup from "../execution/ChipGroup";
import ExecMediaViewer from "../execution/ExecMediaViewer";
import { EmptyState } from "../execution/execUi";
import { titleCase } from "../execution/execConstants";
import { mediaSrc } from "../execution/mediaItems";
import { useLoader } from "../execution/useLoader";
import EquipmentDetails from "./EquipmentDetails";

const LoadError = ({ error, onRetry }) => (
  <Alert
    severity="error"
    action={
      <Button color="inherit" size="small" onClick={onRetry}>
        Retry
      </Button>
    }
  >
    {error}
  </Alert>
);

const PROJECT_STATUS_LABELS = { DESIGNED: "Designed", EXECUTED: "Executed" };

const BLOCK_SHEETS = {
  block: {
    title: "Block equipment",
    empty: "Router asset code, make, model, management IP, ports and project status for this block.",
    columns: { xs: 1, md: 2, xl: 4 },
  },
  misc: {
    title: "Misc equipment",
    empty: "Rack, FDMS, FTB, CCU or SPV at the block: type, asset code, model, serial no., backhaul and project status.",
    columns: { xs: 1, md: 2 },
  },
};

/** A block-level equipment sheet (block or misc): filled once per block on the web */
const BlockEquipmentCard = ({ blockProfile, form, canEdit }) => {
  const navigate = useNavigate();
  const sheet = BLOCK_SHEETS[form];
  const load = useCallback(() => executionService.getBlockEquipment(blockProfile._id, form), [blockProfile._id, form]);
  const { data, error, reload } = useLoader(load);
  const open = () => navigate(`/block-profiles/${blockProfile._id}/equipment/${form}`);

  if (error && !data) return <LoadError error={error} onRetry={reload} />;
  if (!data) return <Skeleton variant="rounded" height={160} />;

  const r = data.record;
  if (!r) {
    return (
      <Card>
        <EmptyState
          icon={<RouterOutlinedIcon />}
          title={`${sheet.title} not filled`}
          text={sheet.empty}
          action={
            canEdit && (
              <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={open}>
                Fill {sheet.title.toLowerCase()}
              </Button>
            )
          }
        />
      </Card>
    );
  }

  return (
    <SectionCard
      title={sheet.title}
      subtitle={`Saved ${fmtDateTime(r.updatedAt)}`}
      action={<StatusPill label={PROJECT_STATUS_LABELS[r.projectStatus] || "Filled"} tone={r.projectStatus === "EXECUTED" ? "success" : "info"} />}
    >
      <EquipmentDetails formKey={form} record={r} columns={sheet.columns} />
      <Button variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={open} sx={{ mt: 2 }}>
        {canEdit ? "Edit" : "View"}
      </Button>
    </SectionCard>
  );
};

/** Block infra tab (C3): the block router site capture and the block's equipment and misc sheets */
export const BlockInfraPanel = ({ blockProfile, canCapture, canEditEquipment }) => (
  <Stack spacing={3}>
    <BlockCapture blockProfile={blockProfile} canCapture={canCapture} />
    <BlockEquipmentCard blockProfile={blockProfile} form="block" canEdit={canEditEquipment} />
    <BlockEquipmentCard blockProfile={blockProfile} form="misc" canEdit={canEditEquipment} />
  </Stack>
);

/** The block router site capture, or an empty state with "Capture block infra" */
const BlockCapture = ({ blockProfile, canCapture }) => {
  const navigate = useNavigate();
  const { config } = useExecutionConfig();
  const [viewing, setViewing] = useState(null);
  const load = useCallback(() => executionService.getBlockInfra(blockProfile._id), [blockProfile._id]);
  const { data, error, reload } = useLoader(load);
  const open = () => navigate(`/block-profiles/${blockProfile._id}/infra`);

  if (error && !data) return <LoadError error={error} onRetry={reload} />;
  if (!data) return <Skeleton variant="rounded" height={220} />;

  const capture = data.capture;
  if (!capture) {
    return (
      <Card>
        <EmptyState
          icon={<BusinessOutlinedIcon />}
          title="Block infra not captured"
          text="Record the block router site's location and up to 4 geo-stamped photos with descriptions."
          action={
            canCapture && (
              <Button variant="contained" startIcon={<AddAPhotoOutlinedIcon />} onClick={open}>
                Capture block infra
              </Button>
            )
          }
        />
      </Card>
    );
  }

  return (
    <SectionCard
      title={titleCase(data.target?.name) || "Block router"}
      subtitle={`Block infra · saved ${fmtDateTime(capture.updatedAt)}`}
      action={<StatusPill label="Captured" tone="success" />}
    >
      <DetailRow label="Location">{fmtLatLong(capture.latitude, capture.longitude)}</DetailRow>
      <DetailRow label="Accuracy">{fmtAccuracy(capture.accuracy, config?.accuracyLimitM)}</DetailRow>
      <DetailRow label="Photos">{String(capture.photos.length)}</DetailRow>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1.5,
          my: 2,
        }}
      >
        {capture.photos.map((ph, i) => (
          <ButtonBase key={ph.media?.url || i} onClick={() => setViewing(ph.media)} sx={{ display: "block", textAlign: "left", borderRadius: 1 }}>
            <Box
              component="img"
              src={mediaSrc(ph.media)}
              alt=""
              sx={{
                width: "100%",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                borderRadius: 1,
                bgcolor: "action.hover",
              }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
              {ph.description || "No description"}
            </Typography>
          </ButtonBase>
        ))}
      </Box>
      {canCapture && (
        <Button variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={open}>
          Update
        </Button>
      )}
      {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}
    </SectionCard>
  );
};

const GpStatus = ({ captured }) => (captured ? <StatusPill label="Captured" tone="success" /> : <StatusPill label="To capture" />);

const SheetPill = ({ label, filled }) => <StatusPill label={filled ? `${label} ✓` : `${label}: —`} tone={filled ? "success" : "default"} />;

/** One GP's gp and misc equipment sheets in full, shown when its row is expanded */
const GpEquipmentPanel = ({ blockProfile, gp, canCapture, canEditEquipment }) => {
  const navigate = useNavigate();
  const base = `/block-profiles/${blockProfile._id}/gps/${encodeURIComponent(gp.lgdCode)}`;
  const load = useCallback(
    () =>
      Promise.all([executionService.getGpEquipment(blockProfile._id, gp.lgdCode, "gp"), executionService.getGpEquipment(blockProfile._id, gp.lgdCode, "misc")]),
    [blockProfile._id, gp.lgdCode],
  );
  const { data, error, reload } = useLoader(load);

  if (error && !data) return <LoadError error={error} onRetry={reload} />;
  if (!data) return <Skeleton variant="rounded" height={180} />;

  const sheets = [
    { form: "gp", title: "GP equipment", record: data[0].record },
    { form: "misc", title: "Misc equipment", record: data[1].record },
  ];
  return (
    <Stack spacing={2}>
      {sheets.map(({ form, title, record }) => (
        <Box
          key={form}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: record ? 1 : 0,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              {title}
              {record && (
                <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
                  Saved {fmtDateTime(record.updatedAt)}
                </Typography>
              )}
            </Typography>
            {(record || canEditEquipment) && (
              <Button
                size="small"
                variant={record ? "outlined" : "contained"}
                startIcon={<EditOutlinedIcon />}
                onClick={() => navigate(`${base}/equipment/${form}`)}
              >
                {!record ? `Fill ${title.toLowerCase()}` : canEditEquipment ? "Edit" : "Open"}
              </Button>
            )}
          </Box>
          {record ? (
            <EquipmentDetails formKey={form} record={record} columns={{ xs: 1, md: 2, xl: form === "gp" ? 4 : 2 }} />
          ) : (
            !canEditEquipment && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Not filled yet
              </Typography>
            )
          )}
        </Box>
      ))}
      {(canCapture || gp.captured) && (
        <Box>
          <Button size="small" startIcon={gp.captured ? <PhotoLibraryOutlinedIcon /> : <AddAPhotoOutlinedIcon />} onClick={() => navigate(`${base}/infra`)}>
            {gp.captured ? "Open infra capture (location & photos)" : "Capture infra (location & photos)"}
          </Button>
        </Box>
      )}
    </Stack>
  );
};

const ExpandIcon = ({ open }) => (
  <ExpandMoreIcon
    fontSize="small"
    sx={{
      color: "text.secondary",
      display: "block",
      transition: "transform 150ms",
      transform: open ? "rotate(180deg)" : "none",
    }}
  />
);

/** GPs tab (C4): every GP nearest to the block router first, filterable by capture state */
export const GpInfraPanel = ({ blockProfile, canCapture, canEditEquipment }) => {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState(null);
  const load = useCallback(() => executionService.getGpInfraList(blockProfile._id), [blockProfile._id]);
  const { data, error, reload } = useLoader(load);

  if (error && !data) return <LoadError error={error} onRetry={reload} />;
  if (!data) return <Skeleton variant="rounded" height={260} />;

  const all = data.items || [];
  const list = all.filter((g) => filter === "ALL" || (filter === "DONE") === g.captured);
  const toggle = (g) => setExpanded((code) => (code === g.lgdCode ? null : g.lgdCode));
  const equipment = (g) => (
    <>
      <SheetPill label="Equipment" filled={g.gpEquipment} />
      <SheetPill label="Misc" filled={g.miscEquipment} />
    </>
  );
  const panel = (g) => (
    <Collapse in={expanded === g.lgdCode} unmountOnExit>
      <Box sx={{ p: 2, bgcolor: "action.hover" }}>
        <GpEquipmentPanel blockProfile={blockProfile} gp={g} canCapture={canCapture} canEditEquipment={canEditEquipment} />
      </Box>
    </Collapse>
  );
  const meta = (g) =>
    [g.distanceFromRouterM != null ? `${fmtDistance(g.distanceFromRouterM)} from the router` : "", g.captured ? countLabel(g.photoCount, "photo") : ""]
      .filter(Boolean)
      .join(" · ");

  return (
    <SectionCard title="Gram Panchayats" subtitle={`${data.captured} of ${all.length} captured · nearest to the block router first`} contentSx={{ p: 0 }}>
      <Box sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <ChipGroup
          nowrap
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All", count: all.length },
            {
              value: "PENDING",
              label: "To capture",
              count: all.length - data.captured,
            },
            { value: "DONE", label: "Captured", count: data.captured },
          ]}
        />
      </Box>
      {!list.length ? (
        <EmptyState icon={<TaskAltIcon />} title="Nothing here" text={all.length ? "No GPs match this filter." : "This block has no GPs yet."} />
      ) : isPhone ? (
        list.map((g) => (
          <Box key={g.lgdCode} sx={{ borderBottom: 1, borderColor: "divider" }}>
            <ButtonBase
              onClick={() => toggle(g)}
              aria-expanded={expanded === g.lgdCode}
              sx={{
                display: "flex",
                width: "100%",
                textAlign: "left",
                gap: 1,
                px: 2,
                pt: 1.5,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {titleCase(g.name)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  LGD {g.lgdCode}
                  {meta(g) ? ` · ${meta(g)}` : ""}
                </Typography>
              </Box>
              <GpStatus captured={g.captured} />
              <ExpandIcon open={expanded === g.lgdCode} />
            </ButtonBase>
            <Stack direction="row" spacing={1} sx={{ px: 2, pt: 1, pb: 1.5 }}>
              {equipment(g)}
            </Stack>
            {panel(g)}
          </Box>
        ))
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>GP</TableCell>
                <TableCell>LGD code</TableCell>
                <TableCell align="right">From router</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Photos</TableCell>
                <TableCell>Saved</TableCell>
                <TableCell>Equipment sheets</TableCell>
                <TableCell padding="checkbox" />
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((g) => (
                <Fragment key={g.lgdCode}>
                  <TableRow
                    hover
                    onClick={() => toggle(g)}
                    aria-expanded={expanded === g.lgdCode}
                    sx={{
                      cursor: "pointer",
                      "& > td": expanded === g.lgdCode ? { borderBottom: 0 } : undefined,
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{titleCase(g.name)}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{g.lgdCode}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {g.distanceFromRouterM != null ? fmtDistance(g.distanceFromRouterM) : "—"}
                    </TableCell>
                    <TableCell>
                      <GpStatus captured={g.captured} />
                    </TableCell>
                    <TableCell align="right">{g.captured ? g.photoCount : "—"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{g.savedAt ? fmtDateTime(g.savedAt) : "—"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {equipment(g)}
                      </Stack>
                    </TableCell>
                    <TableCell padding="checkbox">
                      <ExpandIcon open={expanded === g.lgdCode} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{
                        p: 0,
                        ...(expanded === g.lgdCode ? {} : { borderBottom: 0 }),
                      }}
                    >
                      {panel(g)}
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectionCard>
  );
};
