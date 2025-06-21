import * as XLSX from "xlsx";

const exportBlockExcel = (hotos) => {
  if (!Array.isArray(hotos) || hotos.length === 0) {
    console.warn("No block HOTO data found to export");
    return;
  }

  const rows = [];

  hotos.forEach((hoto, idx) => {
    const { map, blockName, districtName } = flattenHoto(hoto);

    if (idx === 0) {
      exportBlockExcel.fileSuffix = `${blockName}_${districtName}`.replace(
        /\s+/g,
        "_"
      );
    }

    map.forEach((data, field) => {
      rows.push({
        Field: field,
        Value: data.value ?? "",
        "Confirmation Status": data.confirmation ?? "",
        Remarks: data.remarks ?? "",
      });
    });

    if (idx < hotos.length - 1) {
      rows.push({
        Field: "",
        Value: "",
        "Confirmation Status": "",
        Remarks: "",
      });
    }
  });

  const header = ["Field", "Value", "Confirmation Status", "Remarks"];
  const worksheet = XLSX.utils.json_to_sheet(rows, { header });

  XLSX.utils.sheet_add_aoa(worksheet, [header], { origin: "A1" });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Block_Hoto");

  const suffix = exportBlockExcel.fileSuffix || Date.now();
  XLSX.writeFile(workbook, `blockHoto_${suffix}.xlsx`);
};

const matrixExport = (
  hotos,
  { nameKey, groupLabel, filePrefix, fallbackPrefix, sheetName }
) => {
  if (!Array.isArray(hotos) || hotos.length === 0) return;

  const entityCount = hotos.length;
  const fieldSet = new Set();

  const entityMaps = hotos.map((hoto, idx) => {
    const { map, blockName, districtName } = flattenHoto(hoto);

    if (!matrixExport.suffix) {
      matrixExport.suffix = `${blockName}_${districtName}`.replace(/\s+/g, "_");
    }

    map.forEach((_data, key) => fieldSet.add(key));

    map.entityName = hoto[nameKey] || `${fallbackPrefix}${idx + 1}`;
    return map;
  });

  const allFields = Array.from(fieldSet);
  const colCount = 1 + entityCount * 3;

  const headerRow1 = new Array(colCount).fill("");
  headerRow1[0] = groupLabel;

  const merges = [];
  entityMaps.forEach((map, idx) => {
    const startCol = 1 + idx * 3;
    headerRow1[startCol] = map.entityName;
    merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 2 } });
  });

  const headerRow2 = new Array(colCount).fill("");
  headerRow2[0] = "Field";
  entityMaps.forEach((_, idx) => {
    const startCol = 1 + idx * 3;
    headerRow2[startCol] = "Value";
    headerRow2[startCol + 1] = "Confirmation Status";
    headerRow2[startCol + 2] = "Remarks";
  });

  const aoa = [headerRow1, headerRow2];

  allFields.forEach((field) => {
    const row = new Array(colCount).fill("");
    row[0] = field;

    entityMaps.forEach((map, idx) => {
      const startCol = 1 + idx * 3;
      const data = map.get(field) || {};
      row[startCol] = data.value ?? "";
      row[startCol + 1] = data.confirmation ?? "";
      row[startCol + 2] = data.remarks ?? "";
    });

    aoa.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = merges;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, `${filePrefix}_${matrixExport.suffix || Date.now()}.xlsx`);
};

const exportGPExcel = (hotos) =>
  matrixExport(hotos, {
    nameKey: "gpName",
    groupLabel: "GP Names",
    filePrefix: "gpHoto",
    fallbackPrefix: "GP",
    sheetName: "GP_Hoto",
  });

const exportOFCExcel = (hotos) =>
  matrixExport(hotos, {
    nameKey: "ofcName",
    groupLabel: "OFC Names",
    filePrefix: "ofcHoto",
    fallbackPrefix: "OFC",
    sheetName: "OFC_Hoto",
  });

export const exportHotoUtil = (hotos, key) => {
  switch (key) {
    case "block":
      exportBlockExcel(hotos.filter((hoto) => hoto.hotoType === "block"));
      break;
    case "gp":
      exportGPExcel(hotos.filter((hoto) => hoto.hotoType === "gp"));
      break;
    case "ofc":
      exportOFCExcel(hotos.filter((hoto) => hoto.hotoType === "ofc"));
      break;
    default:
      console.error(`Unknown export key: ${key}`);
  }
};

const flattenHoto = (hoto) => {
  const {
    fields: fieldArray = [],
    contactPerson = {},
    blockName = "block",
    districtName = "district",
    __v,
    id,
    _id,
    locationId,
    ...rootRest
  } = hoto;

  const map = new Map();

  Object.entries(rootRest).forEach(([key, value]) => {
    if (key === "locationId") return;
    map.set(key, { value });
  });

  Object.entries(contactPerson).forEach(([k, v]) => {
    map.set(`contactPerson.${k}`, { value: v });
  });

  fieldArray.forEach((item) => {
    map.set(item.key, {
      value: item.value ?? "",
      confirmation: String(item.confirmation ?? ""),
      remarks: item.remarks ?? "",
    });
  });

  return {
    map,
    blockName,
    districtName,
  };
};
