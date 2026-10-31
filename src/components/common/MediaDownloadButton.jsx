import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import executionService from "../../services/executionService.jsx";
import { showToast } from "../execution/toast";

/** Downloads a photo or video with its location stamp; the server adds it first if needed */
const MediaDownloadButton = ({ media, sx }) => {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    try {
      setBusy(true);
      const name = await executionService.downloadMedia(media);
      showToast(`Downloaded ${name}`);
    } catch (e) {
      showToast(e.message || "Download failed", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={busy ? <CircularProgress size={16} /> : <FileDownloadOutlinedIcon />}
      onClick={download}
      disabled={busy}
      sx={sx}
    >
      {busy ? "Preparing…" : `Download ${media.fileType === "VIDEO" ? "video" : "photo"}`}
    </Button>
  );
};

export default MediaDownloadButton;
