import { jsPDF } from "jspdf";

// A4 landscape PDF of a diagram SVG. The SVG carries its own title and legend;
// it is drawn onto a canvas at print resolution and placed on the page.

const svgToJpeg = (svg, width, height, scale) =>
  new Promise((resolve, reject) => {
    const clone = svg.cloneNode(true);
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't render the diagram"));
    };
    image.src = url;
  });

/** Save `svg` as an A4 landscape PDF named `fileName` */
export const exportA4Pdf = async (svg, fileName, footer) => {
  const [, , width, height] = (svg.getAttribute("viewBox") || "0 0 1188 840").split(/\s+/).map(Number);
  const jpeg = await svgToJpeg(svg, width, height, 3);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297;
  const pageH = 210;
  const margin = 6;
  const boxW = pageW - margin * 2;
  const boxH = pageH - margin * 2 - 5;
  const k = Math.min(boxW / width, boxH / height);
  const w = width * k;
  const h = height * k;
  pdf.addImage(jpeg, "JPEG", (pageW - w) / 2, margin, w, h);
  pdf.setFontSize(7);
  pdf.setTextColor(100);
  pdf.text(footer || "", margin, pageH - margin);
  pdf.save(fileName);
};
