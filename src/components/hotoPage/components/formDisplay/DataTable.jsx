import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
} from "@mui/material";
import { formatKey, formatValue } from "./utils";

const DataTable = ({ data }) => {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ backgroundColor: "background.default" }}
    >
      <Table size="small">
        <TableBody>
          {Object.entries(data).map(([key, value]) => (
            <TableRow
              key={key}
              sx={{
                "&:nth-of-type(odd)": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              <TableCell
                component="th"
                sx={{
                  width: "30%",
                  fontWeight: 600,
                  color: "text.primary",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  textTransform: "capitalize",
                }}
              >
                {formatKey(key)}
              </TableCell>
              <TableCell
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {formatValue(value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTable; 