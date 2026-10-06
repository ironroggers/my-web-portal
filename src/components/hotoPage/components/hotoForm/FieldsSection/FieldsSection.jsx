import { Box, Button, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import {
  Add as AddIcon,
  Assignment as TemplateIcon,
} from "@mui/icons-material";
import { FieldForm } from "./components";
import TemplateSelector from "../../TemplateSelector";
import FormSection from "../FormSection";
import { FIELD_ROW_COLUMNS } from "./fieldRowLayout";

const FieldsSection = ({
  fields,
  setFields,
  location,
  setLocation,
}) => {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        sequence: fields.length + 1,
        mediaFiles: [],
      },
    ]);
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

    setFields(templateData.fields);
    setTemplateSelectorOpen(false);
  };

  const mediaCount = fields.reduce((total, field) => total + (field.mediaFiles?.length || 0), 0);

  return (
    <FormSection
      title="Fields"
      description={
        fields.length
          ? `${fields.length} ${fields.length === 1 ? "field" : "fields"}${mediaCount ? ` · ${mediaCount} media` : ""}`
          : "Asset and site details recorded in this handover"
      }
      action={
        fields.length > 0 && (
          <Button size="small" variant="outlined" startIcon={<TemplateIcon />} onClick={() => setTemplateSelectorOpen(true)}>
            Use template
          </Button>
        )
      }
      grid={false}
    >
      {fields.length === 0 ? (
        <Box
          sx={{
            py: 4,
            px: 2,
            textAlign: "center",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: "background.default",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            No fields yet
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, mb: 2 }}>
            Start from a Block, GP or OFC template, or add fields one at a time.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 1.5 }}>
            <Button variant="contained" startIcon={<TemplateIcon />} onClick={() => setTemplateSelectorOpen(true)}>
              Use template
            </Button>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddField}>
              Add field
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5 }}>
          {!isPhone && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: FIELD_ROW_COLUMNS,
                gap: 1.5,
                px: 1.5,
                py: 1,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.default",
                borderRadius: "6px 6px 0 0",
                "& > *": { fontSize: "0.75rem", fontWeight: 600, color: "text.secondary" },
              }}
            >
              <Box component="span">#</Box>
              <Box component="span">Key</Box>
              <Box component="span">Value</Box>
              <Box component="span">Remarks</Box>
              <Box component="span" />
            </Box>
          )}

          {fields.map((field, index) => (
            <FieldForm
              key={index}
              field={field}
              index={index}
              onChange={handleFieldChange}
              onDelete={handleDeleteField}
              showLabels={isPhone}
            />
          ))}

          <Box sx={{ px: 1, py: 0.75 }}>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddField}>
              Add field
            </Button>
          </Box>
        </Box>
      )}

      <TemplateSelector
        open={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onTemplateSelect={handleTemplateSelect}
        currentHotoType={location?.hotoType || ""}
        existingFieldCount={fields.length}
      />
    </FormSection>
  );
};

export default FieldsSection;
