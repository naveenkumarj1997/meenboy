const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateInvoice = (order, user) => {
  return new Promise((resolve, reject) => {
    try {
      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, "../../uploads/invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `INV-${order._id}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      // Initialize PDF document
      const doc = new PDFDocument({ margin: 50, size: "A4" });

      // Pipe to file
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // --- Header ---
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("MEENBOY", 50, 50)
        .fontSize(10)
        .font("Helvetica")
        .text("123 Fish Market Road", 50, 80)
        .text("Chennai, Tamil Nadu 600001", 50, 95)
        .text("GSTIN: 33AAAAA0000A1Z5", 50, 110)
        .text("Email: support@meenboy.com", 50, 125);

      // --- Invoice Details ---
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("TAX INVOICE", 400, 50, { align: "right" })
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Invoice Number:", 400, 80, { align: "right" })
        .font("Helvetica")
        .text(order._id.toString().slice(-8).toUpperCase(), 400, 95, { align: "right" })
        .font("Helvetica-Bold")
        .text("Invoice Date:", 400, 110, { align: "right" })
        .font("Helvetica")
        .text(new Date(order.createdAt).toLocaleDateString(), 400, 125, { align: "right" });

      doc.moveDown(3);

      // --- Bill To ---
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Bill To:", 50, 170)
        .fontSize(10)
        .font("Helvetica")
        .text(user?.name || "Customer", 50, 190)
        .text(order.address.line1, 50, 205);

      if (order.address.line2) {
        doc.text(order.address.line2, 50, 220);
        doc.text(`${order.address.city}, ${order.address.state} ${order.address.postalCode}`, 50, 235);
      } else {
        doc.text(`${order.address.city}, ${order.address.state} ${order.address.postalCode}`, 50, 220);
      }

      // --- Table Header ---
      const tableTop = 280;
      doc
        .font("Helvetica-Bold")
        .text("Item Description", 50, tableTop)
        .text("Quantity", 280, tableTop, { width: 90, align: "right" })
        .text("Unit Price", 370, tableTop, { width: 90, align: "right" })
        .text("Total", 470, tableTop, { width: 70, align: "right" });

      doc
        .moveTo(50, tableTop + 20)
        .lineTo(550, tableTop + 20)
        .stroke();

      // --- Table Rows ---
      let yPosition = tableTop + 30;
      doc.font("Helvetica");

      order.items.forEach((item) => {
        let description = item.productName;
        if (item.cutName) description += ` - ${item.cutName}`;

        doc
          .text(description, 50, yPosition, { width: 230 })
          .text(item.quantity.toString(), 280, yPosition, { width: 90, align: "right" })
          .text(`Rs. ${item.unitPrice.toFixed(2)}`, 370, yPosition, { width: 90, align: "right" })
          .text(`Rs. ${item.totalPrice.toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });

        yPosition += 30;
      });

      doc
        .moveTo(50, yPosition)
        .lineTo(550, yPosition)
        .stroke();

      yPosition += 15;

      // --- Totals ---
      doc
        .font("Helvetica-Bold")
        .text("Subtotal:", 370, yPosition, { width: 90, align: "right" })
        .font("Helvetica")
        .text(`Rs. ${order.subtotal.toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });

      yPosition += 20;

      doc
        .font("Helvetica-Bold")
        .text("Delivery Fee:", 370, yPosition, { width: 90, align: "right" })
        .font("Helvetica")
        .text(`Rs. ${order.deliveryFee.toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });

      yPosition += 20;

      doc
        .moveTo(370, yPosition)
        .lineTo(550, yPosition)
        .stroke();

      yPosition += 10;

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Total Amount:", 350, yPosition, { width: 110, align: "right" })
        .text(`Rs. ${order.total.toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });

      // --- Footer ---
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          "Thank you for your business! For any queries, contact support@meenboy.com.",
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
