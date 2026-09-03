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

const formatAddress = (address) => {
  if (!address) return "-";
  const parts = [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(", "),
    address.postalCode
  ].filter((p) => p && String(p).trim());
  return parts.join(", ") || "-";
};

/** One item per line for the Items column */
const formatItemsMultiline = (items = []) => {
  if (!items.length) return "-";
  return items
    .map((item, i) => {
      const qty = item.quantity != null ? item.quantity : "";
      const unit = item.unit || "kg";
      const cut = item.cutName ? ` (${item.cutName})` : "";
      return `${i + 1}. ${item.productName}${cut} - ${qty}${unit}`;
    })
    .join("\n");
};

/**
 * Generate a delivery list PDF for one partner or all partners on one date.
 * @returns {Promise<{ filePath: string, fileName: string }>}
 */
const generatePartnerDayReport = ({ partner, date, assignments, allPartners = false }) => {
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(__dirname, "../../uploads/reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const partnerSlug = allPartners
        ? "ALL"
        : (partner?.name || "partner").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
      const fileName = `Delivery-${date}-${partnerSlug}.pdf`;
      const filePath = path.join(reportsDir, fileName);

      const fonts = resolvePdfFonts();
      if (!fonts.regular) {
        return reject(new Error("No Unicode font found for report PDF."));
      }

      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        layout: allPartners ? "landscape" : "portrait"
      });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      doc.registerFont("ReportRegular", fonts.regular);
      doc.registerFont("ReportBold", fonts.bold || fonts.regular);

      const pageWidth = doc.page.width;
      const left = 36;
      const right = pageWidth - 36;
      const contentWidth = right - left;
      const borderColor = "#334155";
      const headerBg = "#0f766e";
      const altRowBg = "#f1f5f9";
      const padX = 3;
      const padY = 4;

      doc
        .font("ReportBold")
        .fontSize(18)
        .fillColor("#0f766e")
        .text(SHOP.name, left, 32, { width: contentWidth });

      doc
        .font("ReportRegular")
        .fontSize(9)
        .fillColor("#334155")
        .text(SHOP.addressLine1, left, 56)
        .text(`${SHOP.addressLine2}, ${SHOP.cityLine}`)
        .text(`Phone: ${SHOP.phone}  |  ${SHOP.email}`);

      doc
        .moveDown(1)
        .font("ReportBold")
        .fontSize(14)
        .fillColor("#0f172a")
        .text(allPartners ? "Overall Delivery Day Report" : "Delivery Partner Day Report");

      doc
        .moveDown(0.3)
        .font("ReportRegular")
        .fontSize(10)
        .fillColor("#1e293b")
        .text(allPartners ? "Partner: ALL" : `Partner: ${partner?.name || "-"}`);

      if (!allPartners) {
        doc.text(`Phone: ${partner?.phone || "-"}`);
      }

      doc
        .text(`Delivery Date: ${date}`)
        .text(`Total Orders: ${assignments.length}`)
        .text(`Generated: ${new Date().toLocaleString("en-IN")}`);

      doc.moveDown(0.6);

      const cols = allPartners
        ? [
            { key: "sno", label: "#", width: 20 },
            { key: "order", label: "Order", width: 42 },
            { key: "partner", label: "Partner", width: 68 },
            { key: "customer", label: "Customer", width: 100 },
            { key: "phone", label: "Phone", width: 62 },
            { key: "items", label: "Items", width: 130 },
            { key: "slot", label: "Slot", width: 48 },
            { key: "amount", label: "Amount", width: 50 },
            { key: "pay", label: "Pay", width: 42 },
            { key: "link", label: "Link", width: 58 }
          ]
        : [
            { key: "sno", label: "#", width: 20 },
            { key: "order", label: "Order", width: 42 },
            { key: "customer", label: "Customer", width: 85 },
            { key: "phone", label: "Phone", width: 58 },
            { key: "items", label: "Items", width: 118 },
            { key: "slot", label: "Slot", width: 44 },
            { key: "amount", label: "Amount", width: 46 },
            { key: "pay", label: "Pay", width: 40 },
            { key: "link", label: "Link", width: 55 }
          ];

      const drawCellBorders = (yPos, rowHeight) => {
        // Outer rectangle
        doc
          .strokeColor(borderColor)
          .lineWidth(0.8)
          .rect(left, yPos, contentWidth, rowHeight)
          .stroke();

        // Vertical column dividers
        let x = left;
        for (let i = 0; i < cols.length - 1; i++) {
          x += cols[i].width;
          doc
            .moveTo(x, yPos)
            .lineTo(x, yPos + rowHeight)
            .stroke();
        }
      };

      const drawTableHeader = (yPos) => {
        const headerH = 22;
        doc.rect(left, yPos, contentWidth, headerH).fill(headerBg);

        let x = left;
        doc.font("ReportBold").fontSize(8).fillColor("#ffffff");
        cols.forEach((col) => {
          doc.text(col.label, x + padX, yPos + 7, {
            width: col.width - padX * 2,
            align: "left"
          });
          x += col.width;
        });

        drawCellBorders(yPos, headerH);
        return yPos + headerH;
      };

      let y = drawTableHeader(doc.y);
      doc.font("ReportRegular").fontSize(8).fillColor("#0f172a");

      const ensureSpace = (needed) => {
        if (y + needed > doc.page.height - 40) {
          doc.addPage();
          y = drawTableHeader(32);
          doc.font("ReportRegular").fontSize(8).fillColor("#0f172a");
        }
      };

      let totalAmount = 0;

      assignments.forEach((assignment, index) => {
        const order = assignment.order || {};
        const customer = order.customer || {};
        const address = order.address || {};
        const itemsText = formatItemsMultiline(order.items || []);
        const addressText = formatAddress(address);
        const amount = Number(order.total || 0);
        totalAmount += amount;

        const payLabel = (order.paymentStatus || "pending").replace(/_/g, " ");
        const phone = address.phone || customer.phone || "-";
        const alternatePhone = address.alternatePhone || customer.alternatePhone || "";
        const phoneDisplay = alternatePhone ? `${phone}\nAlt: ${alternatePhone}` : String(phone);
        const partnerName =
          assignment.deliveryPartner?.name ||
          assignment.partnerName ||
          "Unassigned";

        const customerBlock = `${customer.name || "Guest"}\n${addressText}`;
        const mapUrl = String(order.mapUrl || customer.mapUrl || "").trim();
        const hasLink = !!mapUrl;
        const linkLabel = hasLink ? "Open Map" : "No link";

        const values = allPartners
          ? [
              String(index + 1),
              `#${String(order._id || "").slice(-6).toUpperCase()}`,
              partnerName,
              customerBlock,
              String(phoneDisplay),
              itemsText,
              String(order.deliveryTime || "-"),
              `Rs ${amount.toFixed(2)}`,
              payLabel,
              linkLabel
            ]
          : [
              String(index + 1),
              `#${String(order._id || "").slice(-6).toUpperCase()}`,
              customerBlock,
              String(phoneDisplay),
              itemsText,
              String(order.deliveryTime || "-"),
              `Rs ${amount.toFixed(2)}`,
              payLabel,
              linkLabel
            ];

        doc.font("ReportRegular").fontSize(8);
        const heights = values.map((val, i) =>
          doc.heightOfString(String(val), {
            width: cols[i].width - padX * 2,
            lineGap: 2
          })
        );
        const rowHeight = Math.max(...heights, 18) + padY * 2;

        ensureSpace(rowHeight + 2);

        // Alternating row background
        if (index % 2 === 0) {
          doc.rect(left, y, contentWidth, rowHeight).fill(altRowBg);
        }

        // Cell text
        let x = left;
        const textY = y + padY;
        cols.forEach((col, i) => {
          const isLinkCol = col.key === "link";
          doc
            .fillColor(isLinkCol && hasLink ? "#0f766e" : "#0f172a")
            .font("ReportRegular")
            .fontSize(8)
            .text(values[i], x + padX, textY, {
              width: col.width - padX * 2,
              height: rowHeight - padY * 2,
              align: col.key === "amount" || col.key === "sno" ? "center" : "left",
              lineGap: 2,
              underline: isLinkCol && hasLink
            });

          if (isLinkCol && hasLink) {
            try {
              doc.link(x + padX, textY, col.width - padX * 2, 12, mapUrl);
            } catch {
              // ignore invalid URL for clickable annotation
            }
          }

          x += col.width;
        });

        doc.x = left;
        doc.y = y + rowHeight;

        // Full cell borders for this row
        drawCellBorders(y, rowHeight);

        y += rowHeight;
      });

      if (assignments.length === 0) {
        ensureSpace(40);
        const emptyH = 36;
        doc.rect(left, y, contentWidth, emptyH).strokeColor(borderColor).lineWidth(0.8).stroke();
        doc
          .font("ReportRegular")
          .fontSize(11)
          .fillColor("#64748b")
          .text("No orders found for the selected date.", left, y + 12, {
            width: contentWidth,
            align: "center"
          });
        y += emptyH;
      }

      ensureSpace(50);
      y += 14;
      doc
        .font("ReportBold")
        .fontSize(11)
        .fillColor("#0f172a")
        .text(`Grand Total: Rs ${totalAmount.toFixed(2)}`, left, y, {
          width: contentWidth,
          align: "right"
        });

      y += 24;
      doc
        .font("ReportRegular")
        .fontSize(9)
        .fillColor("#64748b")
        .text("Use this sheet as the delivery checklist for the day.", left, y, {
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

module.exports = { generatePartnerDayReport };
