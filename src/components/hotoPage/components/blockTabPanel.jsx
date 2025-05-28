import { Alert, Box, Button } from "@mui/material";
import TabPanel from "./TabPanel";
import { useState } from "react";

const BlockTabPanel = ({ blockHotoInfo, tabValue }) => {
  const [selectedBlock, setSelectedBlock] = useState(null);

  return (
    <TabPanel value={tabValue} index={0}>
      {blockHotoInfo.data.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "8px" }}>
          No Block HOTO information available
        </Alert>
      ) : (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            width: "100%",
            py: 2,
          }}
        >
          {blockHotoInfo.data.map((item) => (
            <Button
              key={item._id}
              variant={selectedBlock === item._id ? "contained" : "outlined"}
              color="primary"
              onClick={() => setSelectedBlock(item.id)}
              disableElevation
              sx={{
                outline: "none",
                borderRadius: "5px",
                "&:hover": {
                  backgroundColor: "primary.main",
                  color: "white",
                },
                "&:focus": {
                  outline: "none",
                  backgroundColor: "primary.main",
                  color: "white",
                },
              }}
            >
              {item.Block_Name}
            </Button>
          ))}
        </Box>
      )}
    </TabPanel>
  );
};

export default BlockTabPanel;
