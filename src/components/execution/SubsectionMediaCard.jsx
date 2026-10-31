import React, { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import SectionCard from "../common/SectionCard";
import { countLabel } from "../../utils/executionFormat";
import ExecMediaViewer from "./ExecMediaViewer";
import { MediaThumb } from "./MediaPicker";
import { eachCapturedMedia } from "./subsectionMedia";

/**
 * Everything captured for the subsection in one place, so a reviewer sees it without opening
 * each step or the map. Unlike the map, this includes files with no usable location.
 */
const SubsectionMediaCard = ({ sub, pitALabel, pitBLabel }) => {
  const [viewing, setViewing] = useState(null);

  const groups = useMemo(() => {
    const byLabel = new Map();
    eachCapturedMedia(sub, pitALabel, pitBLabel, (m, kind, label) => {
      const heading = { ENTRY: "Entries", START: pitALabel, END: pitBLabel }[kind] || label;
      if (!byLabel.has(heading)) byLabel.set(heading, []);
      byLabel.get(heading).push(m);
    });
    return [...byLabel].map(([label, items]) => ({ label, items }));
  }, [sub, pitALabel, pitBLabel]);

  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <SectionCard title="Photos and videos" subtitle={total ? countLabel(total, "file") : undefined}>
      {total === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No photos or video
        </Typography>
      ) : (
        <Stack spacing={2}>
          {groups.map((group) => (
            <Box key={group.label}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
                {group.label} · {group.items.length}
              </Typography>
              <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: "wrap" }}>
                {group.items.map((m, i) => (
                  <MediaThumb key={m._id || m.url || i} media={m} size={56} onClick={() => setViewing(m)} />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
      {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}
    </SectionCard>
  );
};

export default SubsectionMediaCard;
