// Location workflow statuses (set from the mobile app and the map page's Edit location dialog)
export const LOCATION_STATUSES = {
  1: { label: "Released", tone: "default" },
  2: { label: "Assigned", tone: "info" },
  3: { label: "Active", tone: "warning" },
  4: { label: "Submitted", tone: "info" },
  5: { label: "Accepted", tone: "success" },
  6: { label: "Reverted", tone: "error" },
};

export const getLocationStatus = (status) => LOCATION_STATUSES[status] ?? { label: "Unknown status", tone: "default" };
