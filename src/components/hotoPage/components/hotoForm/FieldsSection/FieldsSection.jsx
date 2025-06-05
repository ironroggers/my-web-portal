import { Box, Typography, Button, Stack, Divider } from "@mui/material";
import { useState } from "react";
import {
  Add as AddIcon,
  Assignment as TemplateIcon,
} from "@mui/icons-material";
import { FieldForm } from "./components";
import TemplateSelector from "../../TemplateSelector";

const FieldsSection = ({
  fields,
  setFields,
  scrollDialogContent,
  location,
  setLocation,
}) => {
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        sequence: fields.length + 1,
        mediaFiles: [],
      },
    ]);

    // setTimeout(() => {
    //   scrollDialogContent();
    // }, 100);
  };

  const handleFieldChange = (index, updatedField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    setFields(newFields);
  };

  const handleDeleteField = (index) => {
    const newFields = fields.filter((_, idx) => idx !== index);
    const updatedFields = newFields.map((field, idx) => ({
      ...field,
      sequence: idx + 1,
    }));
    setFields(updatedFields);
  };

  const handleTemplateSelect = (templateData) => {
    // Update HOTO type if provided and location setter is available
    if (templateData.hotoType && setLocation) {
      setLocation((prev) => ({
        ...prev,
        hotoType: templateData.hotoType,
      }));
    }

    // Set the template fields
    setFields(templateData.fields);

    // Close template selector
    setTemplateSelectorOpen(false);

    // Scroll to show the new fields
    // setTimeout(() => {
    //   scrollDialogContent();
    // }, 100);
  };

  const handleOpenTemplateSelector = () => {
    setTemplateSelectorOpen(true);
  };

  const handleCloseTemplateSelector = () => {
    setTemplateSelectorOpen(false);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h6">Fields</Typography>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<TemplateIcon />}
          onClick={handleOpenTemplateSelector}
          sx={{
            borderRadius: 2,
            px: 2,
            "&:hover": {
              backgroundColor: "secondary.main",
              color: "white",
            },
          }}
        >
          Use Template
        </Button>
      </Box>

      {fields.length === 0 && (
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            bgcolor: "grey.50",
            borderRadius: 2,
            border: "2px dashed",
            borderColor: "grey.300",
            mb: 2,
          }}
        >
          <TemplateIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Fields Added Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start by using a predefined template or add custom fields manually
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<TemplateIcon />}
              onClick={handleOpenTemplateSelector}
            >
              Use Template
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddField}
            >
              Add Custom Field
            </Button>
          </Stack>
        </Box>
      )}

      {fields.map((field, index) => (
        <FieldForm
          key={index}
          field={field}
          index={index}
          onChange={handleFieldChange}
          onDelete={handleDeleteField}
          // scrollDialogContent={scrollDialogContent}
        />
      ))}

      {fields.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddField}
              sx={{
                "&:hover": {
                  backgroundColor: "primary.main",
                  color: "white",
                },
              }}
            >
              Add Field
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<TemplateIcon />}
              onClick={handleOpenTemplateSelector}
              sx={{
                "&:hover": {
                  backgroundColor: "secondary.main",
                  color: "white",
                },
              }}
            >
              Load Template
            </Button>
          </Stack>
        </>
      )}

      {/* Template Selector Modal */}
      <TemplateSelector
        open={templateSelectorOpen}
        onClose={handleCloseTemplateSelector}
        onTemplateSelect={handleTemplateSelect}
        currentHotoType={location?.hotoType || ""}
      />
    </Box>
  );
};

export default FieldsSection;
