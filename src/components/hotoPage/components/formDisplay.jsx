import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  Box,
} from "@mui/material";

const FormDisplay = ({ data }) => {
  // Filter out internal fields and empty values
  const filteredData = Object.entries(data || {}).filter(([key, value]) => {
    const internalFields = ['_id', 'createdAt', 'updatedAt', '__v', 'createdBy', 'location', 'blockHoto', 'status'];
    return !internalFields.includes(key) && value !== null && value !== undefined && value !== '';
  });

  // Function to format the key for display
  const formatKey = (key) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Function to format the value for display
  const formatValue = (value) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value.toString();
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Please select an item to view details
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ mt: 3, backgroundColor: 'background.default' }}>
      <TableContainer>
        <Table size="small">
          <TableBody>
            {filteredData.map(([key, value]) => (
              <TableRow
                key={key}
                sx={{
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <TableCell
                  component="th"
                  sx={{
                    width: '30%',
                    fontWeight: 600,
                    color: 'text.primary',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {formatKey(key)}
                </TableCell>
                <TableCell
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {formatValue(value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default FormDisplay;
