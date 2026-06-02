const express = require("express");
const { body } = require("express-validator");
const { register, login, me, listDeliveryPartners } = require("../controllers/authController");
const { protect, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

const roleEnum = ["customer", "admin", "delivery_partner"];

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

router.get("/me", protect, me);

router.get("/delivery-partners", protect, authorizeRoles("admin"), listDeliveryPartners);

module.exports = router;
