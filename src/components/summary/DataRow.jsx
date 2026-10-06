import React from "react";
import { TableRow, TableCell } from "@mui/material";

export const ROW_NUMBER_WIDTH = 96;

const isEmpty = (value) => value === null || value === undefined || value === "";

const DataRow = ({ rowNumber, rowData, visibleHeaders, columnWidths, onEdit }) => (
  <TableRow
    hover
    tabIndex={0}
    onClick={onEdit}
    onKeyDown={(event) => {
      if (event.key === "Enter") onEdit();
    }}
    sx={{ cursor: "pointer", "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: -2 } }}
  >
    <TableCell sx={{ width: ROW_NUMBER_WIDTH, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
      {rowNumber || "—"}
    </TableCell>
    {visibleHeaders.map((header) => {
      const value = rowData[header];
      const empty = isEmpty(value);
      return (
        <TableCell
          key={header}
          title={empty ? undefined : String(value)}
          sx={{
            width: columnWidths[header] || 200,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontVariantNumeric: typeof value === "number" ? "tabular-nums" : undefined,
            color: empty ? "text.disabled" : undefined,
          }}
        >
          {empty ? "—" : String(value)}
        </TableCell>
      );
    })}
  </TableRow>
);

export default DataRow;
