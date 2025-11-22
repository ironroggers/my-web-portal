import React from "react";
import { TableRow, TableCell } from "@mui/material";

const DataRow = ({ rowNumber, rowData, visibleHeaders, columnWidths, onEdit }) => (
  <TableRow hover onClick={onEdit} sx={{ cursor: "pointer" }}>
    <TableCell sx={{ width: 80, minWidth: 80, maxWidth: 80 }}>{rowNumber || "-"}</TableCell>
    {visibleHeaders.map((header) => (
      <TableCell
        key={header}
        sx={{
          width: columnWidths[header] || 200,
          minWidth: columnWidths[header] || 200,
          maxWidth: columnWidths[header] || 200
        }}
      >
        {rowData[header] || "-"}
      </TableCell>
    ))}
  </TableRow>
);

export default DataRow;

