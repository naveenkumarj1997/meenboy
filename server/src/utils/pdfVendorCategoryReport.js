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

/** Distinct theme per category so vendors can spot the right PDF quickly */
const CATEGORY_THEMES = {
  "Fish & Seafood": {
    primary: "#0e7490",
    banner: "#06b6d4",
    soft: "#cffafe",
    label: "#155e75"
  },
  Fish: {
    primary: "#0369a1",
    banner: "#0ea5e9",
    soft: "#e0f2fe",
    label: "#075985"
  },
  Seafood: {
    primary: "#0f766e",
    banner: "#14b8a6",
    soft: "#ccfbf1",
    label: "#115e59"
  },
  Chicken: {
    primary: "#b45309",
    banner: "#f59e0b",
    soft: "#fef3c7",
    label: "#92400e"
  },
  Mutton: {
    primary: "#be123c",
    banner: "#f43f5e",
    soft: "#ffe4e6",
    label: "#9f1239"
  },
  "Country Chicken": {
    primary: "#c2410c",
    banner: "#fb923c",
    soft: "#ffedd5",
    label: "#9a3412"
  },
  Other: {
    primary: "#475569",
    banner: "#64748b",
    soft: "#f1f5f9",
    label: "#334155"
  },
  ALL: {
    primary: "#4c1d95",
    banner: "#8b5cf6",
    soft: "#ede9fe",
    label: "#5b21b6"
  }
};

const getCategoryTheme = (categoryLabel) => {
  if (categoryLabel === "Fish" || categoryLabel === "Seafood") {
    return CATEGORY_THEMES["Fish & Seafood"];
  }
  return CATEGORY_THEMES[categoryLabel] || CATEGORY_THEMES.Other;
};

/**
 * Vendor prep PDF — list of items by category for a delivery date.
 * @param {{ date: string, categoryLabel: string, rows: Array<{
 *   productName: string, cutName?: string, quantity: number, unit?: string,
 *   notes?: string, orderId?: string, customerName?: string
 * }>, totals?: Array<{ label: string, quantity: number, unit?: string }> }} opts
 */
