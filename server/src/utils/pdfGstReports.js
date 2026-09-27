const PDFDocument = require("pdfkit");
const { resolvePdfFonts } = require("./pdfFonts");

const BLACK = "#000000";
const LINE = 0.6;
const CELL_PAD_X = 3;
const CELL_PAD_Y = 3;
const FOOTER_SPACE = 22;

const amount = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const qtyText = (q, unit) => {
  const n = Number(q || 0);
  if (!n) return "-";
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${shown} ${unit || ""}`.trim();
};

const dmy = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ""));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(ymd || "-");
};

const createDoc = (options) => {
  const doc = new PDFDocument({ ...options, bufferPages: true });
  const { regular, bold } = resolvePdfFonts();
  doc.registerFont("Gst", regular || "Helvetica");
  doc.registerFont("GstBold", bold || regular || "Helvetica-Bold");
  doc.lineWidth(LINE).strokeColor(BLACK).fillColor(BLACK);
  return doc;
};

const collect = (doc) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

const contentBox = (doc) => {
  const m = doc.page.margins;
  return {
    left: m.left,
    right: doc.page.width - m.right,
    width: doc.page.width - m.left - m.right,
    top: m.top,
    bottom: doc.page.height - m.bottom - FOOTER_SPACE
  };
};

/** Bordered business header: trade name, address, GSTIN, then the report title + period. */
const drawReportHeader = (doc, settings, title, range) => {
  const s = settings || {};
  const box = contentBox(doc);
  const address = [s.addressLine1, s.addressLine2, s.city && `${s.city}${s.postalCode ? ` - ${s.postalCode}` : ""}`]
    .filter(Boolean)
    .join(", ");
  const idLine = `GSTIN: ${s.gstin || "Not set"}    State: ${s.stateName || "Tamil Nadu"} (${s.stateCode || "33"})    Registration: ${s.registrationType || "-"}`;

  const innerW = box.width - 2 * 8;
  let y = box.top;
  const startY = y;
  y += 7;
  doc.font("GstBold").fontSize(15).fillColor(BLACK);
  doc.text(s.tradeName || "FISHFRIENDLY", box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString(s.tradeName || "FISHFRIENDLY", { width: innerW }) + 2;

  doc.font("Gst").fontSize(9);
  if (address) {
    doc.text(address, box.left + 8, y, { width: innerW, align: "center" });
    y += doc.heightOfString(address, { width: innerW }) + 1;
  }
  doc.text(idLine, box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString(idLine, { width: innerW }) + 6;
  doc.rect(box.left, startY, box.width, y - startY).stroke();

  const titleTop = y;
  y += 6;
  doc.font("GstBold").fontSize(12);
  doc.text(title.toUpperCase(), box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString(title.toUpperCase(), { width: innerW }) + 2;
  const period = `Period: ${dmy(range?.from)} to ${dmy(range?.to)}`;
  doc.font("Gst").fontSize(9);
  doc.text(period, box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString(period, { width: innerW }) + 6;
  doc.rect(box.left, titleTop, box.width, y - titleTop).stroke();

  return y + 10;
};

/**
 * Draw a fully bordered table. Row height grows with wrapped text so nothing overlaps;
 * header row repeats on every new page.
 * columns: [{ label, weight, align }], rows: string[][], total: { label, span, values }
 */
const drawTable = (doc, { y, columns, rows, total, fontSize = 7.5, headerFontSize }) => {
  const box = contentBox(doc);
  const weightSum = columns.reduce((s, c) => s + c.weight, 0);
  const widths = columns.map((c) => (c.weight / weightSum) * box.width);
  const xs = widths.reduce((acc, w, i) => [...acc, acc[i] + w], [box.left]);
  const hFont = headerFontSize || fontSize;

  const cellHeight = (text, w, font, size) => {
    doc.font(font).fontSize(size);
    return doc.heightOfString(String(text), { width: w - 2 * CELL_PAD_X }) + 2 * CELL_PAD_Y;
  };

  const drawCells = (cells, font, size, top, height, spans) => {
    doc.font(font).fontSize(size).fillColor(BLACK);
    cells.forEach((cell) => {
      doc.rect(cell.x, top, cell.w, height).stroke();
      doc.text(String(cell.text), cell.x + CELL_PAD_X, top + CELL_PAD_Y, {
        width: cell.w - 2 * CELL_PAD_X,
        align: cell.align || "left",
        lineBreak: true
      });
    });
    return spans;
  };

  const headerCells = columns.map((c, i) => ({
    x: xs[i],
    w: widths[i],
    text: c.label,
    align: c.align === "right" ? "right" : c.align === "center" ? "center" : "left"
  }));
  const headerHeight = Math.max(...headerCells.map((c) => cellHeight(c.text, c.w, "GstBold", hFont)));

  const drawHeader = () => {
    doc.lineWidth(LINE * 1.6);
    drawCells(headerCells, "GstBold", hFont, y, headerHeight);
    doc.lineWidth(LINE);
    y += headerHeight;
  };

  const ensureRoom = (height) => {
    if (y + height <= box.bottom) return;
    doc.addPage();
    y = contentBox(doc).top;
    drawHeader();
  };

  if (y + headerHeight + 20 > box.bottom) {
    doc.addPage();
    y = contentBox(doc).top;
  }
  drawHeader();

  rows.forEach((values) => {
    const cells = values.map((v, i) => ({
      x: xs[i],
      w: widths[i],
      text: v === undefined || v === null || v === "" ? "-" : v,
      align: columns[i].align
    }));
    const height = Math.max(...cells.map((c) => cellHeight(c.text, c.w, "Gst", fontSize)));
    ensureRoom(height);
    drawCells(cells, "Gst", fontSize, y, height);
    y += height;
  });

  if (total) {
    const spanW = widths.slice(0, total.span).reduce((s, w) => s + w, 0);
    const cells = [
      { x: xs[0], w: spanW, text: total.label, align: "right" },
      ...total.values.map((v, i) => ({
        x: xs[total.span + i],
        w: widths[total.span + i],
        text: v,
        align: columns[total.span + i].align
      }))
    ];
    const height = Math.max(...cells.map((c) => cellHeight(c.text, c.w, "GstBold", fontSize)));
    ensureRoom(height);
    doc.lineWidth(LINE * 1.6);
    drawCells(cells, "GstBold", fontSize, y, height);
    doc.lineWidth(LINE);
    y += height;
  }

  return y;
};

const drawNote = (doc, y, text, { bold = false, size = 8, gapBefore = 8 } = {}) => {
  const box = contentBox(doc);
  y += gapBefore;
  doc.font(bold ? "GstBold" : "Gst").fontSize(size).fillColor(BLACK);
  const h = doc.heightOfString(text, { width: box.width });
  if (y + h > box.bottom) {
    doc.addPage();
    y = contentBox(doc).top;
  }
  doc.text(text, box.left, y, { width: box.width });
  return y + h;
};

const drawSignature = (doc, y, tradeName) => {
  const box = contentBox(doc);
  if (y + 50 > box.bottom) {
    doc.addPage();
    y = contentBox(doc).top;
  }
  y += 16;
  const w = 200;
  const x = box.right - w;
  doc.font("GstBold").fontSize(9).fillColor(BLACK);
  doc.text(`For ${tradeName || "FISHFRIENDLY"}`, x, y, { width: w, align: "right" });
  doc.moveTo(x + 40, y + 34).lineTo(box.right, y + 34).stroke();
  doc.font("Gst").fontSize(8);
  doc.text("Authorised Signatory", x, y + 38, { width: w, align: "right" });
  return y + 52;
};

/** Page X of Y + generated date on every page (margins zeroed so text doesn't spawn pages). */
const stampFooters = (doc) => {
  const range = doc.bufferedPageRange();
  const generated = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const m = doc.page.margins;
    const savedBottom = m.bottom;
    m.bottom = 0;
    const y = doc.page.height - savedBottom - 12;
    const width = doc.page.width - m.left - m.right;
    doc.font("Gst").fontSize(7.5).fillColor(BLACK);
    doc.text(`Generated: ${generated}`, m.left, y, { width, align: "left", lineBreak: false });
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, m.left, y, {
      width,
      align: "right",
      lineBreak: false
    });
    m.bottom = savedBottom;
  }
};

const generateGstSalesRegisterPdf = async (report) => {
  const doc = createDoc({ size: "A4", layout: "landscape", margin: 24 });
  const done = collect(doc);

  let y = drawReportHeader(doc, report.settings, "GST Sales Register (B2C)", report.range);

  const columns = [
    { label: "S.No", weight: 26, align: "center" },
    { label: "Date", weight: 52, align: "center" },
    { label: "Type", weight: 44, align: "left" },
    { label: "Doc No", weight: 66, align: "left" },
    { label: "Customer", weight: 92, align: "left" },
    { label: "Item", weight: 118, align: "left" },
    { label: "HSN", weight: 38, align: "center" },
    { label: "Qty", weight: 42, align: "right" },
    { label: "Rate %", weight: 32, align: "right" },
    { label: "Taxable (Rs)", weight: 62, align: "right" },
    { label: "CGST (Rs)", weight: 54, align: "right" },
    { label: "SGST (Rs)", weight: 54, align: "right" },
    { label: "Total (Rs)", weight: 64, align: "right" }
  ];

  const sales = report.sales || [];
  const rows = sales.map((r, idx) => [
    String(idx + 1),
    dmy(r.date),
    r.docType,
    r.docNo,
    r.customerName,
    r.productName,
    r.hsn,
    qtyText(r.quantity, r.unit),
    String(r.rate ?? "-"),
    amount(r.taxable),
    amount(r.cgst),
    amount(r.sgst),
    amount(r.gross)
  ]);

  const sum = report.summary || {};
  if (!rows.length) {
    rows.push(["-", "-", "-", "-", "No sales in this period", "-", "-", "-", "-", "0.00", "0.00", "0.00", "0.00"]);
  }

  y = drawTable(doc, {
    y,
    columns,
    rows,
    total: {
      label: `TOTAL (${sum.lines || sales.length} lines)`,
      span: 9,
      values: [amount(sum.taxable), amount(sum.cgst), amount(sum.sgst), amount(sum.gross)]
    }
  });

  y = drawNote(doc, y, "Prices are GST inclusive. Taxable value and CGST / SGST are derived from the inclusive amount (intra-state supply).", { size: 7.5 });
  if (report.disclaimer) y = drawNote(doc, y, `Note: ${report.disclaimer}`, { size: 7.5, gapBefore: 3 });
  drawSignature(doc, y, report.settings?.tradeName);

  stampFooters(doc);
  doc.end();
  return done;
};

const generateGstSummaryPdf = async (report) => {
  const doc = createDoc({ size: "A4", margin: 32 });
  const done = collect(doc);
  const sum = report.summary || {};

  let y = drawReportHeader(doc, report.settings, "GST Summary (B2C, CGST + SGST)", report.range);

  y = drawNote(doc, y, "1. Rate-wise summary", { bold: true, size: 10, gapBefore: 0 });
  y = drawTable(doc, {
    y: y + 4,
    fontSize: 8.5,
    columns: [
      { label: "GST Rate %", weight: 60, align: "center" },
      { label: "Taxable Value (Rs)", weight: 100, align: "right" },
      { label: "CGST (Rs)", weight: 85, align: "right" },
      { label: "SGST (Rs)", weight: 85, align: "right" },
      { label: "Total Tax (Rs)", weight: 85, align: "right" },
      { label: "Invoice Value (Rs)", weight: 100, align: "right" }
    ],
    rows: (report.rateWise || []).map((r) => [
      `${r.rate}%`,
      amount(r.taxable),
      amount(r.cgst),
      amount(r.sgst),
      amount(Number(r.cgst || 0) + Number(r.sgst || 0)),
      amount(r.gross)
    ]),
    total: {
      label: "TOTAL",
      span: 1,
      values: [
        amount(sum.taxable),
        amount(sum.cgst),
        amount(sum.sgst),
        amount(Number(sum.cgst || 0) + Number(sum.sgst || 0)),
        amount(sum.gross)
      ]
    }
  });

  y = drawNote(doc, y, "2. HSN-wise summary", { bold: true, size: 10, gapBefore: 16 });
  y = drawTable(doc, {
    y: y + 4,
    fontSize: 8.5,
    columns: [
      { label: "S.No", weight: 34, align: "center" },
      { label: "HSN", weight: 60, align: "center" },
      { label: "GST Rate %", weight: 56, align: "center" },
      { label: "Taxable Value (Rs)", weight: 96, align: "right" },
      { label: "CGST (Rs)", weight: 80, align: "right" },
      { label: "SGST (Rs)", weight: 80, align: "right" },
      { label: "Invoice Value (Rs)", weight: 96, align: "right" }
    ],
    rows: (report.hsnWise || []).map((r, idx) => [
      String(idx + 1),
      r.hsn,
      `${r.rate}%`,
      amount(r.taxable),
      amount(r.cgst),
      amount(r.sgst),
      amount(r.gross)
    ]),
    total: {
      label: "TOTAL",
      span: 3,
      values: [amount(sum.taxable), amount(sum.cgst), amount(sum.sgst), amount(sum.gross)]
    }
  });

  y = drawNote(doc, y, "3. Other", { bold: true, size: 10, gapBefore: 16 });
  y = drawTable(doc, {
    y: y + 4,
    fontSize: 8.5,
    columns: [
      { label: "Particulars", weight: 300, align: "left" },
      { label: "Amount (Rs)", weight: 120, align: "right" }
    ],
    rows: [
      ["Total sales lines", String(sum.lines || 0)],
      ["Vendor purchases (shop record, not GST invoices)", amount(sum.purchaseTotal)]
    ]
  });

  if (report.disclaimer) y = drawNote(doc, y, `Note: ${report.disclaimer}`, { size: 7.5, gapBefore: 10 });
  drawSignature(doc, y, report.settings?.tradeName);

  stampFooters(doc);
  doc.end();
  return done;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Line values at the product's minimum listed price (tax added on top). Falls back to billed values. */
const minPriceLine = (row) => {
  const qty = Number(row.quantity) || 0;
  const rate = Number(row.rate) || 0;
  if (!(Number(row.minPrice) > 0) || qty <= 0) {
    return {
      taxable: round2(row.taxable),
      cgst: round2(row.cgst),
      sgst: round2(row.sgst),
      gross: round2(row.gross),
      fallback: true
    };
  }
  const taxable = round2(Number(row.minPrice) * qty);
  const tax = round2((taxable * rate) / 100);
  const cgst = round2(tax / 2);
  const sgst = round2(tax - cgst);
  return { taxable, cgst, sgst, gross: round2(taxable + tax), fallback: false };
};

const generateGstPurposePdf = async (report) => {
  const doc = createDoc({ size: "A4", layout: "landscape", margin: 24 });
  const done = collect(doc);

  let y = drawReportHeader(doc, report.settings, "GST Purpose Statement", report.range);

  const columns = [
    { label: "S.No", weight: 28, align: "center" },
    { label: "Date", weight: 56, align: "center" },
    { label: "Type", weight: 48, align: "left" },
    { label: "Item Name", weight: 150, align: "left" },
    { label: "Qty", weight: 48, align: "right" },
    { label: "HSN", weight: 42, align: "center" },
    { label: "Rate %", weight: 36, align: "right" },
    { label: "Taxable (Rs)", weight: 66, align: "right" },
    { label: "CGST (Rs)", weight: 58, align: "right" },
    { label: "SGST (Rs)", weight: 58, align: "right" },
    { label: "Gross (Rs)", weight: 68, align: "right" }
  ];

  const totals = { taxable: 0, cgst: 0, sgst: 0, gross: 0 };
  let fallbackCount = 0;
  const rows = (report.sales || []).map((r, idx) => {
    const v = minPriceLine(r);
    if (v.fallback) fallbackCount += 1;
    totals.taxable += v.taxable;
    totals.cgst += v.cgst;
    totals.sgst += v.sgst;
    totals.gross += v.gross;
    return [
      String(idx + 1),
      dmy(r.date),
      r.docType,
      v.fallback ? `${r.productName} *` : r.productName,
      qtyText(r.quantity, r.unit),
      r.hsn,
      String(r.rate ?? "-"),
      amount(v.taxable),
      amount(v.cgst),
      amount(v.sgst),
      amount(v.gross)
    ];
  });
  if (!rows.length) {
    rows.push(["-", "-", "-", "No sales in this period", "-", "-", "-", "0.00", "0.00", "0.00", "0.00"]);
  }

  y = drawTable(doc, {
    y,
    columns,
    rows,
    total: {
      label: `TOTAL (${(report.sales || []).length} lines)`,
      span: 7,
      values: [
        amount(round2(totals.taxable)),
        amount(round2(totals.cgst)),
        amount(round2(totals.sgst)),
        amount(round2(totals.gross))
      ]
    }
  });

  y = drawNote(
    doc,
    y,
    "Taxable value = item minimum listed price x quantity. CGST / SGST = taxable x rate / 2 each. Gross = taxable + CGST + SGST.",
    { size: 7.5 }
  );
  if (fallbackCount) {
    y = drawNote(
      doc,
      y,
      `* ${fallbackCount} line(s) have no minimum price (e.g. delivery fee); billed values are shown for these.`,
      { size: 7.5, gapBefore: 3 }
    );
  }
  drawSignature(doc, y, report.settings?.tradeName);

  stampFooters(doc);
  doc.end();
  return done;
};

module.exports = {
  generateGstSalesRegisterPdf,
  generateGstSummaryPdf,
  generateGstPurposePdf
};
