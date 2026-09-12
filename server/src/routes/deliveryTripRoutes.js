const express = require("express");
const { protect, authorizeRoles } = require("../middleware/auth");
const {
  getMyTodayTrip,
  startMyTrip,
  pingMyTrip,
  endMyTrip
} = require("../controllers/deliveryTripController");

const router = express.Router();

router.use(protect, authorizeRoles("delivery_partner"));

router.get("/me/today", getMyTodayTrip);
router.post("/me/start", startMyTrip);
router.post("/me/ping", pingMyTrip);
router.post("/me/end", endMyTrip);

module.exports = router;