const generateVendorCategoryReport = ({ date, categoryLabel, rows, totals = [] }) => {
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(__dirname, "../../uploads/reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const slug = String(categoryLabel || "ALL")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 40);
      const fileName = `VendorPrep-${date}-${slug}.pdf`;
      const filePath = path.join(reportsDir, fileName);

      const fonts = resolvePdfFonts();
      if (!fonts.regular) {
        return reject(new Error("No Unicode font found for report PDF."));
      }

      const doc = new PDFDocument({ margin: 36, size: "A4", layout: "portrait" });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      doc.registerFont("ReportRegular", fonts.regular);
      doc.registerFont("ReportBold", fonts.bold || fonts.regular);

      const left = 36;
      const right = doc.page.width - 36;
      const contentWidth = right - left;
      const theme = getCategoryTheme(categoryLabel);
      const borderColor = theme.primary;
      const headerBg = theme.primary;
      const altRowBg = theme.soft;
      const padX = 4;
      const padY = 4;

      // Top color banner — easy category recognition
      doc.rect(0, 0, doc.page.width, 18).fill(theme.banner);

      doc
        .font("ReportBold")
        .fontSize(18)
        .fillColor(theme.primary)
        .text(SHOP.name, left, 32, { width: contentWidth });

      doc
        .font("ReportRegular")
        .fontSize(9)
        .fillColor("#334155")
        .text(SHOP.addressLine1, left, 56)
        .text(`${SHOP.addressLine2}, ${SHOP.cityLine}`)
        .text(`Phone: ${SHOP.phone}  |  ${SHOP.email}`);

      // Category color badge
      const badgeY = doc.y + 14;
      const badgeLabel = String(categoryLabel || "Other").toUpperCase();
      doc.font("ReportBold").fontSize(11);
      const badgeW = Math.min(contentWidth, doc.widthOfString(badgeLabel) + 24);
      doc.roundedRect(left, badgeY, badgeW, 22, 4).fill(theme.banner);
      doc
        .fillColor("#ffffff")
        .text(badgeLabel, left, badgeY + 5, { width: badgeW, align: "center" });

      doc
        .font("ReportBold")
        .fontSize(14)
        .fillColor(theme.label)
        .text("Vendor Prep List", left, badgeY + 32);

      doc
        .moveDown(0.3)
        .font("ReportRegular")
        .fontSize(10)
        .fillColor("#1e293b")
        .text(`Category: ${categoryLabel}`)
        .text(`Delivery Date: ${date}`)
        .text(`Total Line Items: ${rows.length}`)
        .text(`Generated: ${new Date().toLocaleString("en-IN")}`);

      doc
        .moveDown(0.4)
        .font("ReportRegular")
        .fontSize(9)
        .fillColor("#64748b")
        .text(
          "For vendor preparation — cut and pack meats as listed. Check Special Notes carefully."
        );

      doc.moveDown(0.6);

      const cols = [
        { key: "sno", label: "#", width: 22 },
        { key: "product", label: "Product", width: 90 },
        { key: "cut", label: "Cut", width: 58 },
        { key: "qty", label: "Qty", width: 42 },
        { key: "customer", label: "Customer", width: 78 },
        { key: "notes", label: "Special Notes", width: 140 },
        { key: "order", label: "Order", width: 42 }
      ];

      const drawCellBorders = (yPos, rowHeight) => {
        doc.strokeColor(borderColor).lineWidth(0.8).rect(left, yPos, contentWidth, rowHeight).stroke();
        let x = left;
        for (let i = 0; i < cols.length - 1; i++) {
          x += cols[i].width;
          doc.moveTo(x, yPos).lineTo(x, yPos + rowHeight).stroke();
        }
      };

      const drawTableHeader = (yPos) => {
        const headerH = 22;
        doc.rect(left, yPos, contentWidth, headerH).fill(headerBg);
        let x = left;
        doc.font("ReportBold").fontSize(8).fillColor("#ffffff");
        cols.forEach((col) => {
          doc.text(col.label, x + padX, yPos + 7, { width: col.width - padX * 2 });
          x += col.width;
        });
        drawCellBorders(yPos, headerH);
        return yPos + headerH;
      };

      let y = drawTableHeader(doc.y);

      const ensureSpace = (needed) => {
        if (y + needed > doc.page.height - 50) {
          doc.addPage();
          doc.rect(0, 0, doc.page.width, 18).fill(theme.banner);
          y = drawTableHeader(28);
        }
      };

      rows.forEach((row, index) => {
        const notes = String(row.notes || "").trim() || "-";
        const values = [
          String(index + 1),
          String(row.productName || "-"),
          String(row.cutName || "-"),
          `${row.quantity}${row.unit || "kg"}`,
          String(row.customerName || "Guest"),
          notes,
          row.orderId ? `#${String(row.orderId).slice(-6).toUpperCase()}` : "-"
        ];

        doc.font("ReportRegular").fontSize(8);
        const heights = values.map((val, i) =>
          doc.heightOfString(String(val), { width: cols[i].width - padX * 2, lineGap: 2 })
        );
        const rowHeight = Math.max(...heights, 18) + padY * 2;

        ensureSpace(rowHeight + 2);

        if (index % 2 === 0) {
          doc.rect(left, y, contentWidth, rowHeight).fill(altRowBg);
        }

        let x = left;
        const textY = y + padY;
        cols.forEach((col, i) => {
          const isNotes = col.key === "notes" && notes !== "-";
          doc
            .fillColor(isNotes ? "#b45309" : "#0f172a")
            .font(isNotes ? "ReportBold" : "ReportRegular")
            .fontSize(8)
            .text(values[i], x + padX, textY, {
              width: col.width - padX * 2,
              height: rowHeight - padY * 2,
              align: col.key === "sno" || col.key === "qty" ? "center" : "left",
              lineGap: 2
            });
          x += col.width;
        });

        doc.x = left;
        doc.y = y + rowHeight;
        drawCellBorders(y, rowHeight);
        y += rowHeight;
      });

      if (rows.length === 0) {
        ensureSpace(40);
        const emptyH = 36;
        doc.rect(left, y, contentWidth, emptyH).strokeColor(borderColor).lineWidth(0.8).stroke();
        doc
          .font("ReportRegular")
          .fontSize(11)
          .fillColor("#64748b")
          .text("No items for this category on the selected date.", left, y + 12, {
            width: contentWidth,
            align: "center"
          });
        y += emptyH;
      }

      // Totals summary
      if (totals.length > 0) {
        ensureSpace(80);
        y += 16;
        doc
          .font("ReportBold")
          .fontSize(11)
          .fillColor("#0f172a")
          .text("Quantity Summary (for vendor)", left, y);
        y += 18;

        const tCols = [
          { label: "Product / Cut", width: 320 },
          { label: "Total Qty", width: 150 }
        ];

        const drawTotalsHeader = (yPos) => {
          const h = 20;
          doc.rect(left, yPos, contentWidth, h).fill(headerBg);
          let x = left;
          doc.font("ReportBold").fontSize(8).fillColor("#ffffff");
          tCols.forEach((col) => {
            doc.text(col.label, x + padX, yPos + 6, { width: col.width - padX * 2 });
            x += col.width;
          });
          doc.strokeColor(borderColor).lineWidth(0.8).rect(left, yPos, contentWidth, h).stroke();
          doc.moveTo(left + tCols[0].width, yPos).lineTo(left + tCols[0].width, yPos + h).stroke();
          return yPos + h;
        };

        y = drawTotalsHeader(y);

        totals.forEach((t, i) => {
          const values = [t.label, `${t.quantity}${t.unit || "kg"}`];
          doc.font("ReportRegular").fontSize(9);
          const h =
            Math.max(
              doc.heightOfString(values[0], { width: tCols[0].width - padX * 2 }),
              doc.heightOfString(values[1], { width: tCols[1].width - padX * 2 }),
              14
            ) + padY * 2;

          if (y + h > doc.page.height - 40) {
            doc.addPage();
            y = drawTotalsHeader(36);
          }

          if (i % 2 === 0) doc.rect(left, y, contentWidth, h).fill(altRowBg);

          let x = left;
          values.forEach((val, vi) => {
            doc
              .fillColor("#0f172a")
              .font("ReportRegular")
              .fontSize(9)
              .text(val, x + padX, y + padY, {
                width: tCols[vi].width - padX * 2,
                align: vi === 1 ? "center" : "left"
              });
            x += tCols[vi].width;
          });

          doc.strokeColor(borderColor).lineWidth(0.8).rect(left, y, contentWidth, h).stroke();
          doc
            .moveTo(left + tCols[0].width, y)
            .lineTo(left + tCols[0].width, y + h)
            .stroke();
          y += h;
        });
      }

      y += 20;
      if (y > doc.page.height - 40) {
        doc.addPage();
        y = 40;
      }
      doc
        .font("ReportRegular")
        .fontSize(9)
        .fillColor("#64748b")
        .text("Please prepare and cut according to this list before delivery day.", left, y, {
          width: contentWidth
        });

      doc.end();
      writeStream.on("finish", () => resolve({ filePath, fileName }));
      writeStream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Multi-category vendor PDF (sections for each category).
 */
const generateVendorAllCategoriesReport = async ({ date, sections }) => {
  // Build one combined PDF by writing sections sequentially in a custom flow
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(__dirname, "../../uploads/reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `VendorPrep-${date}-ALL.pdf`;
      const filePath = path.join(reportsDir, fileName);

      const fonts = resolvePdfFonts();
      if (!fonts.regular) {
        return reject(new Error("No Unicode font found for report PDF."));
      }

      const doc = new PDFDocument({ margin: 36, size: "A4" });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);
      doc.registerFont("ReportRegular", fonts.regular);
      doc.registerFont("ReportBold", fonts.bold || fonts.regular);

      const left = 36;
      const right = doc.page.width - 36;
      const contentWidth = right - left;
      const allTheme = getCategoryTheme("ALL");
      const padX = 4;
      const padY = 4;

      const cols = [
        { key: "sno", label: "#", width: 22 },
        { key: "product", label: "Product", width: 90 },
        { key: "cut", label: "Cut", width: 58 },
        { key: "qty", label: "Qty", width: 42 },
        { key: "customer", label: "Customer", width: 78 },
        { key: "notes", label: "Special Notes", width: 140 },
        { key: "order", label: "Order", width: 42 }
      ];

      // Cover with ALL purple theme
      doc.rect(0, 0, doc.page.width, 18).fill(allTheme.banner);
      doc
        .font("ReportBold")
        .fontSize(18)
        .fillColor(allTheme.primary)
        .text(SHOP.name, left, 32, { width: contentWidth });
      doc
        .font("ReportRegular")
        .fontSize(9)
        .fillColor("#334155")
        .text(SHOP.addressLine1, left, 56)
        .text(`${SHOP.addressLine2}, ${SHOP.cityLine}`)
        .text(`Phone: ${SHOP.phone}`);
      doc
        .moveDown(1)
        .font("ReportBold")
        .fontSize(14)
        .fillColor(allTheme.label)
        .text("Vendor Prep Lists — All Categories");
      doc
        .moveDown(0.3)
        .font("ReportRegular")
        .fontSize(10)
        .fillColor("#1e293b")
        .text(`Delivery Date: ${date}`)
        .text(`Generated: ${new Date().toLocaleString("en-IN")}`);

      // Color legend
      doc.moveDown(0.5).font("ReportBold").fontSize(9).fillColor("#334155").text("Category colors:");
      let legendX = left;
      const legendY = doc.y + 4;
      ["Fish & Seafood", "Chicken", "Mutton", "Country Chicken"].forEach((cat) => {
        const t = getCategoryTheme(cat);
        doc.roundedRect(legendX, legendY, 12, 12, 2).fill(t.banner);
        doc
          .font("ReportRegular")
          .fontSize(8)
          .fillColor(t.label)
          .text(cat, legendX + 16, legendY + 1);
        legendX += doc.widthOfString(cat) + 36;
      });

      let y = legendY + 28;
      let firstSection = true;

      sections.forEach((section) => {
        const theme = getCategoryTheme(section.categoryLabel);
        const borderColor = theme.primary;
        const headerBg = theme.primary;
        const altRowBg = theme.soft;

        const drawCellBorders = (yPos, rowHeight) => {
          doc.strokeColor(borderColor).lineWidth(0.8).rect(left, yPos, contentWidth, rowHeight).stroke();
          let x = left;
          for (let i = 0; i < cols.length - 1; i++) {
            x += cols[i].width;
            doc.moveTo(x, yPos).lineTo(x, yPos + rowHeight).stroke();
          }
        };

        const drawTableHeader = (yPos) => {
          const headerH = 22;
          doc.rect(left, yPos, contentWidth, headerH).fill(headerBg);
          let x = left;
          doc.font("ReportBold").fontSize(8).fillColor("#ffffff");
          cols.forEach((col) => {
            doc.text(col.label, x + padX, yPos + 7, { width: col.width - padX * 2 });
            x += col.width;
          });
          drawCellBorders(yPos, headerH);
          return yPos + headerH;
        };

        if (!firstSection) {
          doc.addPage();
          y = 40;
        }
        firstSection = false;

        // Category page banner
        doc.rect(0, 0, doc.page.width, 14).fill(theme.banner);

        const badgeLabel = String(section.categoryLabel || "Other").toUpperCase();
        doc.font("ReportBold").fontSize(11);
        const badgeW = Math.min(contentWidth, doc.widthOfString(badgeLabel) + 24);
        doc.roundedRect(left, y, badgeW, 22, 4).fill(theme.banner);
        doc.fillColor("#ffffff").text(badgeLabel, left, y + 5, { width: badgeW, align: "center" });
        y += 30;

        doc
          .font("ReportBold")
          .fontSize(13)
          .fillColor(theme.label)
          .text(`Category: ${section.categoryLabel}`, left, y, { width: contentWidth });
        y = doc.y + 8;

        y = drawTableHeader(y);

        const ensureSpace = (needed) => {
          if (y + needed > doc.page.height - 50) {
            doc.addPage();
            doc.rect(0, 0, doc.page.width, 14).fill(theme.banner);
            y = drawTableHeader(28);
          }
        };

        if (!section.rows.length) {
          ensureSpace(36);
          doc.rect(left, y, contentWidth, 32).strokeColor(borderColor).lineWidth(0.8).stroke();
          doc
            .font("ReportRegular")
            .fontSize(10)
            .fillColor("#64748b")
            .text("No items in this category.", left, y + 10, {
              width: contentWidth,
              align: "center"
            });
          y += 32;
          return;
        }

        section.rows.forEach((row, index) => {
          const notes = String(row.notes || "").trim() || "-";
          const values = [
            String(index + 1),
            String(row.productName || "-"),
            String(row.cutName || "-"),
            `${row.quantity}${row.unit || "kg"}`,
            String(row.customerName || "Guest"),
            notes,
            row.orderId ? `#${String(row.orderId).slice(-6).toUpperCase()}` : "-"
          ];

          doc.font("ReportRegular").fontSize(8);
          const heights = values.map((val, i) =>
            doc.heightOfString(String(val), { width: cols[i].width - padX * 2, lineGap: 2 })
          );
          const rowHeight = Math.max(...heights, 18) + padY * 2;
          ensureSpace(rowHeight + 2);

          if (index % 2 === 0) doc.rect(left, y, contentWidth, rowHeight).fill(altRowBg);

          let x = left;
          cols.forEach((col, i) => {
            const isNotes = col.key === "notes" && notes !== "-";
            doc
              .fillColor(isNotes ? "#b45309" : "#0f172a")
              .font(isNotes ? "ReportBold" : "ReportRegular")
              .fontSize(8)
              .text(values[i], x + padX, y + padY, {
                width: col.width - padX * 2,
                height: rowHeight - padY * 2,
                align: col.key === "sno" || col.key === "qty" ? "center" : "left",
                lineGap: 2
              });
            x += col.width;
          });

          doc.x = left;
          doc.y = y + rowHeight;
          drawCellBorders(y, rowHeight);
          y += rowHeight;
        });

        if (section.totals?.length) {
          y += 12;
          if (y > doc.page.height - 80) {
            doc.addPage();
            doc.rect(0, 0, doc.page.width, 14).fill(theme.banner);
            y = 28;
          }
          doc
            .font("ReportBold")
            .fontSize(10)
            .fillColor(theme.label)
            .text("Quantity Summary", left, y);
          y = doc.y + 6;
          section.totals.forEach((t) => {
            if (y > doc.page.height - 30) {
              doc.addPage();
              doc.rect(0, 0, doc.page.width, 14).fill(theme.banner);
              y = 28;
            }
            doc
              .font("ReportRegular")
              .fontSize(9)
              .fillColor("#1e293b")
              .text(`• ${t.label}: ${t.quantity}${t.unit || "kg"}`, left, y);
            y = doc.y + 2;
          });
        }
      });

      doc.end();
      writeStream.on("finish", () => resolve({ filePath, fileName }));
      writeStream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateVendorCategoryReport,
  generateVendorAllCategoriesReport
};
