import * as XLSX from "xlsx";

export const convertToExcelAndDownload = (jsonData) => {
  try {
    // Normalize jsonData: convert single object to array of one object
    const normalizedData = Array.isArray(jsonData) ? jsonData : [jsonData];

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Convert JSON data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(normalizedData);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    // Create Blob from the buffer
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `export_${new Date().toISOString().split("T")[0]}.xlsx`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error converting to Excel:", error);
    throw error;
  }
};
