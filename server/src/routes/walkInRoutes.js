const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  createWalkInSale,
  listWalkInSales,
  getWalkInSale,
  getWalkInStats,
  downloadWalkInBill
} = require("../controllers/walkInController");

const router = express.Router();

router.use(protect, authorizeRoles("admin"), authorizeAdminSections("walk_in"));

router.get("/stats", getWalkInStats);
router.get("/", listWalkInSales);
router.post("/", createWalkInSale);
router.get("/:id/bill", downloadWalkInBill);
router.get("/:id", getWalkInSale);

module.exports = router;
