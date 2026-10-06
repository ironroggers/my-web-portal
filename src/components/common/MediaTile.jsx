import React from "react";
import { Box, ButtonBase, Tooltip } from "@mui/material";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { getCoordinates, getMediaKind } from "../../utils/mediaUtils";

/** Square thumbnail for a photo, video or file that opens it when clicked. */
const MediaTile = ({ media, onOpen, label, size = 72 }) => {
  const kind = getMediaKind(media.fileType);
  const hasGps = Boolean(getCoordinates(media));
  return (
    <Tooltip title={[label, hasGps ? "Has GPS location" : null].filter(Boolean).join(" · ")}>
      <ButtonBase
        onClick={() => onOpen(media)}
        disabled={!media.url}
        aria-label={`Open ${label || "media"}`}
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: 1,
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
          bgcolor: "action.hover",
          color: "text.secondary",
          "&:hover": { borderColor: "text.disabled" },
          "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
        }}
      >
        {kind === "image" && media.url ? (
          <Box component="img" src={media.url} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : kind === "video" ? (
          <OndemandVideoIcon />
        ) : (
          <InsertDriveFileOutlinedIcon />
        )}
      </ButtonBase>
    </Tooltip>
  );
};

export default MediaTile;
