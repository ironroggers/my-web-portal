import React from "react";
import { TableRow, TableCell } from "@mui/material";

const DataRow = ({ rowNumber, rowData, onEdit }) => (
  <TableRow hover onClick={onEdit} sx={{ cursor: "pointer" }}>
    <TableCell>{rowNumber || "-"}</TableCell>
    {Object.values(rowData).map((value, idx) => (
      <TableCell key={idx}>{value || "-"}</TableCell>
    ))}
  </TableRow>
);

export default DataRow;

