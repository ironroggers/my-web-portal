import { Button } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";

const MediaFilesButton = ({ mediaFiles, onClick }) => {
  if (!mediaFiles || mediaFiles.length === 0) return null;

  return (
    <Button
      variant="text"
      startIcon={<AttachFileIcon />}
      onClick={onClick}
      sx={{
        mt: 1,
        textTransform: "none",
        justifyContent: "flex-start",
      }}
    >
      {mediaFiles.length}{" "}
      {mediaFiles.length === 1 ? "Media File" : "Media Files"}
    </Button>
  );
};

export default MediaFilesButton;
