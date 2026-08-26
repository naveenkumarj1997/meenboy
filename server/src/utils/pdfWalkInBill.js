const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { resolvePdfFonts } = require("./pdfFonts");

const SHOP = {
  name: "FISHFRIENDLY",
  phone: "+91 9087894319",
  addressLine1: "Balusamy konnar street, Madakkulam",
  addressLine2: "Bypass Road in Kalavasal",
  cityLine: "Madurai, Tamil Nadu - 625003"
};

const formatQty = (item) => {
  const qty = Number(item.quantity);
  const unit = String(item.unit || "kg").toLowerCase();
  if (unit === "piece") {
    return `${qty} ${qty === 1 ? "piece" : "pieces"}`;
  }
  if (qty > 0 && qty < 1) return `${Math.round(qty * 1000)} gram`;
  const kg = Math.round(qty * 100) / 100;
  return `${kg} kg`;
};

const money = (n) => `Rs ${Number(n || 0).toFixed(2)}`;

/**
 * Compact A4/thermal-friendly shop bill for walk-in sales.
 */
const generateWalkInBill = (sale) => {
  return new Promise((resolve, reject) => {
    try {
      const billsDir = path.join(__dirname, "../../uploads/walkin-bills");
      if (!fs.existsSync(billsDir)) {
        fs.mkdirSync(billsDir, { recursive: true });
      }

      const safeBill = String(sale.billNumber || sale._id).replace(/[^\w-]/g, "_");
      const fileName = `WALKIN-${safeBill}.pdf`;
      const filePath = path.join(billsDir, fileName);
      const relativePath = `/uploads/walkin-bills/${fileName}`;

      const doc = new PDFDocument({
        size: "A4",
        margin: 40
      });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const fonts = resolvePdfFonts();
      if (!fonts?.regular) {
        return reject(new Error("No font found for walk-in bill PDF."));
      }
      doc.registerFont("BillRegular", fonts.regular);
      doc.registerFont("BillBold", fonts.bold || fonts.regular);

      // Header
      doc.font("BillBold").fontSize(18).text(SHOP.name, { align: "left" });
      doc.font("BillRegular").fontSize(9).fillColor("#333333");
      doc.text(SHOP.addressLine1);
      doc.text(SHOP.addressLine2);
      doc.text(SHOP.cityLine);
      doc.text(`Phone: ${SHOP.phone}`);

      doc.moveDown(0.5);
      doc.font("BillBold").fontSize(14).fillColor("#000000").text("SHOP BILL / CASH MEMO", { align: "right" });
      doc.font("BillRegular").fontSize(10);
      doc.text(`Bill No: ${sale.billNumber}`, { align: "right" });
      doc.text(
        `Date: ${sale.saleDate || ""} ${
          sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString("en-IN") : ""
        }`,
        { align: "right" }
      );

      doc.moveDown(0.8);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke("#cccccc");
      doc.moveDown(0.6);

      doc.font("BillBold").fontSize(11).text("Customer");
      doc.font("BillRegular").fontSize(10);
      doc.text(sale.customerName || "-");
      doc.text(`Phone: ${sale.customerPhone || "-"}`);
      doc.text(`Payment: ${String(sale.paymentMethod || "cash").toUpperCase()}`);

      doc.moveDown(0.8);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke("#cccccc");
      doc.moveDown(0.5);

      // Table header
      const startY = doc.y;
      doc.font("BillBold").fontSize(9);
      doc.text("#", 40, startY, { width: 20 });
      doc.text("Item", 60, startY, { width: 220 });
      doc.text("Qty", 290, startY, { width: 70 });
      doc.text("Rate", 370, startY, { width: 70 });
      doc.text("Amount", 450, startY, { width: 100, align: "right" });
      doc.font("BillRegular");
      doc.moveDown(0.4);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke("#dddddd");
      doc.moveDown(0.3);

      (sale.items || []).forEach((item, idx) => {
        const y = doc.y;
        const name = item.cutName
          ? `${item.productName} (${item.cutName})`
          : item.productName;
        doc.fontSize(9).fillColor("#000000");
        doc.text(String(idx + 1), 40, y, { width: 20 });
        doc.text(name, 60, y, { width: 220 });
        doc.text(formatQty(item), 290, y, { width: 70 });
        doc.text(money(item.unitPrice), 370, y, { width: 70 });
        doc.text(money(item.totalPrice), 450, y, { width: 100, align: "right" });
        doc.moveDown(0.55);
      });

      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke("#cccccc");
      doc.moveDown(0.5);

      doc.font("BillBold").fontSize(12);
      doc.text(`TOTAL: ${money(sale.total)}`, 40, doc.y, {
        width: 515,
        align: "right"
      });
      doc.font("BillRegular");

      if (sale.notes) {
        doc.moveDown(0.8);
        doc.fontSize(9).fillColor("#444444").text(`Note: ${sale.notes}`, 40, doc.y, {
          width: 515,
          align: "left"
        });
      }

      // Footer — reset x/width so center align is not skewed by table column positions
      const footerY = doc.y + 28;
      doc
        .font("BillRegular")
        .fontSize(9)
        .fillColor("#555555")
        .text("Thank you for visiting FISHFRIENDLY!", 40, footerY, {
          width: 515,
          align: "center",
          lineBreak: false
        });
      doc.text("Fresh fish, chicken & mutton - Madurai", 40, footerY + 16, {
        width: 515,
        align: "center",
        lineBreak: false
      });

      doc.end();
      stream.on("finish", () => resolve(relativePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateWalkInBill, formatQty };
