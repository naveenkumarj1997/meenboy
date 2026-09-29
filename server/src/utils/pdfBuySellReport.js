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

const CATEGORY_ORDER = ["Fish", "Seafood", "Chicken", "Mutton", "Country Chicken"];

const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

/** Totals for a set of product rows; kg and piece products are kept apart. */
const totalsOf = (rows) => ({
  kg: round3(rows.filter((r) => r.unit === "kg").reduce((s, r) => s + r.soldQty, 0)),
  pcs: round3(rows.filter((r) => r.unit !== "kg").reduce((s, r) => s + r.soldQty, 0)),
  value: rows.reduce((s, r) => s + r.minValue, 0),
  sold: rows.filter((r) => r.soldQty > 0).length
});

const qtyTotalText = (t) =>
  [t.kg ? qtyText(t.kg, "kg") : "", t.pcs ? qtyText(t.pcs, "pcs") : ""].filter(Boolean).join("\n") ||
  "-";

const productRow = (r, i, withCategory) => [
  String(i + 1),
  r.isActive ? r.name : `${r.name} (inactive)`,
  ...(withCategory ? [r.category] : []),
  `${amount(r.minPrice)}/${r.unit}`,
  r.soldQty ? qtyText(r.soldQty, r.unit) : "-",
  r.soldQty ? amount(r.minValue) : "-"
];

const productColumns = (withCategory) => [
  { label: "S.No", weight: 0.55, align: "center" },
  { label: "Product", weight: withCategory ? 3.6 : 4.9 },
  ...(withCategory ? [{ label: "Category", weight: 1.3 }] : []),
  { label: "Price", weight: 1.2, align: "right" },
  { label: "Sold Qty", weight: 1.2, align: "right" },
  { label: "Qty x Price", weight: 1.4, align: "right" }
];

const byValue = (a, b) => b.minValue - a.minValue || a.name.localeCompare(b.name);

const generateBuySellPdf = async (
  report,
  { periodLabel, onlySold = false, byCategory = false } = {}
) => {
  const doc = createDoc({ size: "A4", layout: "portrait", margin: 28 });
  const done = collect(doc);
  const v = report.vendors;
  const products = report.products.filter((r) => !onlySold || r.soldQty > 0);
  const overall = totalsOf(products);

  let y = drawHeader(
    doc,
    byCategory ? "Buy & Sell Details — Category wise" : "Buy & Sell Details",
    report.range,
    periodLabel
  );

  if (!byCategory) {
    y = sectionTitle(doc, y, "Products — Sold quantity x price");
    y = drawTable(doc, {
      y,
      fontSize: 7.5,
      columns: productColumns(true),
      rows: [...products].sort(byValue).map((r, i) => productRow(r, i, true)),
      total: { label: "TOTAL", span: 4, values: [qtyTotalText(overall), amount(overall.value)] }
    });
  } else {
    const present = [...new Set(report.products.map((r) => r.category))];
    const categories = [
      ...CATEGORY_ORDER.filter((c) => present.includes(c)),
      ...present.filter((c) => !CATEGORY_ORDER.includes(c)).sort()
    ];
    const categoryTotals = [];

    categories.forEach((category, idx) => {
      const rows = products.filter((r) => r.category === category).sort(byValue);
      const t = totalsOf(rows);
      categoryTotals.push({ category, count: rows.length, ...t });
      y = sectionTitle(doc, idx === 0 ? y : y + 14, `${category} — Sold quantity x price`);
      y = drawTable(doc, {
        y,
        fontSize: 7.5,
        columns: productColumns(false),
        rows: rows.length
          ? rows.map((r, i) => productRow(r, i, false))
          : [["-", onlySold ? "No products sold" : "No products", "-", "-", "-"]],
        total: {
          label: `${category.toUpperCase()} TOTAL`,
          span: 3,
          values: [qtyTotalText(t), amount(t.value)]
        }
      });
    });

    y = sectionTitle(doc, y + 14, "Overall totals");
    y = drawTable(doc, {
      y,
      fontSize: 8.5,
      columns: [
        { label: "Category", weight: 2.4 },
        { label: "Products sold", weight: 1.3, align: "right" },
        { label: "Sold Qty", weight: 1.5, align: "right" },
        { label: "Qty x Price", weight: 1.7, align: "right" }
      ],
      rows: categoryTotals.map((c) => [
        c.category,
        String(c.sold),
        qtyTotalText(c),
        amount(c.value)
      ]),
      total: {
        label: "OVERALL TOTAL",
        span: 1,
        values: [String(overall.sold), qtyTotalText(overall), amount(overall.value)]
      }
    });
  }

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
