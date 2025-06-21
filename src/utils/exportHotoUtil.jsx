import * as XLSX from "xlsx";

const exportBlockExcel = (hotos) => {
  if (!Array.isArray(hotos) || hotos.length === 0) {
    console.warn("No block HOTO data found to export");
    return;
  }

  const rows = [];

  hotos.forEach((hoto, idx) => {
    const {
      fields: fieldArray = [],
      contactPerson = {},
      __v,
      id,
      _id,
      fields,
      contactPerson: cp,
      ...rootRest
    } = hoto;

    Object.entries(rootRest).forEach(([key, value]) => {
      if (key === "locationId") return;
      rows.push({
        Field: key,
        Value: value ?? "",
        "Confirmation Status": "",
        Remarks: "",
      });
    });

    Object.entries(contactPerson).forEach(([key, value]) => {
      rows.push({
        Field: `contactPerson.${key}`,
        Value: value ?? "",
        "Confirmation Status": "",
        Remarks: "",
      });
    });

    fieldArray.forEach((item) => {
      rows.push({
        Field: item.key,
        Value: item.value ?? "",
        "Confirmation Status": String(item.confirmation ?? ""),
        Remarks: item.remarks ?? "",
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

  XLSX.writeFile(workbook, "Block_Hoto.xlsx");
};

const exportGPExcel = (hotos) => {
  console.log(hotos);
};
const exportOFCExcel = (hotos) => {
  console.log(hotos);
};

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
