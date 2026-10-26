import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SectionCard from "../common/SectionCard";
import blockProfileService from "../../services/blockProfileService.jsx";
import { TEAM_ROLES, roleLabel } from "../../config/roles";

const ROLE_HINTS = {
  "ZONAL MANAGER": "Edits the block, creates sections, approves sections to Admin. Set by Admin.",
  "CLUSTER HEAD": "Reviews every subsection with the GIS Head.",
  "GIS HEAD": "Reviews every subsection with the Cluster Head.",
  "FIELD EXECUTIVE": "Creates and executes subsections in the mobile app.",
};

const membersOf = (team, role) => (team || []).filter((m) => m.role === role);

/**
 * The people working on a block, by role. Users with an assigned scope see only the blocks
 * they're on. Admin edits the Zonal Managers; Admin and the block's Zonal Manager edit the rest.
 */
const BlockTeamPanel = ({ blockProfile, canEdit, canEditZonal, onSaved }) => {
  const [open, setOpen] = useState(false);
  const team = blockProfile.team || [];

  return (
    <>
      <SectionCard
        title="Team"
        subtitle="Who works on this block. Field Executives, Cluster Heads and GIS Heads see only the blocks they're on."
        icon={<GroupOutlinedIcon />}
        action={
          canEdit && (
            <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setOpen(true)}>
              Edit team
            </Button>
          )
        }
      >
        <Grid container spacing={2}>
          {TEAM_ROLES.map((role) => {
            const members = membersOf(team, role);
            return (
              <Grid key={role} size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {roleLabel(role)}s
                </Typography>
                <Typography variant="caption" component="div" sx={{ color: "text.secondary", mb: 1 }}>
                  {ROLE_HINTS[role]}
                </Typography>
                {members.length ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {members.map((m) => (
                      <Chip key={m.userId} label={m.name || m.userId} size="small" variant="outlined" />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.disabled" }}>
                    None assigned
                  </Typography>
                )}
              </Grid>
            );
          })}
        </Grid>
      </SectionCard>
      {open && (
        <TeamDialog
          blockProfile={blockProfile}
          canEditZonal={canEditZonal}
          onClose={() => setOpen(false)}
          onSaved={(profile) => {
            setOpen(false);
            onSaved(profile);
          }}
        />
      )}
    </>
  );
};

const TeamDialog = ({ blockProfile, canEditZonal, onClose, onSaved }) => {
  const [options, setOptions] = useState({});
  const [loadError, setLoadError] = useState("");
  const [picked, setPicked] = useState(() =>
    Object.fromEntries(TEAM_ROLES.map((role) => [role, membersOf(blockProfile.team, role).map((m) => ({ ...m, userId: String(m.userId) }))]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all(TEAM_ROLES.map((role) => blockProfileService.usersWithRole(role)))
      .then((lists) => active && setOptions(Object.fromEntries(TEAM_ROLES.map((role, i) => [role, lists[i]]))))
      .catch((e) => active && setLoadError(e.message || "Couldn't load the users"));
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      const team = TEAM_ROLES.flatMap((role) => picked[role].map((m) => ({ userId: m.userId, name: m.name, role })));
      onSaved(await blockProfileService.updateTeam(blockProfile._id, team));
    } catch (e) {
      setError(e.message || "Couldn't save the team");
    } finally {
      setSaving(false);
    }
  };

  const loading = !loadError && !Object.keys(options).length;

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit team</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "8px !important" }}>
        {loadError && <Alert severity="error">{loadError}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {TEAM_ROLES.map((role) => {
          const locked = role === "ZONAL MANAGER" && !canEditZonal;
          return (
            <Autocomplete
              key={role}
              multiple
              disabled={locked || saving}
              loading={loading}
              options={options[role] || []}
              value={picked[role]}
              onChange={(event, value) => setPicked((p) => ({ ...p, [role]: value }))}
              getOptionLabel={(o) => o.name || o.userId}
              isOptionEqualToValue={(o, v) => String(o.userId) === String(v.userId)}
              renderOption={(props, o) => (
                <li {...props} key={o.userId}>
                  <Box>
                    <Typography variant="body2">{o.name}</Typography>
                    {o.email && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {o.email}
                      </Typography>
                    )}
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`${roleLabel(role)}s`}
                  size="small"
                  helperText={locked ? "Only Admin changes the Zonal Managers" : ROLE_HINTS[role]}
                />
              )}
            />
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save team"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BlockTeamPanel;
