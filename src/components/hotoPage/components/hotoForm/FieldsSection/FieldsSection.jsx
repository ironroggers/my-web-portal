import { Box, Typography, Button } from "@mui/material";
import { FieldForm } from "./components";

const FieldsSection = ({ fields, setFields, scrollDialogContent }) => {
  const handleAddField = () => {
    setFields([
      ...fields,
      {
        sequence: fields.length + 1,
        mediaFiles: [],
      },
    ]);

    setTimeout(() => {
      scrollDialogContent();
    }, 100);
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

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Fields</Typography>
      </Box>

      {fields.map((field, index) => (
        <FieldForm
          key={index}
          field={field}
          index={index}
          onChange={handleFieldChange}
          onDelete={handleDeleteField}
          scrollDialogContent={scrollDialogContent}
        />
      ))}
      <Button
        variant="outlined"
        color="primary"
        onClick={handleAddField}
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
        Add Field
      </Button>
    </Box>
  );
};

export default FieldsSection;
