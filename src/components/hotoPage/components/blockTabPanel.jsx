import { Alert, Box, Button } from "@mui/material";
import TabPanel from "./TabPanel";
import { useState } from "react";
import FormDisplay from "./formDisplay";

const BlockTabPanel = ({ blockHotoInfo, tabValue }) => {
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedData, setSelectedData] = useState(null);

  const handleBlockSelect = (item) => {
    setSelectedBlock(item._id);
    setSelectedData(item);
  };

  return (
    <TabPanel value={tabValue} index={0}>
      {blockHotoInfo.data.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "8px", my: 2 }}>
          No Block HOTO information available
        </Alert>
      ) : (
        <>
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
                onClick={() => handleBlockSelect(item)}
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
          <FormDisplay data={selectedData} />
        </>
      )}
    </TabPanel>
  );
};

export default BlockTabPanel;
