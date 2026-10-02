const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getToolsSettings,
  updateToolsSettings,
  getToolProducts,
  getDayOrders,
  getPendingCustomers,
  getPurchasePlan,
  getRoutes
} = require("../controllers/toolsController");
const {
  getDuplicateCustomers,
  mergeDuplicateCustomers,
  exportCsv,
  quotationPdf
} = require("../controllers/toolsDataController");

const router = express.Router();

router.use(protect, authorizeRoles("admin"), authorizeAdminSections("tools"));

router.get("/settings", getToolsSettings);
router.put("/settings", updateToolsSettings);
router.get("/products", getToolProducts);
router.get("/day-orders", getDayOrders);
router.get("/pending-customers", getPendingCustomers);
router.get("/purchase-plan", getPurchasePlan);
router.get("/routes", getRoutes);
router.get("/duplicates", getDuplicateCustomers);
router.post("/duplicates/merge", mergeDuplicateCustomers);
router.get("/export", exportCsv);
router.post("/quotation/pdf", quotationPdf);

module.exports = router;
