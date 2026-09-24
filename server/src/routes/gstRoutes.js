const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getGstSettings,
  updateGstSettings,
  getGstReport,
  downloadGstSalesRegisterPdf,
  downloadGstSummaryPdf
} = require("../controllers/gstController");

const router = express.Router();

router.use(protect, authorizeRoles("admin"), authorizeAdminSections("gst"));

router.get("/settings", getGstSettings);
router.put("/settings", updateGstSettings);
router.get("/report", getGstReport);
router.get("/report/sales-register.pdf", downloadGstSalesRegisterPdf);
router.get("/report/summary.pdf", downloadGstSummaryPdf);

module.exports = router;
