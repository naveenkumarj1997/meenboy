const { pdfTableKit } = require("./pdfGstReports");

const { createDoc, collect, contentBox, drawTable, drawNote, stampFooters, amount, qtyText, dmy } =
  pdfTableKit;

const SHOP_ADDRESS = "177, Kalai Nagar, Thanakkankulam, Madurai, Tamil Nadu - 625006";

const labelValueBlock = (doc, x, y, width, pairs) => {
  pairs.forEach(([label, value]) => {
    if (!value) return;
    doc.font("GstBold").fontSize(9).fillColor("#000000");
    doc.text(`${label}: `, x, y, { width, continued: true });
    doc.font("Gst").text(String(value));
    y = doc.y + 2;
  });
  return y;
};

/**
 * quote: { number, date, validTill, customerName, phone, address, eventName, eventDate,
 *          items: [{ name, qty, unit, rate, amount }], subtotal, discount, deliveryCharge, total,
 *          notes, contactPhone }
 */
const generateQuotationPdf = async (quote) => {
  const doc = createDoc({ size: "A4", layout: "portrait", margin: 28 });
  const done = collect(doc);
  const box = contentBox(doc);
  const innerW = box.width - 16;

  let y = box.top;
  const top = y;
  y += 7;
  doc.font("GstBold").fontSize(15).fillColor("#000000");
  doc.text("FISHFRIENDLY", box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString("FISHFRIENDLY", { width: innerW }) + 2;
  doc.font("Gst").fontSize(9);
  const contact = quote.contactPhone ? `${SHOP_ADDRESS} · Ph: ${quote.contactPhone}` : SHOP_ADDRESS;
  doc.text(contact, box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString(contact, { width: innerW }) + 6;
  doc.rect(box.left, top, box.width, y - top).stroke();

  const titleTop = y;
  y += 6;
  doc.font("GstBold").fontSize(12);
  doc.text("QUOTATION", box.left + 8, y, { width: innerW, align: "center" });
  y += doc.heightOfString("QUOTATION", { width: innerW }) + 6;
  doc.rect(box.left, titleTop, box.width, y - titleTop).stroke();

  const infoTop = y;
  const half = box.width / 2;
  const leftEnd = labelValueBlock(doc, box.left + 8, y + 6, half - 16, [
    ["To", quote.customerName],
    ["Phone", quote.phone],
    ["Address", quote.address],
    ["Event", quote.eventName],
    ["Event date", quote.eventDate ? dmy(quote.eventDate) : ""]
  ]);
  const rightEnd = labelValueBlock(doc, box.left + half + 8, y + 6, half - 16, [
    ["Quotation No", quote.number],
    ["Date", dmy(quote.date)],
    ["Valid till", quote.validTill ? dmy(quote.validTill) : ""]
  ]);
  y = Math.max(leftEnd, rightEnd) + 4;
  doc.rect(box.left, infoTop, box.width, y - infoTop).stroke();
  doc.moveTo(box.left + half, infoTop).lineTo(box.left + half, y).stroke();
  y += 12;

  const extraRows = [];
  if (quote.discount > 0) extraRows.push(["", "Discount", "", "", `- ${amount(quote.discount)}`]);
  if (quote.deliveryCharge > 0) {
    extraRows.push(["", "Delivery charge", "", "", amount(quote.deliveryCharge)]);
  }

  y = drawTable(doc, {
    y,
    fontSize: 9,
    columns: [
      { label: "S.No", weight: 0.6, align: "center" },
      { label: "Item", weight: 4.4 },
      { label: "Qty", weight: 1.3, align: "right" },
      { label: "Rate", weight: 1.4, align: "right" },
      { label: "Amount", weight: 1.6, align: "right" }
    ],
    rows: [
      ...quote.items.map((it, i) => [
        String(i + 1),
        it.name,
        qtyText(it.qty, it.unit),
        `${amount(it.rate)}/${it.unit}`,
        amount(it.amount)
      ]),
      ...(extraRows.length ? [["", "Subtotal", "", "", amount(quote.subtotal)], ...extraRows] : [])
    ],
    total: { label: "TOTAL", span: 4, values: [amount(quote.total)] }
  });

  const terms = [
    quote.notes,
    "Prices are for cleaned and cut items as listed. Final bill is as per actual weight at delivery.",
    "Fish and meat prices change daily; this quotation is valid only till the date shown above."
  ].filter(Boolean);
  y = drawNote(doc, y + 6, `Notes: ${terms.join(" ")}`, { size: 8.5 });

  doc.font("Gst").fontSize(9).fillColor("#000000");
  doc.text("For FISHFRIENDLY", box.left, y + 30, { width: box.width - 8, align: "right" });

  stampFooters(doc, { showGenerated: false });
  doc.end();
  return done;
};

module.exports = { generateQuotationPdf };
