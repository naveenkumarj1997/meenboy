const { buildBuySellReport } = require("../utils/buySellReport");
const { generateBuySellPdf } = require("../utils/pdfBuySellReport");
const { istYmd } = require("../utils/geoDistance");

const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

const parseRange = (query) => {
  const today = istYmd();
  const to = isYmd(query.to) ? query.to : today;
  const from = isYmd(query.from) ? query.from : `${to.slice(0, 7)}-01`;
  if (from > to) {
    const err = new Error("From date must be on or before To date.");
    err.statusCode = 400;
    throw err;
  }
  return { from, to };
};

// @route GET /api/buy-sell?from=&to=
const getBuySellReport = async (req, res, next) => {
  try {
    const report = await buildBuySellReport(parseRange(req.query));
    res.json(report);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  }
};

// @route GET /api/buy-sell/pdf?from=&to=&label=
const downloadBuySellPdf = async (req, res, next) => {
  try {
    const range = parseRange(req.query);
    const report = await buildBuySellReport(range);
    const label = String(req.query.label || "").slice(0, 40);
    const buffer = await generateBuySellPdf(report, {
      periodLabel: label,
      onlySold: req.query.onlySold === "true",
      byCategory: req.query.layout === "category"
    });
    const suffix = req.query.layout === "category" ? "-CategoryWise" : "";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="BuySell${suffix}-${range.from}_to_${range.to}.pdf"`
    );
    res.send(buffer);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  }
};

module.exports = { getBuySellReport, downloadBuySellPdf };
