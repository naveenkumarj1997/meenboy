const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const SHOP = {
  name: "FISHFRIENDLY",
  phone: "+91 9087894319",
  addressLine1: "Balusamy konnar street, Madakkulam",
  addressLine2: "Bypass Road in Kalavasal",
  cityLine: "Madurai, Tamil Nadu - 625003"
};

const { resolvePdfFonts } = require("./pdfFonts");

const WEIGHT_QTY_LABELS = {
  0.25: "250 gram",
  0.5: "500 gram",
  1: "1 kg",
  1.5: "1.5 kg",
  2: "2 kg"
};

const formatInvoiceQuantity = (item) => {
  const qty = Number(item.quantity);
  const unit = String(item.unit || "kg").toLowerCase();
  if (unit !== "kg") {
    const label = unit === "piece" ? (qty === 1 ? "piece" : "pieces") : unit;
    return `${qty} ${label}`;
  }
  const knownKey = Object.keys(WEIGHT_QTY_LABELS).find((k) => Math.abs(Number(k) - qty) < 0.001);
  if (knownKey) return WEIGHT_QTY_LABELS[knownKey];
  if (qty > 0 && qty < 1) {
    return `${Math.round(qty * 1000)} gram`;
  }
  const kg = Math.round(qty * 100) / 100;
  return `${kg} kg`;
};

/** Strip spaces / NBSP / odd Unicode so Tamil PDF fonts never show □ boxes */
const sanitizePhoneForPdf = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

/** Remove invisible / non-printable chars that PDF fonts often lack */
const sanitizePdfText = (raw) =>
  String(raw || "")
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();

const getInvoicePriceChanges = (items = []) =>
  items
    .map((item) => {
      const oldRate = Number(item.estimatedUnitPrice);
      const newRate = Number(item.unitPrice);
      if (!Number.isFinite(oldRate) || !Number.isFinite(newRate)) return null;
      const diffPerUnit = newRate - oldRate;
      if (Math.abs(diffPerUnit) < 0.01) return null;
      const qty = Number(item.quantity) || 0;
      const lineDiff =
        item.estimatedTotalPrice != null
          ? Number(item.totalPrice) - Number(item.estimatedTotalPrice)
          : diffPerUnit * qty;
      return {
        name: item.productName || "Item",
        cutName: item.cutName || "",
        qtyLabel: formatInvoiceQuantity(item),
        unit: item.unit || "kg",
        oldRate,
        newRate,
        lineDiff
      };
    })
    .filter(Boolean);

