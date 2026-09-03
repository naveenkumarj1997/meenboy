const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const SHOP = {
  name: "FISHFRIENDLY",
  email: "fishfriendlymeats@gmail.com",
  phone: "+91 9087894319",
  addressLine1: "Balusamy konnar street, Madakkulam",
  addressLine2: "Bypass Road in Kalavasal",
  cityLine: "Madurai, Tamil Nadu - 625003"
};

const { resolvePdfFonts } = require("./pdfFonts");

const generateCategoryOrdersReport = ({ date, groupLabel, rows, stats }) => {
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(__dirname, "../../uploads/reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const slug = String(groupLabel || "Category")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 40);
      const fileName = `CategoryOrders-${date}-${slug}.pdf`;
      const filePath = path.join(reportsDir, fileName);

      const fonts = resolvePdfFonts();
      if (!fonts.regular) {
        return reject(new Error("No Unicode font found for report PDF."));
      }

      const doc = new PDFDocument({ margin: 28, size: "A4", layout: "landscape" });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      doc.registerFont("ReportRegular", fonts.regular);
      doc.registerFont("ReportBold", fonts.bold || fonts.regular);

      const left = 28;
      const right = doc.page.width - 28;
      const contentWidth = right - left;
      const borderColor = "#334155";
      const headerBg = "#0f766e";
      const altRowBg = "#f1f5f9";
      const padX = 3;
      const padY = 3;

      doc
        .font("ReportBold")
        .fontSize(16)
        .fillColor("#0f766e")
        .text(SHOP.name, left, 28, { width: contentWidth });
      doc
        .font("ReportRegular")
        .fontSize(8)
        .fillColor("#475569")
        .text(`${SHOP.addressLine1}, ${SHOP.addressLine2}, ${SHOP.cityLine}`, left, 48);

      doc
        .font("ReportBold")
        .fontSize(13)
        .fillColor("#0f172a")
        .text("Category Order List (Internal)", left, 68);
      doc
        .font("ReportRegular")
        .fontSize(10)
        .fillColor("#334155")
        .text(`Category: ${groupLabel}`, left, 88)
        .text(`Delivery Date: ${date}`)
        .text(`Orders: ${stats?.orderCount || 0} · Line items: ${stats?.itemCount || 0}`)
        .text(`Generated: ${new Date().toLocaleString("en-IN")}`);

      const cols = [
        { key: "sno", label: "#", width: 22 },
        { key: "order", label: "Order", width: 44 },
        { key: "customer", label: "Customer", width: 72 },
        { key: "phone", label: "Phone", width: 62 },
        { key: "address", label: "Address", width: 110 },
        { key: "time", label: "Slot", width: 58 },
        { key: "product", label: "Product", width: 88 },
        { key: "cut", label: "Cut", width: 48 },
        { key: "qty", label: "Qty", width: 40 },
        { key: "notes", label: "Notes", width: 90 },
        { key: "status", label: "Status", width: 52 },
        { key: "partner", label: "Partner", width: 58 },
        { key: "total", label: "Total", width: 44 }
      ];

      let y = 118;

      const drawTableHeader = (yPos) => {
        const headerH = 20;
        doc.rect(left, yPos, contentWidth, headerH).fill(headerBg);
        let x = left;
        doc.font("ReportBold").fontSize(7).fillColor("#ffffff");
        cols.forEach((col) => {
          doc.text(col.label, x + padX, yPos + 6, { width: col.width - padX * 2 });
          x += col.width;
        });
        doc.strokeColor(borderColor).lineWidth(0.6).rect(left, yPos, contentWidth, headerH).stroke();
        let splitX = left;
        for (let i = 0; i < cols.length - 1; i++) {
          splitX += cols[i].width;
          doc.moveTo(splitX, yPos).lineTo(splitX, yPos + headerH).stroke();
        }
        return yPos + headerH;
      };

      y = drawTableHeader(y);

      const ensureSpace = (needed) => {
        if (y + needed > doc.page.height - 36) {
          doc.addPage();
          y = drawTableHeader(28);
        }
      };

      if (!rows.length) {
        ensureSpace(32);
        doc.rect(left, y, contentWidth, 28).strokeColor(borderColor).stroke();
        doc
          .font("ReportRegular")
          .fontSize(10)
          .fillColor("#64748b")
          .text("No orders for this category on the selected date.", left, y + 8, {
            width: contentWidth,
            align: "center"
          });
      } else {
        rows.forEach((row, index) => {
          const values = [
            String(index + 1),
            `#${String(row.orderId).slice(-6).toUpperCase()}`,
            String(row.customerName || "-"),
            String(
              row.alternatePhone
                ? `${row.phone || "-"}\nAlt: ${row.alternatePhone}`
                : row.phone || "-"
            ),
            String(row.address || "-"),
            String(row.deliveryTime || "-"),
            String(row.productName || "-"),
            String(row.cutName || "-"),
            `${row.quantity}${row.unit || "kg"}`,
            String(row.itemNotes || row.customerNotes || "-"),
            String(row.status || "-").replace(/_/g, " "),
            String(row.partnerName || "-"),
            `₹${Number(row.orderTotal || 0).toFixed(0)}`
          ];

          doc.font("ReportRegular").fontSize(7);
          const heights = values.map((val, i) =>
            doc.heightOfString(String(val), { width: cols[i].width - padX * 2, lineGap: 1 })
          );
          const rowHeight = Math.max(...heights, 14) + padY * 2;
          ensureSpace(rowHeight + 2);

          if (index % 2 === 0) {
            doc.rect(left, y, contentWidth, rowHeight).fill(altRowBg);
          }

          let x = left;
          values.forEach((val, i) => {
            doc
              .fillColor("#0f172a")
              .font("ReportRegular")
              .fontSize(7)
              .text(val, x + padX, y + padY, {
                width: cols[i].width - padX * 2,
                height: rowHeight - padY * 2,
                lineGap: 1
              });
            x += cols[i].width;
          });

          doc.strokeColor(borderColor).lineWidth(0.6).rect(left, y, contentWidth, rowHeight).stroke();
          let splitX = left;
          for (let i = 0; i < cols.length - 1; i++) {
            splitX += cols[i].width;
            doc.moveTo(splitX, y).lineTo(splitX, y + rowHeight).stroke();
          }
          y += rowHeight;
        });
      }

      doc.end();
      writeStream.on("finish", () => resolve({ filePath, fileName }));
      writeStream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateCategoryOrdersReport };
