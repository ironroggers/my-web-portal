import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import { sidebarColors } from "../../theme/theme";
import BrandMark from "../layout/BrandMark";

const HIGHLIGHTS = [
  { Icon: AssignmentOutlinedIcon, text: "Survey and location management" },
  { Icon: InsightsOutlinedIcon, text: "Project summary and progress analytics" },
  { Icon: GroupsOutlinedIcon, text: "Attendance and FRT team tracking" },
];

/**
 * Full-screen split layout for sign-in screens: brand panel on the left
 * (hidden on small screens) and the form on the right.
 */
const AuthLayout = ({ children, formMaxWidth = 400 }) => (
  <Box sx={{ minHeight: "100vh", display: "flex", bgcolor: "background.paper" }}>
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
        flex: "0 0 42%",
        maxWidth: 560,
        p: 6,
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        bgcolor: sidebarColors.background,
        backgroundImage: `radial-gradient(circle at 85% 10%, rgba(59,130,246,0.28) 0%, transparent 45%),
          radial-gradient(circle at 10% 95%, rgba(20,184,166,0.16) 0%, transparent 40%)`,
      }}
    >
      <BrandMark size={36} />

      <Box>
        <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.02em", mb: 2 }}>
          Network rollout and field operations, in one workspace.
        </Typography>
        <Typography sx={{ color: sidebarColors.text, mb: 4, maxWidth: 420 }}>
          Monitor surveys, locations, field teams and project progress from a single portal.
        </Typography>
        <Stack spacing={2}>
          {HIGHLIGHTS.map((highlight) => (
            <Stack key={highlight.text} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "rgba(255,255,255,0.06)",
                  border: `1px solid ${sidebarColors.border}`,
                  color: sidebarColors.accent,
                }}
              >
                <highlight.Icon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ color: sidebarColors.text }}>{highlight.text}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Typography variant="caption" sx={{ color: sidebarColors.textMuted }}>
        © {new Date().getFullYear()} Project Portal. All rights reserved.
      </Typography>
    </Box>

    <Box
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2.5, sm: 6 },
        py: 6,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: formMaxWidth }}>
        <Box sx={{ display: { xs: "block", md: "none" }, mb: 4 }}>
          <BrandMark tone="light" />
        </Box>
        {children}
      </Box>
    </Box>
  </Box>
);

export default AuthLayout;
