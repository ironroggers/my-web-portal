import { Box, Typography } from "@mui/material";
import { useState } from "react";
import DataTable from "./DataTable";
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

  const processFieldData = (fieldData) => {
    const { mediaFiles, others, ...restFieldData } = fieldData;

    // Process the main field data
    const filteredField = Object.fromEntries(
      Object.entries(restFieldData).filter(
        ([key, value]) => value !== null && value !== undefined && value !== ""
      )
    );

    // If others exists and is an object, flatten and process it
    if (others && typeof others === "object") {
      const flattenedOthers = Object.entries(others)
        .filter(
          ([key, value]) =>
            value !== null && value !== undefined && value !== ""
        )
        .reduce((acc, [key, value]) => {
          // Add prefix "Other: " to make it clear these are from others object
          acc[`Other: ${key}`] = value;
          return acc;
        }, {});

      // Merge the flattened others data with the main field data
      Object.assign(filteredField, flattenedOthers);
    }

    return filteredField;
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
        Fields
      </Typography>
      {fields.map((field, index) => {
        const { mediaFiles } = field;
        const processedField = processFieldData(field);

        return (
          <Box key={index} sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Field {field.sequence}
            </Typography>
            <DataTable
              data={processedField}
              mediaFiles={mediaFiles}
              onMediaFilesClick={() => handleMediaFilesClick(mediaFiles)}
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
