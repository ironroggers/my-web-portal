import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import CableOutlinedIcon from "@mui/icons-material/CableOutlined";

const Mark = ({ icon, label, done }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
      px: 1,
      py: 0.25,
      borderRadius: 999,
      bgcolor: done ? "rgba(21,128,61,0.1)" : "action.hover",
      color: done ? "success.dark" : "text.secondary",
      whiteSpace: "nowrap",
    }}
  >
    {done ? <CheckCircleIcon sx={{ fontSize: 15 }} /> : icon}
    <Typography component="span" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
      {label}
    </Typography>
  </Box>
);

/**
 * The three marks on the Blocks list: Block infra ✓, GPs x/y captured, OFC approved/total
 * (✓ once every section's restoration is approved)
 */
const ProgressMarks = ({ progress = {} }) => {
  const p = progress || {};
  const ofcDone = p.sectionsTotal > 0 && p.sectionsRestored === p.sectionsTotal;
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
      <Mark icon={<BusinessOutlinedIcon sx={{ fontSize: 15 }} />} label="Block" done={p.infraDone} />
      <Mark icon={<ApartmentOutlinedIcon sx={{ fontSize: 15 }} />} label={`GPs ${p.gpsCaptured || 0}/${p.gpsTotal || 0}`} done={p.gpsTotal > 0 && p.gpsCaptured === p.gpsTotal} />
      <Mark icon={<CableOutlinedIcon sx={{ fontSize: 15 }} />} label={`OFC ${p.subsApproved || 0}/${p.subsTotal || 0}`} done={ofcDone} />
    </Stack>
  );
};

export default ProgressMarks;
