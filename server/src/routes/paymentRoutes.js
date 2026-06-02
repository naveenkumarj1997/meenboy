const express = require("express");
const { body } = require("express-validator");
const { protect, authorizeRoles } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const {
  createPaymentRecord,
  listPaymentsForOrder,
  getMyPayments,
  updatePaymentStatus
} = require("../controllers/paymentController");

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("customer"),
  [
    body("order").isMongoId().withMessage("Order id is required"),
    body("provider").notEmpty().withMessage("Provider is required"),
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive")
  ],
  validateRequest,
  createPaymentRecord
);

router.get("/me", protect, authorizeRoles("customer"), getMyPayments);
router.get("/order/:orderId", protect, authorizeRoles("admin"), listPaymentsForOrder);

router.patch(
  "/:paymentId/status",
  protect,
  authorizeRoles("admin"),
  [body("status").notEmpty().withMessage("Status is required")],
  validateRequest,
  updatePaymentStatus
);

module.exports = router;