const buildBillToLines = (order, user) => {
  const lines = [];
  lines.push(sanitizePdfText(user?.name || "Customer"));

  const line1 = sanitizePdfText(order.address?.line1 || "");
  const line2 = sanitizePdfText(order.address?.line2 || "");
  const city = sanitizePdfText(order.address?.city || "");
  const state = sanitizePdfText(order.address?.state || "");
  const postalCode = sanitizePdfText(order.address?.postalCode || "");
  const phone = sanitizePhoneForPdf(order.address?.phone || user?.phone);
  const alternatePhone = sanitizePhoneForPdf(
    order.address?.alternatePhone || user?.alternatePhone
  );

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
  if (alternatePhone) lines.push(`Alternate: ${alternatePhone}`);

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

      const fonts = resolvePdfFonts();
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
        .text(`Phone: ${SHOP.phone}`, 50, 119);

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
      const billToWidth = 280;
      const billLineGap = 2;

      doc.font("InvoiceBold").fontSize(12).text("Bill To:", 50, billY);
      billY += 18;
      doc.font("InvoiceRegular").fontSize(10);

      billToLines.forEach((line) => {
        const lineHeight = doc.heightOfString(line, { width: billToWidth, lineGap: billLineGap });
        doc.text(line, 50, billY, { width: billToWidth, lineGap: billLineGap });
        billY += lineHeight + 4;
      });

      const perItemNotes = (order.items || []).map((item) => String(item.notes || "").trim()).filter(Boolean);
      const showOrderLevelNotes =
        order.customerNotes &&
        String(order.customerNotes).trim() &&
        perItemNotes.length === 0;

      if (showOrderLevelNotes) {
        billY += 6;
        doc.font("InvoiceBold").fontSize(10).fillColor("#000000").text("Cutting / cleaning notes:", 50, billY);
        billY += 14;
        doc.font("InvoiceRegular").fontSize(9).fillColor("#333333");
        const notesText = String(order.customerNotes).trim();
        const notesHeight = doc.heightOfString(notesText, { width: billToWidth, lineGap: billLineGap });
        doc.text(notesText, 50, billY, { width: billToWidth, lineGap: billLineGap });
        billY += notesHeight + 4;
        doc.fillColor("#000000");
      }

      // --- Price status ---
      const priceConfirmed = Boolean(order.dailyPriceUpdated);
      let noticeY = billY + 18;
      if (priceConfirmed) {
        doc
          .font("InvoiceBold")
          .fontSize(11)
          .fillColor("#047857")
          .text("DAILY PRICE UPDATED", 50, noticeY, { width: 500 });
        noticeY += 16;
        doc
          .font("InvoiceRegular")
          .fontSize(9)
          .fillColor("#065f46")
          .text(
            "Actual market price for this delivery date has been applied. Amounts below are confirmed.",
            50,
            noticeY,
            { width: 500 }
          );
        noticeY += 22;
      } else {
        doc
          .font("InvoiceBold")
          .fontSize(11)
          .fillColor("#b45309")
          .text("APPROXIMATE PRICE — DAILY PRICE NOT UPDATED", 50, noticeY, { width: 500 });
        noticeY += 16;
        doc
          .font("InvoiceRegular")
          .fontSize(9)
          .fillColor("#92400e")
          .text(
            "Item prices and this total are approximate. The actual price is confirmed 1 day before delivery after Daily Prices are updated.",
            50,
            noticeY,
            { width: 500 }
          );
        noticeY += 22;
      }
      doc.fillColor("#000000");

      // --- Table Header ---
      const tableTop = Math.max(280, noticeY + 12);
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

        const itemNote = String(item.notes || "").trim();
        if (itemNote) {
          description += `\nNote: ${sanitizePdfText(itemNote)}`;
        }

        // Measure wrapped Tamil/English description height
        const descHeight = doc.heightOfString(description, { width: 230 });
        const rowHeight = Math.max(30, descHeight + 8);

        doc
          .font("InvoiceRegular")
          .text(description, 50, yPosition, { width: 230 })
          .text(formatInvoiceQuantity(item), 280, yPosition, { width: 90, align: "right" })
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

      const addonAmount = Number(order.addonAmount || 0);
      const discountAmount = Number(order.discountAmount || 0);

      if (addonAmount > 0) {
        doc
          .font("InvoiceBold")
          .text("Addon:", 370, yPosition, { width: 90, align: "right" })
          .font("InvoiceRegular")
          .text(`Rs. ${addonAmount.toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });
        yPosition += 14;
        if (order.addonNote && String(order.addonNote).trim()) {
          doc.font("InvoiceRegular").fontSize(8).fillColor("#374151");
          const addonNote = sanitizePdfText(order.addonNote);
          const noteHeight = doc.heightOfString(addonNote, { width: 500, lineGap: 1 });
          doc.text(`Addon note: ${addonNote}`, 50, yPosition, { width: 500, lineGap: 1 });
          yPosition += noteHeight + 6;
          doc.fontSize(10).fillColor("#000000");
        } else {
          yPosition += 6;
        }
      }

      if (discountAmount > 0) {
        doc
          .font("InvoiceBold")
          .text("Discount:", 370, yPosition, { width: 90, align: "right" })
          .font("InvoiceRegular")
          .fillColor("#047857")
          .text(`- Rs. ${discountAmount.toFixed(2)}`, 470, yPosition, { width: 70, align: "right" })
          .fillColor("#000000");
        yPosition += 14;
        if (order.discountNote && String(order.discountNote).trim()) {
          doc.font("InvoiceRegular").fontSize(8).fillColor("#374151");
          const discountNote = sanitizePdfText(order.discountNote);
          const noteHeight = doc.heightOfString(discountNote, { width: 500, lineGap: 1 });
          doc.text(`Discount note: ${discountNote}`, 50, yPosition, { width: 500, lineGap: 1 });
          yPosition += noteHeight + 6;
          doc.fontSize(10).fillColor("#000000");
        } else {
          yPosition += 6;
        }
      }

      doc
        .moveTo(370, yPosition)
        .lineTo(550, yPosition)
        .stroke();

      yPosition += 10;

      doc
        .font("InvoiceBold")
        .fontSize(12)
        .text(priceConfirmed ? "Total Amount:" : "Approximate Total:", 350, yPosition, { width: 110, align: "right" })
        .text(`Rs. ${Number(order.total).toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });

      if (!priceConfirmed) {
        yPosition += 22;
        doc
          .font("InvoiceRegular")
          .fontSize(8)
          .fillColor("#92400e")
          .text(
            "This invoice shows an estimated total. Final amount will appear here after daily price update (1 day before delivery).",
            50,
            yPosition,
            { width: 500 }
          )
          .fillColor("#000000");
      } else {
        const priceChanges = getInvoicePriceChanges(order.items || []);
        if (priceChanges.length > 0) {
          yPosition += 24;
          doc
            .font("InvoiceBold")
            .fontSize(10)
            .fillColor("#047857")
            .text("How the daily price changed", 50, yPosition, { width: 500 });
          yPosition += 16;
          doc.font("InvoiceRegular").fontSize(9).fillColor("#111827");
          priceChanges.forEach((change) => {
            const direction = change.lineDiff >= 0 ? "increased" : "decreased";
            const cut = change.cutName ? ` (${change.cutName})` : "";
            const line = `${change.name}${cut} — ${change.qtyLabel}: Rs. ${change.oldRate.toFixed(2)} to Rs. ${change.newRate.toFixed(2)} per ${change.unit}. Amount ${direction} by Rs. ${Math.abs(change.lineDiff).toFixed(2)}.`;
            const h = doc.heightOfString(line, { width: 500 });
            doc.text(line, 50, yPosition, { width: 500 });
            yPosition += h + 6;
          });
          if (order.estimatedTotal != null && Math.abs(Number(order.estimatedTotal) - Number(order.total)) > 0.01) {
            doc
              .font("InvoiceBold")
              .text(
                `Booking estimate Rs. ${Number(order.estimatedTotal).toFixed(2)}  ->  Confirmed total Rs. ${Number(order.total).toFixed(2)}`,
                50,
                yPosition,
                { width: 500 }
              );
          }
          doc.fillColor("#000000");
        }
      }

      const footerY = Math.max(700, yPosition + 28);
      doc
        .font("InvoiceRegular")
        .fontSize(10)
        .text(
          `Thank you for your business! For any queries, contact ${SHOP.phone}`,
          50,
          footerY,
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
