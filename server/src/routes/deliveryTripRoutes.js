const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getMyTodayTrip,
  startMyTrip,
  pingMyTrip,
  endMyTrip,
  adminGetDayTrips,
  adminStartTrip,
  adminEndTrip,
  adminReopenTrip,
  adminUpdateTrip,
  adminDeleteTrip
} = require("../controllers/deliveryTripController");

const router = express.Router();

const partnerOnly = [protect, authorizeRoles("delivery_partner")];
const tripsAdmin = [
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("delivery_trips_control")
];

router.get("/me/today", ...partnerOnly, getMyTodayTrip);
router.post("/me/start", ...partnerOnly, startMyTrip);
router.post("/me/ping", ...partnerOnly, pingMyTrip);
router.post("/me/end", ...partnerOnly, endMyTrip);

router.get("/admin/day", ...tripsAdmin, adminGetDayTrips);
router.post("/admin/start", ...tripsAdmin, adminStartTrip);
router.post("/admin/trips/:tripId/end", ...tripsAdmin, adminEndTrip);
router.post("/admin/trips/:tripId/reopen", ...tripsAdmin, adminReopenTrip);
router.patch("/admin/trips/:tripId", ...tripsAdmin, adminUpdateTrip);
router.delete("/admin/trips/:tripId", ...tripsAdmin, adminDeleteTrip);

module.exports = router;
