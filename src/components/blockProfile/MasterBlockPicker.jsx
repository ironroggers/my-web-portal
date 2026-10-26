import React, { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import SourceOutlinedIcon from "@mui/icons-material/SourceOutlined";
import SectionCard from "../common/SectionCard";
import blockProfileService from "../../services/blockProfileService.jsx";
import { titleCase } from "../execution/execConstants";

/**
 * Pick a district and a block from the LGD master; onPick(block) gets the block with its
 * names, codes and GPs to fill the form with (everything stays editable). Blocks that
 * already have a profile can't be picked.
 */
const MasterBlockPicker = ({ onPick }) => {
  const [districts, setDistricts] = useState(null);
  const [districtCode, setDistrictCode] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [blockCode, setBlockCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    blockProfileService
      .masterDistricts()
      .then((res) => setDistricts(res.items || []))
      .catch((e) => {
        setDistricts([]);
        setError(e.message || "Couldn't load the master data");
      });
  }, []);

  useEffect(() => {
    if (!districtCode) {
      setBlocks([]);
      return;
    }
    blockProfileService
      .masterBlocks(districtCode)
      .then((res) => setBlocks(res.items || []))
      .catch((e) => setError(e.message || "Couldn't load the blocks"));
  }, [districtCode]);

  const pick = async (code) => {
    setBlockCode(code);
    if (!code) return;
    try {
      setLoading(true);
      setError("");
      onPick(await blockProfileService.masterBlock(code));
    } catch (e) {
      setError(e.message || "Couldn't load the block");
    } finally {
      setLoading(false);
    }
  };

  if (districts && !districts.length && !error) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        The LGD master is empty, so the block's details are typed by hand. Load it with scripts/importLgdMaster.js on the execution service.
      </Alert>
    );
  }

  return (
    <SectionCard
      title="Fill from LGD master"
      subtitle="Pick the block: its state, district, codes and GPs fill in below. You can still change anything."
      icon={<SourceOutlinedIcon />}
      sx={{ mb: 3 }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        <TextField
          select
          size="small"
          label="District"
          value={districtCode}
          onChange={(e) => {
            setDistrictCode(e.target.value);
            setBlockCode("");
          }}
          disabled={!districts}
        >
          {(districts || []).map((d) => (
            <MenuItem key={d.districtCode} value={d.districtCode}>
              {titleCase(d.district)} · {d.blocks} blocks
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Block"
          value={blockCode}
          onChange={(e) => pick(e.target.value)}
          disabled={!districtCode || loading}
          slotProps={{ input: { endAdornment: loading ? <CircularProgress size={16} sx={{ mr: 3 }} /> : undefined } }}
        >
          {blocks.map((b) => (
            <MenuItem key={b.blockCode} value={b.blockCode} disabled={Boolean(b.blockProfileId)}>
              <Box>
                <Typography variant="body2">
                  {titleCase(b.block)} · LGD {b.blockCode}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {b.blockProfileId ? "Already has a block profile" : `${b.gpCount} GPs`}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </SectionCard>
  );
};

export default MasterBlockPicker;
