import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

const POINT_TYPES = [
  { value: "BHQ", label: "BHQ (Block Head Quarter)" },
  { value: "GP", label: "GP (Gram Panchayat)" },
  { value: "others", label: "Other" },
];

const formatCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : "—";
};

/** Inputs for one new route point, with its Add button. */
export const RoutePointForm = ({ point, onChange, onAdd }) => {
  const canAdd = Boolean(point.place && point.type && point.latitude && point.longitude);

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        alignItems: "start",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "1.4fr 1fr 1fr 1.3fr auto" },
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
        bgcolor: "background.default",
      }}
    >
      <TextField label="Place name" name="place" value={point.place} onChange={onChange} size="small" fullWidth required />
      <TextField
        label="Latitude"
        name="latitude"
        type="number"
        value={point.latitude}
        onChange={onChange}
        size="small"
        fullWidth
        required
        slotProps={{ htmlInput: { step: 0.000001, min: -90, max: 90 } }}
      />
      <TextField
        label="Longitude"
        name="longitude"
        type="number"
        value={point.longitude}
        onChange={onChange}
        size="small"
        fullWidth
        required
        slotProps={{ htmlInput: { step: 0.000001, min: -180, max: 180 } }}
      />
      <TextField
        select
        label="Point type"
        name="type"
        value={point.type}
        onChange={onChange}
        size="small"
        fullWidth
        required
        // The field shows the short code; the menu spells it out
        slotProps={{ select: { renderValue: (value) => (value === "others" ? "Other" : value) } }}
      >
        {POINT_TYPES.map((type) => (
          <MenuItem key={type.value} value={type.value}>
            {type.label}
          </MenuItem>
        ))}
      </TextField>
      <Button variant="outlined" startIcon={<AddIcon />} onClick={onAdd} disabled={!canAdd} sx={{ height: 40, whiteSpace: "nowrap" }}>
        Add point
      </Button>
    </Box>
  );
};

/**
 * The route's points in order. With `dragHandlers` the rows can be dragged to
 * reorder them; the first point is where the route starts and ends.
 */
export const RoutePointTable = ({ points, onRemove, dragHandlers }) => {
  if (!points || points.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 1.5 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No route points yet. Add them in the order the route should follow.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1.5 }}>
      <Table size="small" sx={{ "& tbody tr:last-of-type td": { borderBottom: 0 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: dragHandlers ? 72 : 48 }}>#</TableCell>
            <TableCell>Place</TableCell>
            <TableCell align="right">Latitude</TableCell>
            <TableCell align="right">Longitude</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="right" sx={{ width: 56 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {points.map((point, index) => {
            const isStart = Boolean(dragHandlers) && index === 0;
            return (
              <TableRow
                key={index}
                hover
                draggable={Boolean(dragHandlers)}
                onDragStart={dragHandlers ? (event) => dragHandlers.onDragStart(event, index) : undefined}
                onDragOver={dragHandlers?.onDragOver}
                onDrop={dragHandlers ? (event) => dragHandlers.onDrop(event, index) : undefined}
                sx={{
                  cursor: dragHandlers ? "grab" : undefined,
                  ...(isStart && { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05) }),
                }}
              >
                <TableCell sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {dragHandlers && <DragIndicatorIcon fontSize="small" sx={{ color: "text.disabled" }} />}
                    {index + 1}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    {point.place}
                    {isStart && <Chip label="Start / end" size="small" color="primary" variant="outlined" sx={{ height: 20 }} />}
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCoordinate(point.latitude)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCoordinate(point.longitude)}
                </TableCell>
                <TableCell>{point.type === "others" ? "Other" : point.type}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Remove point">
                    <IconButton
                      size="small"
                      onClick={() => onRemove(index)}
                      aria-label={`Remove ${point.place || `point ${index + 1}`}`}
                      sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
