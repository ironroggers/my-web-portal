import { formatNumber } from "../../utils/formatNumber";

export const SITE_TYPES = {
  BSNL_OWNED: "BSNL owned",
  BSNL_RENTED: "BSNL rented",
  OTHERS: "Others",
};

export const BLOCK_STATUSES = {
  DRAFT: { label: "Draft", tone: "info" },
  ACTIVE: { label: "Active", tone: "success" },
  INACTIVE: { label: "Inactive", tone: "default" },
};

export const blockStatus = (value) => BLOCK_STATUSES[value] || { label: value || "Unknown", tone: "default" };

export const formatLength = (meters) => (meters ? `${formatNumber(Number(meters))} m` : "—");

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

// The block router's own name from its profile, else "Block router" (the server's routerName)
export const routerName = (profile) => String(profile?.blockRouter?.name || "").trim() || "Block router";

export const blockPlace = (profile) => [profile?.district, profile?.state].filter(Boolean).join(", ");

// A block section's review stage (execution-service models/section.model.js)
export const SECTION_STAGES = {
  FIELD: { label: "In field review", short: "Field", tone: "default" },
  ZONAL: { label: "With Zonal Manager", short: "Zonal Manager", tone: "warning" },
  ADMIN: { label: "With Admin", short: "Admin", tone: "info" },
  FROZEN: { label: "Frozen", short: "Frozen", tone: "success" },
};
export const sectionStage = (section) => SECTION_STAGES[section?.review?.stage || section?.stage || "FIELD"] || SECTION_STAGES.FIELD;
export const isSectionFrozen = (section) => (section?.review?.stage || section?.stage) === "FROZEN";
