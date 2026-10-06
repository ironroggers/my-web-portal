// Drops media rows that were added but never given a file, so they aren't saved as empty entries
export const withoutEmptyMedia = (fields) =>
  fields.map((field) =>
    field.mediaFiles
      ? { ...field, mediaFiles: field.mediaFiles.filter((media) => media.file || media.url) }
      : field
  );

export const validateLocation = (location) => {
  const errors = {};
  if (!location.hotoType) errors.hotoType = "Choose a HOTO type";
  return errors;
};
