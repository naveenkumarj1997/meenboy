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

const WEIGHT_QTY_LABELS = {
  0.25: "250g",
  0.5: "500g",
  1: "1kg",
  1.5: "1.5kg",
  2: "2kg"
};

const formatQty = (item) => {
  const qty = Number(item.quantity);
  const unit = String(item.unit || "kg").toLowerCase();
  if (unit !== "kg") {
    const label = unit === "piece" ? (qty === 1 ? "piece" : "pieces") : unit;
    return `${qty} ${label}`;
  }
  const knownKey = Object.keys(WEIGHT_QTY_LABELS).find((k) => Math.abs(Number(k) - qty) < 0.001);
  if (knownKey) return WEIGHT_QTY_LABELS[knownKey];
  if (qty > 0 && qty < 1) return `${Math.round(qty * 1000)}g`;
  const kg = Math.round(qty * 100) / 100;
  return `${kg}kg`;
};

const formatItemPriceLine = (item, dailyPriceUpdated) => {
  const cut = item.cutName ? ` (${item.cutName})` : "";
  const qty = formatQty(item);
  const unit = item.unit || "kg";
  const dailyRate = Number(item.unitPrice || 0);
  const bookedRate = Number(item.estimatedUnitPrice ?? item.unitPrice ?? 0);
  const lineTotal = Number(item.totalPrice || 0);

  let pricePart;
  if (dailyPriceUpdated) {
    if (Math.abs(dailyRate - bookedRate) > 0.01) {
      pricePart = `Daily ₹${dailyRate.toFixed(0)}/${unit} (booked ₹${bookedRate.toFixed(0)})`;
    } else {
      pricePart = `Daily ₹${dailyRate.toFixed(0)}/${unit}`;
    }
  } else {
    pricePart = `Approx ₹${dailyRate.toFixed(0)}/${unit}`;
  }

  let line = `${item.productName}${cut} · ${qty} · ${pricePart} · Line ₹${lineTotal.toFixed(0)}`;
  if (item.notes?.trim()) {
    line += ` · Note: ${item.notes.trim()}`;
  }
  return line;
};

const formatItemsBlock = (order) => {
  const items = order.items || [];
  if (!items.length) return "-";

  const lines = items.map((item, idx) => `${idx + 1}. ${formatItemPriceLine(item, order.dailyPriceUpdated)}`);

  const orderNotes = String(order.customerNotes || "").trim();
  if (orderNotes) {
    const itemNoteTexts = items.map((i) => String(i.notes || "").trim()).filter(Boolean);
    const notesAlreadyOnItems =
      itemNoteTexts.length > 0 &&
      itemNoteTexts.every((n) => orderNotes.includes(n));
    if (!notesAlreadyOnItems) {
      lines.push(`Cutting / cleaning: ${orderNotes}`);
    }
  }

  return lines.join("\n");
};

const formatNotesBlock = (order) => {
  const itemNotes = (order.items || [])
    .map((item) => {
      const n = String(item.notes || "").trim();
      if (!n) return "";
      return `${item.productName}: ${n}`;
    })
    .filter(Boolean);

  const orderNotes = String(order.customerNotes || "").trim();
  if (!itemNotes.length && !orderNotes) return "-";
  if (itemNotes.length) return itemNotes.join("\n");
  return orderNotes;
};

const formatMapLink = (mapUrl) => {
  const url = String(mapUrl || "").trim();
  if (!url) return "-";
  return url;
};

const generateAllOrdersReport = ({ date, orders, stats }) => {
  const orderRows = orders || [];

  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(__dirname, "../../uploads/reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `AllOrders-${date}.pdf`;
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
      const padY = 4;

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
        .text("All Orders (Internal)", left, 68);
      doc
        .font("ReportRegular")
        .fontSize(10)
        .fillColor("#334155")
        .text(`Delivery Date: ${date}`)
        .text(
          `Orders: ${stats?.orderCount || 0} · Line items: ${stats?.itemCount || 0} · One row per customer order`
        )
        .text(`Generated: ${new Date().toLocaleString("en-IN")}`);

      const cols = [
        { key: "sno", label: "#", width: 22 },
        { key: "order", label: "Order", width: 38 },
        { key: "source", label: "Src", width: 32 },
        { key: "customer", label: "Customer", width: 64 },
        { key: "phone", label: "Phone", width: 54 },
        { key: "address", label: "Address", width: 88 },
        { key: "map", label: "Map Link", width: 72 },
        { key: "time", label: "Slot", width: 48 },
        { key: "items", label: "Items & Daily Price", width: 168 },
        { key: "notes", label: "Notes", width: 64 },
        { key: "status", label: "Status", width: 44 },
        { key: "partner", label: "Partner", width: 50 },
        { key: "total", label: "Total", width: 38 }
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

      if (!orderRows.length) {
        ensureSpace(32);
        doc.rect(left, y, contentWidth, 28).strokeColor(borderColor).stroke();
        doc
          .font("ReportRegular")
          .fontSize(10)
          .fillColor("#64748b")
          .text("No orders for the selected delivery date.", left, y + 8, {
            width: contentWidth,
            align: "center"
          });
      } else {
        orderRows.forEach((order, index) => {
          const sourceLabel = order.bookingSource === "manual" ? "Manual" : "Web";
          const itemsBlock = formatItemsBlock(order);
          const notesBlock = formatNotesBlock(order);
          const mapBlock = formatMapLink(order.mapUrl);

          const values = [
            String(index + 1),
            `#${String(order.orderId).slice(-6).toUpperCase()}`,
            sourceLabel,
            String(order.customerName || "-"),
            String(
              order.alternatePhone
                ? `${order.phone || "-"}\nAlt: ${order.alternatePhone}`
                : order.phone || "-"
            ),
            String(order.address || "-"),
            mapBlock,
            String(order.deliveryTime || "-"),
            itemsBlock,
            notesBlock,
            String(order.status || "-").replace(/_/g, " "),
            String(order.partnerName || "-"),
            `₹${Number(order.total || 0).toFixed(0)}`
          ];

          doc.font("ReportRegular").fontSize(7);
          const heights = values.map((val, i) =>
            doc.heightOfString(String(val), { width: cols[i].width - padX * 2, lineGap: 1 })
          );
          const rowHeight = Math.max(...heights, 16) + padY * 2;
          ensureSpace(rowHeight + 2);

          if (index % 2 === 0) {
            doc.rect(left, y, contentWidth, rowHeight).fill(altRowBg);
          }

          let x = left;
          values.forEach((val, i) => {
            const isMap = cols[i].key === "map";
            doc
              .fillColor(isMap && val !== "-" ? "#0f766e" : "#0f172a")
              .font("ReportRegular")
              .fontSize(7)
              .text(val, x + padX, y + padY, {
                width: cols[i].width - padX * 2,
                height: rowHeight - padY * 2,
                lineGap: 1,
                link: isMap && val !== "-" ? val : null
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

module.exports = { generateAllOrdersReport };
