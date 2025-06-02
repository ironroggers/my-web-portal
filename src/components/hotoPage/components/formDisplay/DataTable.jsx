import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
} from "@mui/material";
import { formatKey, formatValue } from "./utils";
import MediaFilesButton from "./MediaFilesButton";

const DataTable = ({ data, mediaFiles, onMediaFilesClick }) => {
  const dataWithMediaFiles = {
    ...data,
    ...(mediaFiles?.length > 0 && {
      "Media Files": {
        type: "mediaFiles",
        value: mediaFiles,
      },
    }),
  };

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ backgroundColor: "background.default" }}
    >
      <Table size="small">
        <TableBody>
          {Object.entries(dataWithMediaFiles).map(([key, value]) => (
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
                {value?.type === "mediaFiles" ? (
                  <MediaFilesButton
                    mediaFiles={value.value}
                    onClick={onMediaFilesClick}
                  />
                ) : (
                  formatValue(value)
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTable;
