import { Button } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";

const MediaFilesButton = ({ mediaFiles, onClick }) => {
  if (!mediaFiles || mediaFiles.length === 0) return null;

  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<AttachFileIcon />}
      onClick={onClick}
      sx={{
        outline: "none",
        textTransform: "none",
        justifyContent: "flex-start",
        color: "primary.main",
        "&:focus": {
          outline: "none",
        },
      }}
    >
      {mediaFiles.length}{" "}
      {mediaFiles.length === 1 ? "Media File" : "Media Files"}
    </Button>
  );
};

export default MediaFilesButton;
