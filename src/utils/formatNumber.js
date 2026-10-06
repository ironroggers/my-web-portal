const numberFormat = new Intl.NumberFormat("en-IN");

// Thousands-separated display for numbers; anything else is shown as-is.
export const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? numberFormat.format(value) : value;
