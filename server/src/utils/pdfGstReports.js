const PDFDocument = require("pdfkit");
const { resolvePdfFonts } = require("./pdfFonts");

const money = (n) => `Rs ${Number(n || 0).toFixed(2)}`;

const generateGstSalesRegisterPdf = (report) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const { regular, bold } = resolvePdfFonts();
      doc.registerFont("Gst", regular || "Helvetica");
      doc.registerFont("GstBold", bold || regular || "Helvetica-Bold");

      const s = report.settings || {};
      const left = 28;
      const width = doc.page.width - 56;

      doc.font("GstBold").fontSize(16).fillColor("#0f172a").text(s.tradeName || "FISHFRIENDLY", left, 28);
      doc
        .font("Gst")
        .fontSize(9)
        .fillColor("#334155")
        .text(
          `${s.addressLine1 || ""}, ${s.addressLine2 || ""}, ${s.city || ""} - ${s.postalCode || ""}`,
          left,
          48
        )
        .text(
          `GSTIN: ${s.gstin || "Not set"}  |  State: ${s.stateName || "Tamil Nadu"} (${s.stateCode || "33"})  |  Type: ${s.registrationType || "-"}`
        );

      doc
        .font("GstBold")
        .fontSize(12)
        .fillColor("#0f766e")
        .text(
          `GST Sales Register  ·  ${report.range?.from} to ${report.range?.to}`,
          left,
          78
        );

      doc
        .font("Gst")
        .fontSize(8)
        .fillColor("#64748b")
        .text(report.disclaimer || "", left, 96, { width });

      const cols = [
        { key: "date", label: "Date", w: 58 },
        { key: "docType", label: "Type", w: 48 },
        { key: "docNo", label: "Doc No", w: 72 },
        { key: "customerName", label: "Customer", w: 90 },
        { key: "productName", label: "Item", w: 100 },
        { key: "hsn", label: "HSN", w: 42 },
        { key: "rate", label: "Rate%", w: 36 },
        { key: "taxable", label: "Taxable", w: 58 },
        { key: "cgst", label: "CGST", w: 48 },
        { key: "sgst", label: "SGST", w: 48 },
        { key: "gross", label: "Gross", w: 58 }
      ];

      let y = 118;
      const drawHeader = () => {
        doc.rect(left, y, width, 18).fill("#0f766e");
        let x = left;
        doc.fillColor("#fff").font("GstBold").fontSize(7);
        cols.forEach((c) => {
          doc.text(c.label, x + 2, y + 5, { width: c.w - 4 });
          x += c.w;
        });
        y += 18;
      };

      drawHeader();

      const rows = report.sales || [];
      rows.forEach((row, idx) => {
        if (y > doc.page.height - 40) {
          doc.addPage();
          y = 28;
          drawHeader();
        }
        if (idx % 2 === 0) doc.rect(left, y, width, 16).fill("#f0fdfa");
        let x = left;
        doc.fillColor("#0f172a").font("Gst").fontSize(7);
        const values = [
          row.date,
          row.docType,
          row.docNo,
          row.customerName,
          row.productName,
          row.hsn,
          String(row.rate),
          money(row.taxable),
          money(row.cgst),
          money(row.sgst),
          money(row.gross)
        ];
        values.forEach((val, i) => {
          doc.text(String(val || "-"), x + 2, y + 4, { width: cols[i].w - 4, ellipsis: true });
          x += cols[i].w;
        });
        y += 16;
      });

      y += 10;
      const sum = report.summary || {};
      doc
        .font("GstBold")
        .fontSize(9)
        .fillColor("#0f172a")
        .text(
          `Lines: ${sum.lines || 0}  |  Taxable: ${money(sum.taxable)}  |  CGST: ${money(sum.cgst)}  |  SGST: ${money(sum.sgst)}  |  Gross: ${money(sum.gross)}`,
          left,
          y
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

const generateGstSummaryPdf = (report) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const { regular, bold } = resolvePdfFonts();
      doc.registerFont("Gst", regular || "Helvetica");
      doc.registerFont("GstBold", bold || regular || "Helvetica-Bold");

      const s = report.settings || {};
      doc.font("GstBold").fontSize(16).text(s.tradeName || "FISHFRIENDLY");
      doc
        .font("Gst")
        .fontSize(9)
        .fillColor("#334155")
        .text(`GSTIN: ${s.gstin || "Not set"}`)
        .text(`Period: ${report.range?.from} to ${report.range?.to}`);
      doc.moveDown();
      doc.font("GstBold").fontSize(12).fillColor("#0f766e").text("B2C Rate-wise Summary (CGST + SGST)");
      doc.moveDown(0.5);

      doc.font("GstBold").fontSize(9).fillColor("#0f172a");
      doc.text("Rate%          Taxable              CGST               SGST               Gross");
      doc.moveDown(0.3);
      doc.font("Gst").fontSize(9);
      (report.rateWise || []).forEach((r) => {
        doc.text(
          `${String(r.rate).padEnd(6)}   ${money(r.taxable).padEnd(16)}  ${money(r.cgst).padEnd(16)}  ${money(r.sgst).padEnd(16)}  ${money(r.gross)}`
        );
      });

      doc.moveDown();
      doc.font("GstBold").fontSize(12).fillColor("#0f766e").text("HSN-wise Summary");
      doc.moveDown(0.5);
      doc.font("GstBold").fontSize(9).fillColor("#0f172a");
      doc.text("HSN        Rate%     Taxable           CGST            SGST            Gross");
      doc.font("Gst").fontSize(9);
      (report.hsnWise || []).forEach((r) => {
        doc.text(
          `${String(r.hsn).padEnd(10)} ${String(r.rate).padEnd(6)}  ${money(r.taxable).padEnd(14)}  ${money(r.cgst).padEnd(14)}  ${money(r.sgst).padEnd(14)}  ${money(r.gross)}`
        );
      });

      doc.moveDown();
      const sum = report.summary || {};
      doc
        .font("GstBold")
        .fontSize(10)
        .fillColor("#0f172a")
        .text(
          `TOTAL  Taxable ${money(sum.taxable)}  |  CGST ${money(sum.cgst)}  |  SGST ${money(sum.sgst)}  |  Gross ${money(sum.gross)}`
        );
      doc.moveDown();
      doc.font("Gst").fontSize(8).fillColor("#64748b").text(report.disclaimer || "");
      doc.moveDown();
      doc.text(
        `Vendor purchases (shop record, not GST invoices): ${money(sum.purchaseTotal)}`
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

module.exports = {
  generateGstSalesRegisterPdf,
  generateGstSummaryPdf
};
