import React, { useState } from "react";
import {
  Box,
  Button,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useExecutionConfig } from "../../hooks/useExecutionConfig";
import { fmtDateTime, fmtDistance, fmtLatLong } from "../../utils/executionFormat";
import ExecMediaViewer from "./ExecMediaViewer";
import { MediaThumb } from "./MediaPicker";

const dash = (v, digits) => (v === null || v === undefined || v === "" ? "—" : digits !== undefined ? Number(v).toFixed(digits) : String(v));

// Delete needs a second click on the same button
const DeleteButton = ({ armed, onClick }) => (
  <Button size="small" color="error" startIcon={<DeleteOutlineIcon fontSize="small" />} onClick={onClick} sx={{ whiteSpace: "nowrap" }}>
    {armed ? "Click again" : "Delete"}
  </Button>
);

/** Depth along the subsection (MUI X Charts), with the planned end */
export const DepthGraph = ({ entries, planned }) => {
  let x = 0;
  const points = [{ x: 0, y: null }];
  entries.forEach((e) => {
    x += Number(e.length) || 0;
    points.push({ x, y: Number(e.depth) || 0 });
  });
  const xMax = Math.max(planned || 0, x) || 1;
  return (
    <Box aria-label={`Depth profile: ${entries.length} points, ${fmtDistance(x)} of ${fmtDistance(planned)}`} role="img">
      <LineChart
        height={260}
        xAxis={[{ data: points.map((p) => p.x), min: 0, max: xMax, label: "Distance along subsection (m)" }]}
        yAxis={[{ reverse: true, min: 0, label: "Depth (m)" }]}
        series={[{ data: points.map((p) => p.y), label: "Depth", connectNulls: true, showMark: true, color: "#1d4ed8" }]}
        margin={{ left: 50, right: 16, top: 16, bottom: 40 }}
        hideLegend
      />
      {x < (planned || 0) && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Planned end at {fmtDistance(planned)}; done so far {fmtDistance(x)}.
        </Typography>
      )}
    </Box>
  );
};

/** Ducting: table (cumulative distance) or depth graph; other work: one card per entry */
const EntriesView = ({ sub, editable, onDelete }) => {
  const { isDucting } = useExecutionConfig();
  const [mode, setMode] = useState("table");
  const [armed, setArmed] = useState(null);
  const [viewing, setViewing] = useState(null);
  const entries = sub.entries || [];
  const type = sub.typeOfWork;

  if (!entries.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No entries yet.{editable ? " Use Add entry below." : ""}
      </Typography>
    );
  }

  const del = (id) => {
    if (armed !== id) {
      setArmed(id);
      return;
    }
    setArmed(null);
    onDelete(id);
  };

  if (!isDucting(type)) {
    return (
      <Box>
        {entries.map((e, i) => (
          <Box key={e._id} sx={{ display: "flex", gap: 1.5, py: 1, "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" } }}>
            {e.photo && <MediaThumb media={e.photo} size={64} onClick={() => setViewing(e.photo)} />}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                #{i + 1} · {fmtDateTime(e.capturedAt)}
              </Typography>
              <Typography variant="body2">{e.remarks || "—"}</Typography>
              <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                {fmtLatLong(e.latitude, e.longitude)}
              </Typography>
              {editable && (
                <Box>
                  <DeleteButton armed={armed === e._id} onClick={() => del(e._id)} />
                </Box>
              )}
            </Box>
          </Box>
        ))}
        {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}
      </Box>
    );
  }

  const cols = [["Dist (m)", (e, d) => d.toFixed(1)], ["Len", (e) => dash(e.length, 1)], ["Depth", (e) => dash(e.depth, 2)]];
  if (type === "HDD") cols.push(["Temp °C", (e) => dash(e.temperature)], ["Angle °", (e) => dash(e.angle)]);
  cols.push(["Offset", (e) => dash(e.offset, 1)], ["Side", (e) => dash(e.side)]);
  if (type !== "HDD") cols.push(["Protection", (e) => dash(e.protection)]);
  if (type === "CLAMP") cols.push(["Clamp on", (e) => dash(e.clampOn)], ["Method", (e) => dash(e.clampMethod)]);
  cols.push(
    ["Landmark", (e) => dash(e.landmark)],
    ["Lat, long", (e) => fmtLatLong(e.latitude, e.longitude)],
    ["GPS ±", (e) => (e.accuracy != null ? `${Number(e.accuracy).toFixed(1)} m` : "—")],
    ["Captured", (e) => [fmtDateTime(e.capturedAt), e.createdBy?.name].filter(Boolean).join(" · ") || "—"]
  );

  let dist = 0;
  const rows = entries.map((e) => {
    dist += Number(e.length) || 0;
    return { e, d: dist };
  });

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(e, v) => v && setMode(v)} aria-label="View">
          <ToggleButton value="table">
            <TableChartOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
            Table
          </ToggleButton>
          <ToggleButton value="graph">
            <ShowChartIcon fontSize="small" sx={{ mr: 0.5 }} />
            Graph
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {mode === "graph" ? (
        <DepthGraph entries={entries} planned={sub.subSectionLength} />
      ) : (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                {cols.map(([label]) => (
                  <TableCell key={label} sx={{ whiteSpace: "nowrap" }}>
                    {label}
                  </TableCell>
                ))}
                <TableCell>Photo</TableCell>
                {editable && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ e, d }, i) => (
                <TableRow key={e._id}>
                  <TableCell>{i + 1}</TableCell>
                  {cols.map(([label, get]) => (
                    <TableCell key={label} sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {get(e, d)}
                    </TableCell>
                  ))}
                  <TableCell>
                    {e.photo ? (
                      <Link component="button" variant="body2" onClick={() => setViewing(e.photo)}>
                        View
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {editable && (
                    <TableCell>
                      <DeleteButton armed={armed === e._id} onClick={() => del(e._id)} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}
    </Box>
  );
};

export default EntriesView;
