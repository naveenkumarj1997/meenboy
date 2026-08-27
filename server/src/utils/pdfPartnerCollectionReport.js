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

const formatPaymentLabel = (method) => {
  switch (method) {
    case "cash":
      return "COD Full";
    case "upi":
      return "UPI Full";
    case "partial_cash":
      return "COD Partial";
    case "partial_upi":
      return "UPI Partial";
    case "pay_later":
      return "Pay Later";
    case "none":
      return "Paid/None";
    default:
      return method || "-";
  }
};

const formatItems = (items = []) => {
  if (!items.length) return "-";
  return items
    .map((item, i) => {
      const cut = item.cutName ? ` (${item.cutName})` : "";
      const qty = item.quantity != null ? item.quantity : "";
      const unit = item.unit || "kg";
      return `${i + 1}. ${item.productName || "Item"}${cut} - ${qty}${unit}`;
    })
    .join("\n");
};

const collectionKind = (method) => {
  if (method === "cash" || method === "partial_cash") return "COD";
  if (method === "upi" || method === "partial_upi") return "UPI";
  return "-";
};

/**
 * PDF for admin delivery amount collection (one partner, one date).
 */
const generatePartnerCollectionReport = ({ partner, date, assignments, salaryAmount = 0, totals }) => {
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(__dirname, "../../uploads/reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const partnerSlug = (partner?.name || "partner").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
      const fileName = `Collection-${date}-${partnerSlug}.pdf`;
      const filePath = path.join(reportsDir, fileName);

      const fonts = resolvePdfFonts();
      if (!fonts.regular) {
        return reject(new Error("No Unicode font found for collection report PDF."));
      }

      const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      doc.registerFont("ReportRegular", fonts.regular);
      doc.registerFont("ReportBold", fonts.bold || fonts.regular);

      const left = 36;
      const right = doc.page.width - 36;
      const contentWidth = right - left;
      const borderColor = "#334155";
      const headerBg = "#0f766e";

      doc
        .font("ReportBold")
        .fontSize(16)
        .fillColor("#0f766e")
        .text(SHOP.name, left, 32, { width: contentWidth });

      doc
        .font("ReportRegular")
        .fontSize(9)
        .fillColor("#334155")
        .text(SHOP.addressLine1, left, 52)
        .text(`${SHOP.addressLine2}, ${SHOP.cityLine}`)
        .text(`Phone: ${SHOP.phone}`);

      doc
        .moveDown(0.8)
        .font("ReportBold")
        .fontSize(13)
        .fillColor("#0f172a")
        .text("Delivery Amount Collection Report");

      doc
        .font("ReportRegular")
        .fontSize(10)
        .fillColor("#1e293b")
        .text(`Partner: ${partner?.name || "-"}`)
        .text(`Phone: ${partner?.phone || "-"}`)
        .text(`Delivery Date: ${date}`)
        .text(`Generated: ${new Date().toLocaleString("en-IN")}`);

      doc.moveDown(0.5);

      const cols = [
        { key: "sno", label: "#", width: 22 },
        { key: "customer", label: "Customer", width: 90 },
        { key: "order", label: "Order", width: 42 },
        { key: "items", label: "Items", width: 120 },
        { key: "slot", label: "Slot", width: 44 },
        { key: "total", label: "Total", width: 48 },
        { key: "collected", label: "Collected", width: 52 },
        { key: "mode", label: "Mode", width: 38 },
        { key: "type", label: "Full/Part", width: 44 },
        { key: "pending", label: "Pending", width: 48 },
        { key: "status", label: "Status", width: 52 }
      ];

      const drawRowBorder = (yPos, rowHeight) => {
        doc.strokeColor(borderColor).lineWidth(0.6).rect(left, yPos, contentWidth, rowHeight).stroke();
        let x = left;
        for (let i = 0; i < cols.length - 1; i++) {
          x += cols[i].width;
          doc.moveTo(x, yPos).lineTo(x, yPos + rowHeight).stroke();
        }
      };

      const drawHeader = (yPos) => {
        const h = 20;
        doc.rect(left, yPos, contentWidth, h).fill(headerBg);
        let x = left;
        doc.font("ReportBold").fontSize(7.5).fillColor("#ffffff");
        cols.forEach((col) => {
          doc.text(col.label, x + 2, yPos + 6, { width: col.width - 4 });
          x += col.width;
        });
        drawRowBorder(yPos, h);
        return yPos + h;
      };

      let y = drawHeader(doc.y);
      doc.font("ReportRegular").fontSize(7.5).fillColor("#0f172a");

      const ensureSpace = (needed) => {
        if (y + needed > doc.page.height - 80) {
          doc.addPage();
          y = drawHeader(32);
          doc.font("ReportRegular").fontSize(7.5).fillColor("#0f172a");
        }
      };

      assignments.forEach((assignment, index) => {
        const order = assignment.order || {};
        const customer = order.customer || {};
        const orderTotal = Number(order.total || 0);
        const collected =
          assignment.status === "delivered" ? Number(assignment.paymentCollected || 0) : 0;
        const pending =
          assignment.status === "delivered" ? Math.max(0, orderTotal - collected) : orderTotal;
        const method = assignment.paymentMethod;
        const isPartial = method === "partial_cash" || method === "partial_upi";
        const isFull = method === "cash" || method === "upi";

        const rowTexts = [
          String(index + 1),
          customer.name || "Guest",
          `#${String(order._id || "").slice(-6).toUpperCase()}`,
          formatItems(order.items || []),
          order.deliveryTime || "-",
          `₹${orderTotal.toFixed(2)}`,
          assignment.status === "delivered" ? `₹${collected.toFixed(2)}` : "-",
          assignment.status === "delivered" ? collectionKind(method) : "-",
          assignment.status === "delivered"
            ? isFull
              ? "Full"
              : isPartial
                ? "Partial"
                : formatPaymentLabel(method)
            : "-",
          `₹${pending.toFixed(2)}`,
          String(assignment.status || "").replace(/_/g, " ")
        ];

        const cellHeights = rowTexts.map((text, i) =>
          doc.heightOfString(text, { width: cols[i].width - 4 })
        );
        const rowHeight = Math.max(18, ...cellHeights) + 8;

        ensureSpace(rowHeight);

        let x = left;
        rowTexts.forEach((text, i) => {
          doc.text(text, x + 2, y + 4, { width: cols[i].width - 4, align: "left" });
          x += cols[i].width;
        });
        drawRowBorder(y, rowHeight);
        y += rowHeight;
      });

      y += 12;
      ensureSpace(90);

      doc
        .font("ReportBold")
        .fontSize(10)
        .fillColor("#0f172a")
        .text("Day Summary", left, y);

      y += 16;
      doc.font("ReportRegular").fontSize(9).fillColor("#1e293b");
      const summaryLines = [
        `Total Deliveries: ${totals.deliveryCount} (${totals.deliveredCount} delivered)`,
        `Total COD Collected: ₹${totals.totalCod.toFixed(2)}`,
        `Total UPI Collected: ₹${totals.totalUpi.toFixed(2)}`,
        `Overall Collected: ₹${totals.totalCollected.toFixed(2)}`,
        `Order Totals: ₹${totals.totalOrderAmount.toFixed(2)}`,
        `Pending Amount: ₹${totals.totalPending.toFixed(2)}`,
        `Partner Salary (paid): ₹${Number(salaryAmount || 0).toFixed(2)}`,
        `Net after salary (Collected − Salary): ₹${(totals.totalCollected - Number(salaryAmount || 0)).toFixed(2)}`
      ];
      summaryLines.forEach((line) => {
        doc.text(line, left, y);
        y += 14;
      });

      doc.end();
      writeStream.on("finish", () => resolve({ filePath, fileName }));
      writeStream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generatePartnerCollectionReport };
