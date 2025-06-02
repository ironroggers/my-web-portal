export const formatKey = (key) => {
  // split camel case keys
  return key.split(/(?=[A-Z])/).join(" ");
};

export const formatValue = (value) => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return value?.toString() || "";
};

export const INTERNAL_FIELDS = [
  "_id",
  "createdAt",
  "updatedAt",
  "__v",
  "createdBy",
  "location",
  "blockHoto",
  "status",
]; 