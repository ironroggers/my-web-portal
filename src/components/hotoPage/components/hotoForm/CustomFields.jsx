import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";

const CustomFields = ({
  fields,
  newField,
  editingIndex,
  onFieldChange,
  onNewFieldChange,
  onAddField,
  onRemoveField,
  onEditField,
  onSaveField,
}) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>
        Additional Information
      </Typography>

      {/* Existing custom fields */}
      {fields.map((field, index) => (
        <Box key={index} sx={{ mb: 2, display: "flex", gap: 2 }}>
          <TextField
            size="small"
            value={field.key}
            onChange={(e) => onFieldChange(index, "key", e.target.value)}
            InputProps={{
              readOnly: editingIndex !== index,
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            value={field.value}
            onChange={(e) => onFieldChange(index, "value", e.target.value)}
            InputProps={{
              readOnly: editingIndex !== index,
            }}
            sx={{ flex: 1 }}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            {editingIndex === index ? (
              <IconButton
                color="primary"
                onClick={() => onSaveField(index)}
                size="small"
              >
                <SaveIcon />
              </IconButton>
            ) : (
              <IconButton
                color="primary"
                onClick={() => onEditField(index)}
                size="small"
              >
                <EditIcon />
              </IconButton>
            )}
            <IconButton
              color="error"
              onClick={() => onRemoveField(index)}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      ))}

      {/* Add new custom field */}
      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
        <TextField
          size="small"
          label="Field Name"
          value={newField.key}
          onChange={(e) => onNewFieldChange("key", e.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          label="Value"
          value={newField.value}
          onChange={(e) => onNewFieldChange("value", e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button
          variant="contained"
          onClick={onAddField}
          disabled={!newField.key || !newField.value}
        >
          Add Field
        </Button>
      </Box>
    </Paper>
  );
};

export default CustomFields; 