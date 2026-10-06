// Survey statuses and types as the portal labels them (Surveys page, map sidebar, location details).
// The survey service stores 1 for active surveys and 0 for deleted ones.
export const SURVEY_STATUSES = {
  0: { label: "Deleted", tone: "default" },
  1: { label: "Active", tone: "info" },
  2: { label: "In Progress", tone: "warning" },
  3: { label: "Completed", tone: "success" },
};

export const getSurveyStatus = (status) => SURVEY_STATUSES[status] ?? { label: "Unknown", tone: "default" };

export const SURVEY_TYPE_LABELS = { block: "Block", gp: "GP", ofc: "OFC" };

export const getSurveyTypeLabel = (type) => SURVEY_TYPE_LABELS[String(type || "").toLowerCase()] || type || "Unknown";
