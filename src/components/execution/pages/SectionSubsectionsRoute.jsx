import React, { useCallback } from "react";
import { Box } from "@mui/material";
import { useParams } from "react-router-dom";
import sectionsService from "../../../services/sectionsService.jsx";
import SubsectionsPage from "../../SubsectionsPage";
import BlockSubsectionsPage from "./BlockSubsectionsPage";
import { PageState } from "../execUi";
import { useLoader } from "../useLoader";

/**
 * /sections/:sectionId/subsections. Block-profile sections get the execution flow (C6);
 * location sections keep today's page (Q5).
 */
const SectionSubsectionsRoute = () => {
  const { sectionId } = useParams();
  const load = useCallback(() => sectionsService.get(sectionId), [sectionId]);
  const { data: section, error, reload } = useLoader(load);

  if (!section) {
    return (
      <Box>
        <PageState error={error} onRetry={reload} />
      </Box>
    );
  }
  return section.blockProfile ? <BlockSubsectionsPage key={sectionId} section={section} /> : <SubsectionsPage />;
};

export default SectionSubsectionsRoute;
