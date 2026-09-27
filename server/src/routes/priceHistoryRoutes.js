const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const { listPriceProducts, getPriceHistory } = require("../controllers/priceHistoryController");

const router = express.Router();

router.use(protect, authorizeRoles("admin"), authorizeAdminSections("price_range_graph"));

router.get("/products", listPriceProducts);
router.get("/", getPriceHistory);

module.exports = router;
