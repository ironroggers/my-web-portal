import { Box, Typography } from "@mui/material";
import { useState } from "react";
import DataTable from "./DataTable";
import MediaFilesButton from "./MediaFilesButton";
import MediaFilesSidePanel from "./MediaFilesSidePanel";

const FieldsSection = ({ fields }) => {
  const [selectedMediaFiles, setSelectedMediaFiles] = useState(null);

  if (!fields || fields.length === 0) return null;

  const handleMediaFilesClick = (mediaFiles) => {
    setSelectedMediaFiles(mediaFiles);
  };

  const handleCloseSidePanel = () => {
    setSelectedMediaFiles(null);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
        Fields
      </Typography>
      {fields.map((field, index) => {
        const { mediaFiles, ...fieldData } = field;
        const filteredField = Object.fromEntries(
          Object.entries(fieldData).filter(
            ([key, value]) =>
              value !== null && value !== undefined && value !== ""
          )
        );

        return (
          <Box key={index} sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Field {field.sequence}
            </Typography>
            <DataTable data={filteredField} />
            <MediaFilesButton
              mediaFiles={mediaFiles}
              onClick={() => handleMediaFilesClick(mediaFiles)}
            />
          </Box>
        );
      })}
      <MediaFilesSidePanel
        open={Boolean(selectedMediaFiles)}
        onClose={handleCloseSidePanel}
        mediaFiles={selectedMediaFiles}
      />
    </Box>
  );
};

export default FieldsSection;
