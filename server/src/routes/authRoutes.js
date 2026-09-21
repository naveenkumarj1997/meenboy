const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  me,
  listDeliveryPartners,
  verifyEmailForReset,
  resetPasswordByEmail,
  submitPartnerNda,
  downloadPartnerNdaPdf
} = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

const roleEnum = ["customer", "delivery_partner"];

router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("role").optional().isIn(roleEnum).withMessage("Invalid role")
  ],
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  login
);

router.post(
  "/forgot-password/verify-email",
  [body("email").isEmail().normalizeEmail().withMessage("Valid email is required")],
  validateRequest,
  verifyEmailForReset
);

router.post(
  "/forgot-password/reset",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("confirmPassword")
      .isLength({ min: 8 })
      .withMessage("Confirm password must be at least 8 characters")
  ],
  validateRequest,
  resetPasswordByEmail
);

router.get("/me", protect, me);

router.get("/delivery-partners", protect, authorizeRoles("admin"), listDeliveryPartners);

router.post(
  "/partner-nda",
  protect,
  authorizeRoles("delivery_partner"),
  submitPartnerNda
);

router.get(
  "/partner-nda.pdf",
  protect,
  authorizeRoles("delivery_partner", "admin"),
  downloadPartnerNdaPdf
);

module.exports = router;
