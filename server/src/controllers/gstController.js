const {
  getOrCreateGstSettings,
  getGstReportData
} = require("../utils/gstReport");
const {
  generateGstSalesRegisterPdf,
  generateGstSummaryPdf
} = require("../utils/pdfGstReports");

const getGstSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateGstSettings();
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

const updateGstSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateGstSettings();
    const body = req.body || {};

    const fields = [
      "legalName",
      "tradeName",
      "gstin",
      "stateCode",
      "stateName",
      "addressLine1",
      "addressLine2",
      "city",
      "postalCode",
      "phone",
      "email",
      "notes",
      "deliveryFeeHsn"
    ];
    fields.forEach((key) => {
      if (body[key] !== undefined) settings[key] = String(body[key] || "").trim();
    });

    if (body.gstin !== undefined) {
      settings.gstin = String(body.gstin || "").trim().toUpperCase();
    }
    if (body.pricesInclusive !== undefined) {
      settings.pricesInclusive = Boolean(body.pricesInclusive);
    }
    if (body.registrationType !== undefined) {
      const allowed = ["regular", "composition", "unregistered"];
      const t = String(body.registrationType || "").toLowerCase();
      if (allowed.includes(t)) settings.registrationType = t;
    }
    if (body.deliveryFeeGstRatePercent !== undefined) {
      settings.deliveryFeeGstRatePercent = Math.min(
        28,
        Math.max(0, Number(body.deliveryFeeGstRatePercent) || 0)
      );
    }
    if (Array.isArray(body.categoryRates)) {
      settings.categoryRates = body.categoryRates.map((r) => ({
        category: String(r.category || "").trim(),
        hsnCode: String(r.hsnCode || "").trim(),
        gstRatePercent: Math.min(28, Math.max(0, Number(r.gstRatePercent) || 0))
      }));
    }

    settings.updatedBy = req.user?._id;
    await settings.save();
    res.json({ message: "GST settings saved", settings });
  } catch (error) {
    next(error);
  }
};

const getGstReport = async (req, res, next) => {
  try {
    const data = await getGstReportData(req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const downloadGstSalesRegisterPdf = async (req, res, next) => {
  try {
    const data = await getGstReportData(req.query);
    const buffer = await generateGstSalesRegisterPdf(data);
    const name = `GST-Sales-Register-${data.range.from}_to_${data.range.to}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const downloadGstSummaryPdf = async (req, res, next) => {
  try {
    const data = await getGstReportData(req.query);
    const buffer = await generateGstSummaryPdf(data);
    const name = `GST-Summary-${data.range.from}_to_${data.range.to}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGstSettings,
  updateGstSettings,
  getGstReport,
  downloadGstSalesRegisterPdf,
  downloadGstSummaryPdf
};
