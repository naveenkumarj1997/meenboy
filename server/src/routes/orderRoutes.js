const express = require("express");
const { body } = require("express-validator");
const { protect, authorizeRoles } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const {
  createOrder,
  getMyOrders,
  listOrdersForAdmin,
  listAssignmentsForPartner,
  updateOrderStatus,
  assignDeliveryPartner,
  updateDeliveryStatus,
  getProductsForDailyPrice,
  updateDailyPrices,
  downloadInvoice,
  listAllAssignments,
  getDeliveryStats,
  reorderAssignments,
  createAdminOrder
} = require("../controllers/orderController");

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("customer"),
  [
    body("items").isArray({ min: 1 }).withMessage("Items are required"),
    body("address.line1").notEmpty().withMessage("Address line1 is required"),
    body("address.city").notEmpty().withMessage("City is required"),
    body("address.state").notEmpty().withMessage("State is required"),
    body("address.postalCode").notEmpty().withMessage("Postal code is required"),
    body("deliveryDate").notEmpty().withMessage("Delivery date is required"),
    body("deliveryTime").notEmpty().withMessage("Delivery time is required")
  ],
  validateRequest,
  createOrder
);

router.post(
  "/admin-booking",
  protect,
  authorizeRoles("admin"),
  [
    body("items").isArray({ min: 1 }).withMessage("Items are required"),
    body("address.line1").notEmpty().withMessage("Address line1 is required"),
    body("address.city").notEmpty().withMessage("City is required"),
    body("address.state").notEmpty().withMessage("State is required"),
    body("address.postalCode").notEmpty().withMessage("Postal code is required"),
    body("deliveryDate").notEmpty().withMessage("Delivery date is required"),
    body("deliveryTime").notEmpty().withMessage("Delivery time is required")
  ],
  validateRequest,
  createAdminOrder
);

router.get("/me", protect, authorizeRoles("customer"), getMyOrders);
router.get("/admin", protect, authorizeRoles("admin"), listOrdersForAdmin);
router.get("/assignments", protect, authorizeRoles("delivery_partner"), listAssignmentsForPartner);
router.get("/assignments/all", protect, authorizeRoles("admin"), listAllAssignments);
router.get("/delivery-stats", protect, authorizeRoles("admin"), getDeliveryStats);

router.get("/daily-prices/products", protect, authorizeRoles("admin"), getProductsForDailyPrice);

router.get("/:orderId/invoice", protect, downloadInvoice);

router.post(
  "/daily-prices",
  protect,
  authorizeRoles("admin"),
  [
    body("deliveryDate").notEmpty().withMessage("Delivery date is required"),
    body("priceUpdates").isArray({ min: 1 }).withMessage("Price updates are required")
  ],
  validateRequest,
  updateDailyPrices
);

router.patch(
  "/:orderId/status",
  protect,
  authorizeRoles("admin"),
  [body("status").notEmpty().withMessage("Status is required")],
  validateRequest,
  updateOrderStatus
);

router.post(
  "/:orderId/assign-delivery",
  protect,
  authorizeRoles("admin"),
  [body("deliveryPartnerId").isMongoId().withMessage("Valid delivery partner id is required")],
  validateRequest,
  assignDeliveryPartner
);

router.patch(
  "/assignments/:assignmentId/status",
  protect,
  authorizeRoles("delivery_partner"),
  [body("status").notEmpty().withMessage("Status is required")],
  validateRequest,
  updateDeliveryStatus
);

router.patch(
  "/assignments/reorder",
  protect,
  authorizeRoles("delivery_partner"),
  [body("assignments").isArray().withMessage("Assignments array is required")],
  validateRequest,
  reorderAssignments
);

module.exports = router;

