import { matchPath } from "react-router-dom";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import GpsFixedOutlinedIcon from "@mui/icons-material/GpsFixedOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";

/**
 * Sidebar structure. `match` lists every route pattern that should highlight
 * the item, so detail pages keep their parent module selected.
 * `permission` is a block profile action (useBlockPermissions); without it the item is disabled.
 */
export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      {
        to: "/",
        label: "Dashboard",
        Icon: DashboardOutlinedIcon,
        match: ["/", "/dashboard", "/old-dashboard"],
      },
      { to: "/summary", label: "Summary", Icon: TableChartOutlinedIcon, match: ["/summary"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/surveys", label: "Surveys", Icon: AssignmentOutlinedIcon, match: ["/surveys"] },
      {
        to: "/map",
        label: "Locations",
        Icon: MapOutlinedIcon,
        match: [
          "/map",
          "/location/*",
          "/sections/*",
          "/subsections/*",
          "/hoto-details/*",
        ],
      },
      {
        to: "/block-profiles",
        label: "Block Profile",
        Icon: ViewModuleOutlinedIcon,
        match: ["/block-profiles", "/block-profiles/*"],
        permission: "viewBlockProfile",
        // Owns the section pages when they were opened from a block
        matchFromBlockProfile: true,
      },
      {
        to: "/frt-tracking",
        label: "FRT Tracking",
        Icon: GpsFixedOutlinedIcon,
        match: ["/frt-tracking"],
      },
    ],
  },
  {
    label: "Workforce",
    items: [
      {
        to: "/attendance",
        label: "Attendance",
        Icon: EventAvailableOutlinedIcon,
        match: ["/attendance"],
      },
      {
        to: "/users",
        label: "Users",
        Icon: PeopleAltOutlinedIcon,
        match: ["/users"],
        disabledForRoles: ["VIEWER"],
      },
    ],
  },
];

const LOCATIONS = { label: "Locations", to: "/map" };
const BLOCK_PROFILES = { label: "Block Profile", to: "/block-profiles" };

/**
 * Breadcrumb trail per route. Order matters: the first matching pattern wins.
 * Crumbs without `to` render as plain text.
 */
const ROUTE_TRAILS = [
  { path: "/", trail: [{ label: "Overview" }, { label: "Dashboard" }] },
  { path: "/dashboard", trail: [{ label: "Overview" }, { label: "Dashboard" }] },
  { path: "/old-dashboard", trail: [{ label: "Overview" }, { label: "Classic Dashboard" }] },
  { path: "/summary", trail: [{ label: "Overview" }, { label: "Summary" }] },
  { path: "/surveys", trail: [{ label: "Operations" }, { label: "Surveys" }] },
  { path: "/map", trail: [{ label: "Operations" }, { label: "Locations" }] },
  {
    path: "/location/:locationId/sections",
    trail: [{ label: "Operations" }, LOCATIONS, { label: "Sections" }],
  },
  {
    path: "/location/:locationId",
    trail: [{ label: "Operations" }, LOCATIONS, { label: "Location Details" }],
  },
  {
    path: "/sections/:sectionId/subsections",
    trail: [{ label: "Operations" }, LOCATIONS, { label: "Subsections" }],
  },
  {
    path: "/subsections/:subSectionId/trenching",
    trail: [{ label: "Operations" }, LOCATIONS, { label: "Trenching" }],
  },
  {
    path: "/hoto-details/:locationId",
    trail: [{ label: "Operations" }, LOCATIONS, { label: "HOTO Details" }],
  },
  { path: "/block-profiles", trail: [{ label: "Operations" }, { label: "Block Profile" }] },
  {
    path: "/block-profiles/new",
    trail: [{ label: "Operations" }, BLOCK_PROFILES, { label: "New Block Profile" }],
  },
  {
    path: "/block-profiles/:blockProfileId/edit",
    trail: [{ label: "Operations" }, BLOCK_PROFILES, { label: "Edit Block Profile" }],
  },
  {
    path: "/block-profiles/:blockProfileId",
    trail: [{ label: "Operations" }, BLOCK_PROFILES, { label: "Block Details" }],
  },
  { path: "/hoto", trail: [{ label: "Operations" }, { label: "HOTO" }] },
  { path: "/frt-tracking", trail: [{ label: "Operations" }, { label: "FRT Tracking" }] },
  { path: "/attendance", trail: [{ label: "Workforce" }, { label: "Attendance" }] },
  { path: "/users", trail: [{ label: "Workforce" }, { label: "Users" }] },
  { path: "/profile", trail: [{ label: "Account" }, { label: "My Profile" }] },
  { path: "/help", trail: [{ label: "Support" }, { label: "Help Center" }] },
  { path: "/about", trail: [{ label: "Support" }, { label: "About" }] },
];

// Routes rendered full-screen, without the sidebar and top bar.
export const FULL_SCREEN_ROUTES = ["/login", "/register"];

// Section pages are shared. Opened from a block profile, the router state carries
// blockProfileId and they belong to Block Profile; otherwise to Locations.
const BLOCK_SECTION_TRAILS = [
  { path: "/sections/:sectionId/subsections", label: "Subsections" },
  { path: "/subsections/:subSectionId/trenching", label: "Trenching" },
];

const blockSectionTrail = (pathname, state) =>
  state?.blockProfileId ? BLOCK_SECTION_TRAILS.find(({ path }) => matchPath({ path, end: true }, pathname)) : undefined;

export const isNavItemActive = (item, pathname, state) => {
  if (blockSectionTrail(pathname, state)) return Boolean(item.matchFromBlockProfile);
  return item.match.some((pattern) => matchPath({ path: pattern, end: true }, pathname));
};

export const getBreadcrumbTrail = (pathname, state) => {
  const blockTrail = blockSectionTrail(pathname, state);
  if (blockTrail) {
    return [
      { label: "Operations" },
      BLOCK_PROFILES,
      { label: state.blockProfileName || "Block", to: `/block-profiles/${state.blockProfileId}?tab=sections` },
      { label: blockTrail.label },
    ];
  }
  return ROUTE_TRAILS.find(({ path }) => matchPath({ path, end: true }, pathname))?.trail ?? [];
};
