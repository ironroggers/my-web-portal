import * as XLSX from "xlsx";

const flattenObject = (obj, prefix = "") => {
  const flattened = {};

  for (const key in obj) {
    // Skip metadata and special fields
    if (
      key === "_id" ||
      key === "fieldType" ||
      key === "status" ||
      key === "dropdownOptions" ||
      key === "createdAt" ||
      key === "updatedAt" ||
      key === "createdOn" ||
      key === "updatedOn" ||
      key === "__v" ||
      key.startsWith("__")
    )
      continue;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      // Special handling for locationId
      if (key === "locationId") {
        // Only include district, block and route
        if (obj[key].district)
          flattened[`${prefix}${key}.district`] = obj[key].district;
        if (obj[key].block) flattened[`${prefix}${key}.block`] = obj[key].block;
        if (obj[key].route) {
          flattened[`${prefix}${key}.route`] = obj[key].route
            .map(
              (point) =>
                `${point.place} (${point.latitude}, ${point.longitude})`
            )
            .join("; ");
        }
      } else {
        const nested = flattenObject(obj[key], `${prefix}${key}.`);
        Object.assign(flattened, nested);
      }
    } else if (Array.isArray(obj[key])) {
      // Handle arrays by joining their values
      if (key === "mediaFiles") {
        flattened[`${prefix}${key}`] = obj[key]
          .map((file) => file.url)
          .join(", ");
      } else if (key === "route") {
        flattened[`${prefix}${key}`] = obj[key]
          .map(
            (point) => `${point.place} (${point.latitude}, ${point.longitude})`
          )
          .join("; ");
      } else if (key === "fields") {
        // Skip fields array as we'll handle it separately
        continue;
      } else {
        flattened[`${prefix}${key}`] = JSON.stringify(obj[key]);
      }
    } else {
      flattened[`${prefix}${key}`] = obj[key];
    }
  }

  return flattened;
};

const physicalSurveyExport = (jsonData, selectedLocations) => {
  const selectedIds = Array.isArray(selectedLocations)
    ? selectedLocations.map((item) => item?.location?._id).filter(Boolean)
    : [];

  const dataToExport = selectedIds.length
    ? jsonData.filter((doc) => selectedIds.includes(doc?.locationId?._id))
    : jsonData;

  const workbook = XLSX.utils.book_new();

  dataToExport.forEach((document, index) => {
    // Create a copy of the document without the fields array
    const documentWithoutFields = { ...document };
    delete documentWithoutFields.fields;

    // Flatten the document (excluding fields)
    const flattenedDoc = flattenObject(documentWithoutFields);

    // Convert flattened document to rows
    const docRows = Object.entries(flattenedDoc).map(([field, value]) => ({
      Field: field,
      Value: value?.toString() || "",
    }));

    // Add a separator row
    docRows.push({
      Field: "-------------------",
      Value: "-------------------",
    });

    // Add fields data
    document.fields.forEach((field) => {
      const flattenedField = flattenObject(field);
      Object.entries(flattenedField).forEach(([fieldKey, fieldValue]) => {
        docRows.push({
          Field: `${field.sequence}.${field.key}.${fieldKey}`,
          Value: fieldValue?.toString() || "",
        });
      });
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(docRows);

    // Set column widths
    const maxWidth = Math.max(
      ...docRows.map((row) =>
        Math.max(
          row.Field?.toString().length || 0,
          row.Value?.toString().length || 0
        )
      )
    );

    worksheet["!cols"] = [
      { wch: Math.min(maxWidth, 100) }, // Field column
      { wch: Math.min(maxWidth, 100) }, // Value column
    ];

    // Add the worksheet to the workbook
    const sheetName = document.name
      ? `S${index + 1}-${document.name}`.substring(0, 30)
      : `Survey-${index + 1}`;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // Generate Excel file
  XLSX.writeFile(workbook, "physical_survey_export.xlsx");
};

export default physicalSurveyExport;
