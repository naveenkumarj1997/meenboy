const { pdfTableKit } = require("./pdfGstReports");

const { createDoc, collect, contentBox, drawTable, drawNote, stampFooters, amount, qtyText, dmy } =
  pdfTableKit;

const drawHeader = (doc, title, range, periodLabel) => {
  const box = contentBox(doc);
  const innerW = box.width - 16;
  let y = box.top;
  const top = y;
  y += 7;
  doc.font("GstBold").fontSize(15).fillColor("#000000");
  doc.text("FISHFRIENDLY", box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString("FISHFRIENDLY", { width: innerW }) + 2;
  doc.font("Gst").fontSize(9);
  const address = "177, Kalai Nagar, Thanakkankulam, Madurai, Tamil Nadu - 625006";
  doc.text(address, box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString(address, { width: innerW }) + 6;
  doc.rect(box.left, top, box.width, y - top).stroke();

  const titleTop = y;
  y += 6;
  doc.font("GstBold").fontSize(12);
  doc.text(title.toUpperCase(), box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString(title.toUpperCase(), { width: innerW }) + 2;
  const period = `${periodLabel ? `${periodLabel} · ` : ""}Period: ${dmy(range.from)} to ${dmy(range.to)}`;
  doc.font("Gst").fontSize(9);
  doc.text(period, box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString(period, { width: innerW }) + 6;
  doc.rect(box.left, titleTop, box.width, y - titleTop).stroke();
  return y + 10;
};

const sectionTitle = (doc, y, text) => {
  const box = contentBox(doc);
  if (y + 60 > box.bottom) {
    doc.addPage();
    y = contentBox(doc).top;
  }
  doc.font("GstBold").fontSize(10.5).fillColor("#000000");
  doc.text(text, box.left, y, { width: box.width });
  return y + doc.heightOfString(text, { width: box.width }) + 4;
};

const generateBuySellPdf = async (report, { periodLabel, onlySold = false } = {}) => {
  const doc = createDoc({ size: "A4", layout: "portrait", margin: 28 });
  const done = collect(doc);
  const s = report.summary;
  const v = report.vendors;

  let y = drawHeader(doc, "Buy & Sell Details", report.range, periodLabel);

  y = sectionTitle(doc, y, "Products — Sold quantity x price");
  const sorted = report.products.filter((r) => !onlySold || r.soldQty > 0).sort(
    (a, b) => b.minValue - a.minValue || a.name.localeCompare(b.name)
  );
  y = drawTable(doc, {
    y,
    fontSize: 7.5,
    columns: [
      { label: "S.No", weight: 0.55, align: "center" },
      { label: "Product", weight: 3.6 },
      { label: "Category", weight: 1.3 },
      { label: "Price", weight: 1.2, align: "right" },
      { label: "Sold Qty", weight: 1.2, align: "right" },
      { label: "Qty x Price", weight: 1.4, align: "right" }
    ],
    rows: sorted.map((r, i) => [
      String(i + 1),
      r.isActive ? r.name : `${r.name} (inactive)`,
      r.category,
      `${amount(r.minPrice)}/${r.unit}`,
      r.soldQty ? qtyText(r.soldQty, r.unit) : "-",
      r.soldQty ? amount(r.minValue) : "-"
    ]),
    total: {
      label: "TOTAL",
      span: 4,
      values: [
        [
          s.totalKgSold ? qtyText(s.totalKgSold, "kg") : "",
          s.totalPiecesSold ? qtyText(s.totalPiecesSold, "pcs") : ""
        ]
          .filter(Boolean)
          .join("\n") || "-",
        amount(s.totalMinValue)
      ]
    }
  });

  if (report.unmatched.length) {
    y = drawNote(
      doc,
      y,
      `Items sold that are not in the product list (not counted above): ${report.unmatched
        .map((u) => `${u.name} ${qtyText(u.soldQty, u.unit)}`)
        .join(", ")}`,
      { size: 7.5 }
    );
  }

  y = sectionTitle(doc, y + 14, "Vendor purchases & settlements");
  y = drawTable(doc, {
    y,
    fontSize: 8.5,
    columns: [
      { label: "Vendor", weight: 2.4 },
      { label: "Purchases", weight: 1.5, align: "right" },
      { label: "Settled", weight: 1.5, align: "right" },
      { label: "Balance", weight: 1.5, align: "right" }
    ],
    rows: v.totals.map((t) => [t.label, amount(t.purchased), amount(t.settled), amount(t.balance)]),
    total: {
      label: "TOTAL",
      span: 1,
      values: [amount(v.totalPurchased), amount(v.totalSettled), amount(v.totalBalance)]
    }
  });

  stampFooters(doc, { showGenerated: false });
  doc.end();
  return done;
};

module.exports = { generateBuySellPdf };
