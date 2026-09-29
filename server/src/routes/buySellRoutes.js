const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const { getBuySellReport, downloadBuySellPdf } = require("../controllers/buySellController");

const router = express.Router();

router.use(protect, authorizeRoles("admin"), authorizeAdminSections("buy_sell_details"));

router.get("/pdf", downloadBuySellPdf);
router.get("/", getBuySellReport);

module.exports = router;
