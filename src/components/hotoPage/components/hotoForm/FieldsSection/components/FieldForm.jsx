import { Box, Typography, Button } from "@mui/material";
import FormField from "./FormField";
import MediaForm from "./MediaForm";

const FieldForm = ({
  field,
  onChange,
  onDelete,
  index,
  scrollDialogContent,
}) => {
  const handleChange = (fieldName) => (event) => {
    onChange(index, {
      ...field,
      [fieldName]: event.target.value,
    });
  };

  const handleConfirmationChange = (event) => {
    onChange(index, {
      ...field,
      confirmation: event.target.checked,
    });
  };

  const handleMediaChange = (mediaIndex, updatedMedia) => {
    const newMediaFiles = [...(field.mediaFiles || [])];
    newMediaFiles[mediaIndex] = updatedMedia;
    onChange(index, {
      ...field,
      mediaFiles: newMediaFiles,
    });
    setTimeout(() => {
      scrollDialogContent();
    }, 100);
  };

  const handleAddMedia = () => {
    onChange(index, {
      ...field,
      mediaFiles: [
        ...(field.mediaFiles || []),
        { source: "web" }, // Default values
      ],
    });
    setTimeout(() => {
      scrollDialogContent();
    }, 100);
  };

  const handleDeleteMedia = (mediaIndex) => {
    const newMediaFiles = (field.mediaFiles || []).filter(
      (_, idx) => idx !== mediaIndex
    );
    onChange(index, {
      ...field,
      mediaFiles: newMediaFiles,
    });
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 2,
        mb: 2,
      }}
    >
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", width: "100%" }}>
        <Button
          variant="outlined"
          color="error"
          onClick={() => onDelete(index)}
          sx={{
            outline: "none",
            "&:hover": {
              backgroundColor: "error.main",
              color: "white",
            },
            "&:focus": {
              outline: "none",
            },
          }}
        >
          Delete Field
        </Button>
        <FormField
          label="Key"
          value={field.key || ""}
          onChange={handleChange("key")}
        />
        <FormField
          label="Value"
          value={field.value || ""}
          onChange={handleChange("value")}
        />
        <FormField
          label="Status"
          value={field.status || ""}
          onChange={handleChange("status")}
        />
        <FormField
          label="Remarks"
          value={field.remarks || ""}
          onChange={handleChange("remarks")}
          multiline
          rows={2}
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Typography variant="subtitle2">Media Files</Typography>
        </Box>
        {(field.mediaFiles || []).map((media, mediaIndex) => (
          <MediaForm
            key={mediaIndex}
            media={media}
            index={mediaIndex}
            onChange={handleMediaChange}
            onDelete={handleDeleteMedia}
          />
        ))}

        <Button
          variant="outlined"
          color="primary"
          onClick={handleAddMedia}
          sx={{
            outline: "none",
            "&:hover": {
              backgroundColor: "primary.main",
              color: "white",
            },
            "&:focus": {
              outline: "none",
            },
          }}
        >
          Add Media
        </Button>
      </Box>
    </Box>
  );
};

export default FieldForm;
