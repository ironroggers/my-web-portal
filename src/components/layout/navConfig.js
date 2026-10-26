import { matchPath } from "react-router-dom";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import GpsFixedOutlinedIcon from "@mui/icons-material/GpsFixedOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import { LOCATIONS_ENABLED, SURVEYS_ENABLED } from "../../config/featureFlags";

/**
 * Sidebar structure. `match` lists every route pattern that should highlight
 * the item, so detail pages keep their parent module selected.
 * `permission` is an action from the execution service's matrix (usePermissions); without it
 * the item is disabled. `badge` names a count from useWorkBadges shown next to the label.
 * `hidden` leaves the item out (a module switched off in featureFlags).
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
      {
        to: "/execution-dashboard",
        label: "Execution Dashboard",
        Icon: InsightsOutlinedIcon,
        match: ["/execution-dashboard"],
        permission: "viewExecution",
      },
      { to: "/summary", label: "Summary", Icon: TableChartOutlinedIcon, match: ["/summary"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/surveys", label: "Surveys", Icon: AssignmentOutlinedIcon, match: ["/surveys"], hidden: !SURVEYS_ENABLED },
      {
        to: "/map",
        hidden: !LOCATIONS_ENABLED,
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
      // Read only and open to every role, so no permission
      { to: "/master-map", label: "Master Map", Icon: PublicOutlinedIcon, match: ["/master-map"] },
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
        to: "/my-work",
        label: "My work",
        Icon: AssignmentTurnedInOutlinedIcon,
        match: ["/my-work"],
        permission: "viewExecution",
        badge: "needsFix",
        badgeColor: "error",
      },
      {
        to: "/approvals",
        label: "Approvals",
        Icon: FactCheckOutlinedIcon,
        match: ["/approvals", "/approvals/*"],
        permission: "approveExecution",
        badge: "approvals",
        badgeColor: "warning",
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

const APPROVALS = { label: "Approvals", to: "/approvals" };

// The block's page, on the given tab; named when the router state knows the block
const blockCrumb = (params, state, tab) => ({
  label: state?.blockProfileId === params.blockProfileId && state?.blockProfileName ? state.blockProfileName : "Block Details",
  to: `/block-profiles/${params.blockProfileId}?tab=${tab}`,
});

/**
 * Breadcrumb trail per route. Order matters: the first matching pattern wins.
 * Crumbs without `to` render as plain text. A trail can be a function of the route
 * params and the router state.
 */
const ROUTE_TRAILS = [
  { path: "/", trail: [{ label: "Overview" }, { label: "Dashboard" }] },
  { path: "/dashboard", trail: [{ label: "Overview" }, { label: "Dashboard" }] },
  { path: "/execution-dashboard", trail: [{ label: "Overview" }, { label: "Execution Dashboard" }] },
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
  { path: "/master-map", trail: [{ label: "Operations" }, { label: "Master Map" }] },
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
  {
    path: "/block-profiles/:blockProfileId/infra",
    trail: (params, state) => [{ label: "Operations" }, BLOCK_PROFILES, blockCrumb(params, state, "block"), { label: "Block infra" }],
  },
  {
    path: "/block-profiles/:blockProfileId/gps/:lgdCode/infra",
    trail: (params, state) => [{ label: "Operations" }, BLOCK_PROFILES, blockCrumb(params, state, "gps"), { label: "GP infra" }],
  },
  { path: "/my-work", trail: [{ label: "Operations" }, { label: "My work" }] },
  { path: "/approvals", trail: [{ label: "Operations" }, { label: "Approvals" }] },
  {
    path: "/approvals/subsections/:subSectionId",
    trail: (params, state) => [
      { label: "Operations" },
      APPROVALS,
      { label: state?.subSectionId === params.subSectionId && state?.subSectionName ? state.subSectionName : "Subsection" },
    ],
  },
  {
    path: "/approvals/restorations/:sectionId",
    trail: [{ label: "Operations" }, APPROVALS, { label: "Restoration" }],
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
// blockProfileId and they belong to Block Profile; otherwise to Locations. The OFC
// execution pages (blockOnly) exist only for block sections, so they always belong to
// Block Profile; the router state (useExecContext) adds the block, section and
// subsection crumbs.
//   section: add the section crumb; sub: add the subsection crumb; restoration: add Restoration
const BLOCK_SECTION_TRAILS = [
  { path: "/sections/:sectionId/subsections", label: "Subsections" },
  { path: "/subsections/:subSectionId/trenching", label: "Trenching", section: true },
  { path: "/sections/:sectionId/subsections/new", label: "New subsection", section: true, blockOnly: true },
  { path: "/subsections/:subSectionId", label: "Subsection", section: true, blockOnly: true, named: true },
  { path: "/subsections/:subSectionId/start", label: "Start execution", section: true, sub: true, blockOnly: true },
  { path: "/subsections/:subSectionId/end", label: "End execution", section: true, sub: true, blockOnly: true },
  { path: "/sections/:sectionId/restoration", label: "Restoration", section: true, blockOnly: true },
  { path: "/sections/:sectionId/restoration/:subSectionId", label: "Restoration item", section: true, restoration: true, blockOnly: true },
];

const blockSectionTrail = (pathname, state) => {
  for (const entry of BLOCK_SECTION_TRAILS) {
    const match = matchPath({ path: entry.path, end: true }, pathname);
    if (match && (state?.blockProfileId || entry.blockOnly)) return { entry, params: match.params };
  }
  return undefined;
};

export const isNavItemActive = (item, pathname, state) => {
  if (blockSectionTrail(pathname, state)) return Boolean(item.matchFromBlockProfile);
  return item.match.some((pattern) => matchPath({ path: pattern, end: true }, pathname));
};

export const getBreadcrumbTrail = (pathname, state) => {
  const blockTrail = blockSectionTrail(pathname, state);
  if (blockTrail) {
    const { entry, params } = blockTrail;
    const trail = [{ label: "Operations" }, BLOCK_PROFILES];
    if (state?.blockProfileId) {
      trail.push({ label: state.blockProfileName || "Block", to: `/block-profiles/${state.blockProfileId}?tab=sections` });
    }
    const sectionId = params.sectionId || state?.sectionId;
    if (entry.section && sectionId) {
      trail.push({ label: state?.sectionName || "Section", to: `/sections/${sectionId}/subsections`, state });
    }
    if (entry.sub && state?.subSectionId === params.subSectionId) {
      trail.push({ label: state.subSectionName || "Subsection", to: `/subsections/${params.subSectionId}`, state });
    }
    if (entry.restoration) trail.push({ label: "Restoration", to: `/sections/${params.sectionId}/restoration`, state });
    const named = entry.named && state?.subSectionId === params.subSectionId && state?.subSectionName;
    trail.push({ label: named || entry.label });
    return trail;
  }
  for (const { path, trail } of ROUTE_TRAILS) {
    const match = matchPath({ path, end: true }, pathname);
    if (match) return typeof trail === "function" ? trail(match.params, state) : trail;
  }
  return [];
};
