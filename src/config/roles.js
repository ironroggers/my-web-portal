// User roles of the auth service (auth-service src/utils/constants.js). Zonal Manager,
// Cluster Head, GIS Head and Field Executive run the block profile approval flow; the
// Field Executive works in the mobile app only.
export const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "ZONAL MANAGER", label: "Zonal Manager" },
  { value: "CLUSTER HEAD", label: "Cluster Head" },
  { value: "GIS HEAD", label: "GIS Head" },
  { value: "FIELD EXECUTIVE", label: "Field Executive" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "SURVEYOR", label: "Surveyor" },
  { value: "VIEWER", label: "Viewer" },
];

export const ROLE_LABELS = {
  ...Object.fromEntries(ROLE_OPTIONS.map((role) => [role.value, role.label])),
  // Accounts not yet moved over by the rename
  "EXECUTION ENGINEER": "Field Executive",
};

export const roleLabel = (role) => ROLE_LABELS[role] || role || "—";

// Roles that can sign in to the web portal
export const WEB_ROLES = ["ADMIN", "VIEWER", "ZONAL MANAGER", "CLUSTER HEAD", "GIS HEAD"];

// The accounts a Zonal Manager may create and edit on the Users page
export const ZONAL_MANAGED_ROLES = ["CLUSTER HEAD", "GIS HEAD", "FIELD EXECUTIVE"];

// The block team: who assigns whom (the execution service checks the same)
export const TEAM_ROLES = ["ZONAL MANAGER", "CLUSTER HEAD", "GIS HEAD", "FIELD EXECUTIVE"];
