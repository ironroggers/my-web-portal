import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ConstructionIcon from "@mui/icons-material/Construction";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

export const STATUS_ICONS = {
  NOT_STARTED: RadioButtonUncheckedIcon,
  IN_PROGRESS: ConstructionIcon,
  PENDING_APPROVAL: HourglassTopIcon,
  APPROVED: CheckCircleIcon,
  REJECTED: ErrorIcon,
};

export const RESTORATION_ICONS = {
  LOCKED: LockOutlinedIcon,
  READY: PhotoCameraOutlinedIcon,
  PENDING_APPROVAL: HourglassTopIcon,
  APPROVED: VerifiedOutlinedIcon,
  REJECTED: ErrorIcon,
};

// Status order of the split bar
export const BAR_ORDER = ["APPROVED", "PENDING_APPROVAL", "IN_PROGRESS", "REJECTED", "NOT_STARTED"];

// Config tone → theme colour for icons and text
export const toneSx = (tone) =>
  ({ neutral: "text.secondary", info: "info.main", warning: "warning.dark", success: "success.dark", error: "error.main" })[tone] || "text.secondary";

// "Restoration opens when all 4 subsections have ended · 2/4 ended"
export const restorationLine = (r, remark) => {
  if (!r) return "";
  return {
    LOCKED: r.total ? `Restoration opens when all ${r.total} subsections have ended · ${r.ended}/${r.total} ended` : "Restoration opens once subsections are added and ended",
    READY: "All subsections ended · capture the restoration",
    PENDING_APPROVAL: "Restoration sent · waiting for admin approval",
    APPROVED: "Section restored and closed",
    REJECTED: remark ? `Restoration needs fix: ${remark}` : "Restoration needs fix",
  }[r.status];
};

export const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/(^|[\s(-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

// Anything that puts work in the Approvals inbox
export const REVIEW_ACTIONS = ["reviewSubsection", "reviewSection", "approveRestoration"];

// The two subsection reviewers (execution-service services/review.service.js)
export const REVIEW_SLOTS = [
  { key: "clusterHead", label: "Cluster Head", role: "CLUSTER HEAD" },
  { key: "gisHead", label: "GIS Head", role: "GIS HEAD" },
];
export const slotForRole = (role) => REVIEW_SLOTS.find((s) => s.role === role)?.key;
