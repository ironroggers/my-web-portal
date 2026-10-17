import { formatNumber } from "../../utils/formatNumber";

export const SITE_TYPES = {
  BSNL_OWNED: "BSNL owned",
  BSNL_RENTED: "BSNL rented",
  OTHERS: "Others",
};

// PENDING_APPROVAL joins these once the approval workflow lands
export const BLOCK_STATUSES = {
  DRAFT: { label: "Draft", tone: "info" },
  ACTIVE: { label: "Active", tone: "success" },
  INACTIVE: { label: "Inactive", tone: "default" },
};

export const blockStatus = (value) => BLOCK_STATUSES[value] || { label: value || "Unknown", tone: "default" };

export const formatLength = (meters) => (meters ? `${formatNumber(Number(meters))} m` : "—");

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export const blockPlace = (profile) => [profile?.district, profile?.state].filter(Boolean).join(", ");
