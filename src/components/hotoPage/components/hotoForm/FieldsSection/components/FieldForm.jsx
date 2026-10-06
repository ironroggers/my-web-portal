import { useState } from "react";
import { Badge, Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import FormField from "./FormField";
import MediaForm from "./MediaForm";
import { FIELD_ROW_COLUMNS } from "../fieldRowLayout";

// Mobile keyboards for the template field types; values are still stored as text
const INPUT_MODES = { number: "decimal", phone: "tel", email: "email" };

/**
 * One HOTO field as a row: key, value and remarks, plus its media files in a
 * panel that opens below. On phones the row stacks with visible labels.
 */
const FieldForm = ({
  field,
  onChange,
  onDelete,
  index,
  showLabels = false,
}) => {
  const mediaFiles = field.mediaFiles || [];
  // Media-type fields and fields that already have files start with the panel open
  const [mediaOpen, setMediaOpen] = useState(mediaFiles.length > 0 || field.fieldType === "media");
  const number = field.sequence ?? index + 1;

  const handleChange = (fieldName) => (event) => {
    onChange(index, {
      ...field,
      [fieldName]: event.target.value,
    });
  };

  const handleMediaChange = (mediaIndex, updatedMedia) => {
    const newMediaFiles = [...mediaFiles];
    newMediaFiles[mediaIndex] = updatedMedia;
    onChange(index, {
      ...field,
      mediaFiles: newMediaFiles,
    });
  };

  const handleAddMedia = () => {
    setMediaOpen(true);
    onChange(index, {
      ...field,
      mediaFiles: [...mediaFiles, { source: "web" }],
    });
  };

  const handleDeleteMedia = (mediaIndex) => {
    onChange(index, {
      ...field,
      mediaFiles: mediaFiles.filter((_, idx) => idx !== mediaIndex),
    });
  };

  const inputProps = (name) => ({
    placeholder: showLabels ? undefined : name,
    label: showLabels ? name : undefined,
    slotProps: {
      htmlInput: {
        "aria-label": `Field ${number} ${name.toLowerCase()}`,
        ...(name === "Value" && INPUT_MODES[field.fieldType] && { inputMode: INPUT_MODES[field.fieldType] }),
      },
    },
  });

  return (
    <Box sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr) auto", sm: FIELD_ROW_COLUMNS },
          gridTemplateAreas: {
            xs: '"number actions" "key key" "value value" "remarks remarks"',
            sm: '"number key value remarks actions"',
          },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            gridArea: "number",
            pt: { xs: 0.75, sm: 1 },
            color: "text.secondary",
            fontWeight: { xs: 600, sm: 400 },
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Box component="span" sx={{ display: { sm: "none" } }}>
            Field{" "}
          </Box>
          {number}
        </Typography>
        <FormField value={field.key || ""} onChange={handleChange("key")} sx={{ gridArea: "key" }} {...inputProps("Key")} />
        <FormField
          value={field.value || ""}
          onChange={handleChange("value")}
          sx={{ gridArea: "value" }}
          {...inputProps("Value")}
        />
        <FormField
          value={field.remarks || ""}
          onChange={handleChange("remarks")}
          multiline
          minRows={1}
          maxRows={4}
          sx={{ gridArea: "remarks" }}
          {...inputProps("Remarks")}
        />
        <Box sx={{ gridArea: "actions", display: "flex", justifyContent: "flex-end", gap: 0.25 }}>
          <Tooltip title={mediaOpen ? "Hide media" : "Media files"}>
            <IconButton
              size="small"
              onClick={() => setMediaOpen((open) => !open)}
              aria-expanded={mediaOpen}
              aria-label={`Media for field ${number} (${mediaFiles.length})`}
              sx={(theme) => ({
                mt: 0.25,
                color: mediaOpen ? "primary.main" : "text.secondary",
                bgcolor: mediaOpen ? alpha(theme.palette.primary.main, 0.08) : "transparent",
              })}
            >
              <Badge badgeContent={mediaFiles.length} color="primary" max={99}>
                <AttachFileIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove field">
            <IconButton
              size="small"
              onClick={() => onDelete(index)}
              aria-label={`Remove field ${number}`}
              sx={{ mt: 0.25, color: "text.secondary", "&:hover": { color: "error.main" } }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {mediaOpen && (
        <Box
          sx={{
            mt: 1.25,
            ml: { sm: "44px" },
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: "background.default",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 1,
          }}
        >
          {mediaFiles.length === 0 && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              No media for this field yet.
            </Typography>
          )}
          {mediaFiles.map((media, mediaIndex) => (
            <MediaForm
              key={mediaIndex}
              media={media}
              index={mediaIndex}
              onChange={handleMediaChange}
              onDelete={handleDeleteMedia}
            />
          ))}
          <Box>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddMedia}>
              Add media
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FieldForm;
