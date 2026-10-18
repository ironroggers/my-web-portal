import React, { useCallback, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  Skeleton,
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
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import executionService from "../../services/executionService.jsx";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { countLabel, fmtAccuracy, fmtDateTime, fmtDistance, fmtLatLong } from "../../utils/executionFormat";
import StatusPill from "../common/StatusPill";
import ChipGroup from "../execution/ChipGroup";
import ExecMediaViewer from "../execution/ExecMediaViewer";
import { EmptyState } from "../execution/execUi";
import { titleCase } from "../execution/execConstants";
import { mediaSrc } from "../execution/mediaItems";
import { useLoader } from "../execution/useLoader";

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

/** Block infra tab (C3): the BHQ capture, or an empty state with "Capture block infra" */
export const BlockInfraPanel = ({ blockProfile, canCapture }) => {
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
          text="Record the block HQ's location and up to 4 geo-stamped photos with descriptions."
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
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          {titleCase(data.target?.name) || "Block HQ"}
        </Typography>
        <StatusPill label="Captured" tone="success" />
      </Box>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Saved {fmtDateTime(capture.updatedAt)}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: "monospace", mt: 1 }}>
        {fmtLatLong(capture.latitude, capture.longitude)}{" "}
        <Box component="span" sx={{ fontFamily: "inherit", color: "text.secondary", fontSize: "0.75rem" }}>
          {fmtAccuracy(capture.accuracy, config?.accuracyLimitM)}
        </Box>
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.5, my: 2 }}>
        {capture.photos.map((ph, i) => (
          <ButtonBase key={ph.media?.url || i} onClick={() => setViewing(ph.media)} sx={{ display: "block", textAlign: "left", borderRadius: 1 }}>
            <Box component="img" src={mediaSrc(ph.media)} alt="" sx={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 1, bgcolor: "action.hover" }} />
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
    </Card>
  );
};

const GpStatus = ({ captured }) => (captured ? <StatusPill label="Captured" tone="success" /> : <StatusPill label="To capture" />);

/** GPs tab (C4): every GP nearest to the BHQ first, filterable by capture state */
export const GpInfraPanel = ({ blockProfile, canCapture }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  const [filter, setFilter] = useState("ALL");
  const load = useCallback(() => executionService.getGpInfraList(blockProfile._id), [blockProfile._id]);
  const { data, error, reload } = useLoader(load);

  if (error && !data) return <LoadError error={error} onRetry={reload} />;
  if (!data) return <Skeleton variant="rounded" height={260} />;

  const all = data.items || [];
  const list = all.filter((g) => filter === "ALL" || (filter === "DONE") === g.captured);
  const canOpen = (g) => canCapture || g.captured;
  const open = (g) => canOpen(g) && navigate(`/block-profiles/${blockProfile._id}/gps/${encodeURIComponent(g.lgdCode)}/infra`);
  const meta = (g) =>
    [g.distanceFromBhqM != null ? `${fmtDistance(g.distanceFromBhqM)} from BHQ` : "", g.captured ? countLabel(g.photoCount, "photo") : ""].filter(Boolean).join(" · ");

  return (
    <Card>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <ChipGroup
          nowrap
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All", count: all.length },
            { value: "PENDING", label: "To capture", count: all.length - data.captured },
            { value: "DONE", label: "Captured", count: data.captured },
          ]}
        />
      </Box>
      {!list.length ? (
        <EmptyState icon={<TaskAltIcon />} title="Nothing here" text={all.length ? "No GPs match this filter." : "This block has no GPs yet."} />
      ) : isPhone ? (
        list.map((g) => (
          <ButtonBase
            key={g.lgdCode}
            onClick={() => open(g)}
            disabled={!canOpen(g)}
            sx={{ display: "flex", width: "100%", textAlign: "left", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", gap: 1 }}
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
          </ButtonBase>
        ))
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>GP</TableCell>
                <TableCell>LGD code</TableCell>
                <TableCell align="right">From BHQ</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Photos</TableCell>
                <TableCell>Saved</TableCell>
                <TableCell padding="checkbox" />
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((g) => (
                <TableRow key={g.lgdCode} hover={canOpen(g)} onClick={() => open(g)} sx={{ cursor: canOpen(g) ? "pointer" : "default" }}>
                  <TableCell sx={{ fontWeight: 600 }}>{titleCase(g.name)}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{g.lgdCode}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {g.distanceFromBhqM != null ? fmtDistance(g.distanceFromBhqM) : "—"}
                  </TableCell>
                  <TableCell>
                    <GpStatus captured={g.captured} />
                  </TableCell>
                  <TableCell align="right">{g.captured ? g.photoCount : "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{g.savedAt ? fmtDateTime(g.savedAt) : "—"}</TableCell>
                  <TableCell padding="checkbox">
                    {canOpen(g) && <ChevronRightIcon fontSize="small" sx={{ color: "text.disabled", display: "block" }} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
};
