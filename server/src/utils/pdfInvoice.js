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

const FONT_REGULAR = path.join(__dirname, "../assets/fonts/HindMadurai-Regular.ttf");
const FONT_BOLD = path.join(__dirname, "../assets/fonts/HindMadurai-Bold.ttf");
const FALLBACK_REGULAR = "C:\\Windows\\Fonts\\Nirmala.ttf";
const FALLBACK_BOLD = "C:\\Windows\\Fonts\\NirmalaB.ttf";

const resolveFonts = () => {
  const regular = fs.existsSync(FONT_REGULAR)
    ? FONT_REGULAR
    : fs.existsSync(FALLBACK_REGULAR)
      ? FALLBACK_REGULAR
      : null;
  const bold = fs.existsSync(FONT_BOLD)
    ? FONT_BOLD
    : fs.existsSync(FALLBACK_BOLD)
      ? FALLBACK_BOLD
      : regular;

  return { regular, bold };
};

const buildBillToLines = (order, user) => {
  const lines = [];
  lines.push(user?.name || "Customer");

  const line1 = (order.address?.line1 || "").trim();
  const line2 = (order.address?.line2 || "").trim();
  const city = (order.address?.city || "").trim();
  const state = (order.address?.state || "").trim();
  const postalCode = (order.address?.postalCode || "").trim();
  const phone = (order.address?.phone || "").trim();

  if (line1) lines.push(line1);

  // Avoid repeating area/line2 when it is already part of line1
  if (line2) {
    const line1Lower = line1.toLowerCase();
    const line2Lower = line2.toLowerCase();
    if (!line1Lower.includes(line2Lower)) {
      lines.push(line2);
    }
  }

  const cityStatePin = [city, state].filter(Boolean).join(", ");
  const location = postalCode ? `${cityStatePin} ${postalCode}`.trim() : cityStatePin;
  if (location) lines.push(location);

  if (phone) lines.push(`Phone: ${phone}`);

  return lines;
};

const generateInvoice = (order, user) => {
  return new Promise((resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, "../../uploads/invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `INV-${order._id}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      const fonts = resolveFonts();
      if (!fonts.regular) {
        return reject(new Error("No Unicode font found for invoice PDF (Tamil support required)."));
      }

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      doc.registerFont("InvoiceRegular", fonts.regular);
      doc.registerFont("InvoiceBold", fonts.bold || fonts.regular);

      // --- Shop Header ---
      doc
        .font("InvoiceBold")
        .fontSize(24)
        .text(SHOP.name, 50, 50)
        .font("InvoiceRegular")
        .fontSize(9)
        .text(SHOP.addressLine1, 50, 80)
        .text(SHOP.addressLine2, 50, 93)
        .text(SHOP.cityLine, 50, 106)
        .text(`Phone: ${SHOP.phone}`, 50, 119)
        .text(`Email: ${SHOP.email}`, 50, 132);

      // --- Invoice Details ---
      doc
        .font("InvoiceBold")
        .fontSize(20)
        .text("TAX INVOICE", 400, 50, { align: "right" })
        .fontSize(10)
        .text("Invoice Number:", 400, 80, { align: "right" })
        .font("InvoiceRegular")
        .text(order._id.toString().slice(-8).toUpperCase(), 400, 95, { align: "right" })
        .font("InvoiceBold")
        .text("Invoice Date:", 400, 110, { align: "right" })
        .font("InvoiceRegular")
        .text(new Date(order.createdAt).toLocaleDateString(), 400, 125, { align: "right" });

      // --- Bill To ---
      const billToLines = buildBillToLines(order, user);
      let billY = 170;
      doc.font("InvoiceBold").fontSize(12).text("Bill To:", 50, billY);
      billY += 18;
      doc.font("InvoiceRegular").fontSize(10);
      billToLines.forEach((line) => {
        doc.text(line, 50, billY, { width: 280 });
        billY += 14;
      });

      // --- Table Header ---
      const tableTop = Math.max(280, billY + 20);
      doc
        .font("InvoiceBold")
        .fontSize(10)
        .text("Item Description", 50, tableTop)
        .text("Quantity", 280, tableTop, { width: 90, align: "right" })
        .text("Unit Price", 370, tableTop, { width: 90, align: "right" })
        .text("Total", 470, tableTop, { width: 70, align: "right" });

      doc
        .moveTo(50, tableTop + 20)
        .lineTo(550, tableTop + 20)
        .stroke();

      let yPosition = tableTop + 30;
      doc.font("InvoiceRegular").fontSize(10);

      order.items.forEach((item) => {
        let description = item.productName || "Item";
        if (item.cutName) description += ` - ${item.cutName}`;

        // Measure wrapped Tamil/English description height
        const descHeight = doc.heightOfString(description, { width: 230 });
        const rowHeight = Math.max(30, descHeight + 8);

        doc
          .font("InvoiceRegular")
          .text(description, 50, yPosition, { width: 230 })
          .text(String(item.quantity), 280, yPosition, { width: 90, align: "right" })
          .text(`Rs. ${Number(item.unitPrice).toFixed(2)}`, 370, yPosition, { width: 90, align: "right" })
          .text(`Rs. ${Number(item.totalPrice).toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });

        yPosition += rowHeight;
      });

      doc
        .moveTo(50, yPosition)
        .lineTo(550, yPosition)
        .stroke();

      yPosition += 15;

      doc
        .font("InvoiceBold")
        .text("Subtotal:", 370, yPosition, { width: 90, align: "right" })
        .font("InvoiceRegular")
        .text(`Rs. ${Number(order.subtotal).toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });

      yPosition += 20;

      doc
        .font("InvoiceBold")
        .text("Delivery Fee:", 370, yPosition, { width: 90, align: "right" })
        .font("InvoiceRegular")
        .text(`Rs. ${Number(order.deliveryFee).toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });

      yPosition += 20;

      doc
        .moveTo(370, yPosition)
        .lineTo(550, yPosition)
        .stroke();

      yPosition += 10;

      doc
        .font("InvoiceBold")
        .fontSize(12)
        .text("Total Amount:", 350, yPosition, { width: 110, align: "right" })
        .text(`Rs. ${Number(order.total).toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });

      doc
        .font("InvoiceRegular")
        .fontSize(10)
        .text(
          `Thank you for your business! For any queries, contact ${SHOP.email} | ${SHOP.phone}`,
          50,
          700,
          { align: "center", width: 500 }
        );

      doc.end();

      writeStream.on("finish", () => {
        resolve(`/uploads/invoices/${fileName}`);
      });

      writeStream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoice
};
