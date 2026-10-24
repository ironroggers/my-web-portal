import React, { useMemo, useState } from "react";
import { Alert, Box, ButtonBase, Checkbox, CircularProgress, IconButton, InputAdornment, Link, TextField, Tooltip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CenterFocusStrongOutlinedIcon from "@mui/icons-material/CenterFocusStrongOutlined";
import { titleCase } from "../execution/execConstants";
import { MAX_BLOCKS, buildTree, pickState, togglePick } from "./masterMapLayers";

const TriCheckbox = ({ state, onChange, label }) => (
  <Checkbox
    size="small"
    checked={state === "all"}
    indeterminate={state === "some"}
    onChange={onChange}
    sx={{ p: 0.5 }}
    slotProps={{ input: { "aria-label": label } }}
  />
);

const Row = ({ depth, expanded, onExpand, children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, pl: 1 + depth * 2.25, pr: 1, minHeight: 34, "&:hover": { bgcolor: "action.hover" } }}>
    {onExpand ? (
      <IconButton size="small" onClick={onExpand} aria-label={expanded ? "Collapse" : "Expand"} sx={{ p: 0.25 }}>
        {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </IconButton>
    ) : (
      <Box sx={{ width: 26, flexShrink: 0 }} />
    )}
    {children}
  </Box>
);

const Count = ({ picked, total }) => (
  <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
    {picked ? `${picked}/${total}` : total}
  </Typography>
);

/**
 * State → District → Block with search and tri-state checkboxes. Picking is capped at
 * MAX_BLOCKS so the map never draws every block at once. `loadState(id)` is
 * "loading" | "error" | "ready" for a picked block.
 */
const MasterMapBlockTree = ({ blocks, selected, onChange, loadState, onRetry, onFocusBlock }) => {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [capped, setCapped] = useState(false);
  const tree = useMemo(() => buildTree(blocks, query), [blocks, query]);
  const searching = query.trim().length > 0;
  const isOpen = (id) => searching || expanded.has(id);
  const toggleOpen = (id) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pick = (group) => {
    const { next, capped: hitCap } = togglePick(selected, group);
    setCapped(hitCap);
    onChange(next);
  };
  const pickedIn = (group) => group.filter((b) => selected.has(b._id)).length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
      <Box sx={{ p: 1.5, pb: 1, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search state, district or block"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", flex: 1 }}>
            {selected.size} of {blocks.length} blocks on the map · up to {MAX_BLOCKS}
          </Typography>
          {selected.size > 0 && (
            <Link
              component="button"
              variant="caption"
              onClick={() => {
                setCapped(false);
                onChange(new Set());
              }}
            >
              Clear
            </Link>
          )}
        </Box>
      </Box>

      {capped && (
        <Alert severity="info" onClose={() => setCapped(false)} sx={{ m: 1.5, mb: 0 }}>
          Up to {MAX_BLOCKS} blocks show at once. Clear some to add others.
        </Alert>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", py: 0.5 }}>
        {tree.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", p: 3, textAlign: "center" }}>
            {searching ? "No block matches the search." : "No blocks yet."}
          </Typography>
        )}
        {tree.map((state) => {
          const stateBlocks = state.districts.flatMap((d) => d.blocks);
          return (
            <React.Fragment key={state.id}>
              <Row depth={0} expanded={isOpen(state.id)} onExpand={() => toggleOpen(state.id)}>
                <TriCheckbox state={pickState(stateBlocks, selected)} onChange={() => pick(stateBlocks)} label={`Pick every block in ${state.name}`} />
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                  {titleCase(state.name)}
                </Typography>
                <Count picked={pickedIn(stateBlocks)} total={stateBlocks.length} />
              </Row>
              {isOpen(state.id) &&
                state.districts.map((district) => (
                  <React.Fragment key={district.id}>
                    <Row depth={1} expanded={isOpen(district.id)} onExpand={() => toggleOpen(district.id)}>
                      <TriCheckbox state={pickState(district.blocks, selected)} onChange={() => pick(district.blocks)} label={`Pick every block in ${district.name}`} />
                      <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }} noWrap>
                        {titleCase(district.name)}
                      </Typography>
                      <Count picked={pickedIn(district.blocks)} total={district.blocks.length} />
                    </Row>
                    {isOpen(district.id) &&
                      district.blocks.map((b) => {
                        const on = selected.has(b._id);
                        const status = on ? loadState(b._id) : null;
                        return (
                          <Row key={b._id} depth={2}>
                            <Checkbox size="small" checked={on} onChange={() => pick([b])} sx={{ p: 0.5 }} slotProps={{ input: { "aria-label": `Show ${b.block}` } }} />
                            <ButtonBase
                              onClick={() => (on ? onFocusBlock(b._id) : pick([b]))}
                              sx={{ flex: 1, minWidth: 0, justifyContent: "flex-start", textAlign: "left", borderRadius: 0.5 }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" noWrap>
                                  {titleCase(b.block)}
                                </Typography>
                                <Typography variant="caption" component="div" sx={{ color: "text.secondary", lineHeight: 1.2 }} noWrap>
                                  {[b.blockCode, `${b.gpCount} ${b.gpCount === 1 ? "GP" : "GPs"}`].filter(Boolean).join(" · ")}
                                </Typography>
                              </Box>
                            </ButtonBase>
                            {status === "loading" && <CircularProgress size={14} aria-label="Loading" />}
                            {status === "error" && (
                              <Tooltip title="Couldn't load this block. Retry">
                                <IconButton size="small" color="error" onClick={() => onRetry(b._id)} aria-label={`Retry ${b.block}`}>
                                  <ErrorOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {status === "ready" && (
                              <Tooltip title="Zoom to this block">
                                <IconButton size="small" onClick={() => onFocusBlock(b._id)} aria-label={`Zoom to ${b.block}`}>
                                  <CenterFocusStrongOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Row>
                        );
                      })}
                  </React.Fragment>
                ))}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
};

export default MasterMapBlockTree;
