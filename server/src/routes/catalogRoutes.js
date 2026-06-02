const express = require("express");
const { body, param, query } = require("express-validator");
const { authorizeRoles, protect } = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const {
  listCategories,
  createCategory,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/catalogController");

const router = express.Router();

// Valid category values (must stay in sync with Product model)
const VALID_CATEGORIES = [
  "Seafood",
  "Fish",
  "Chicken",
  "Mutton",
  "Country Chicken"
];

// ══════════════════════════════════════════════════════════════════════════════
//  CATEGORY ROUTES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/catalog/categories
 * Public — list all active categories
 */
router.get("/categories", listCategories);

/**
 * POST /api/catalog/categories
 * Admin only — create a new category
 */
router.post(
  "/categories",
  protect,
  authorizeRoles("admin"),
  [
    body("name")
      .isLength({ min: 2, max: 80 })
      .withMessage("Name must be 2–80 characters"),
    body("slug")
      .isSlug()
      .withMessage("Slug must contain only lowercase letters, numbers, and hyphens")
  ],
  validateRequest,
  createCategory
);

// ══════════════════════════════════════════════════════════════════════════════
//  PRODUCT ROUTES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/catalog/products
 * Public — list products with optional filters
 *   ?category=Fish
 *   ?q=salmon          (text search)
 *   ?page=1&limit=20
 *   ?sort=-createdAt   (or minPrice, maxPrice, name)
 */
router.get(
  "/products",
  [
    query("category")
      .optional()
      .isIn(VALID_CATEGORIES)
      .withMessage(`category must be one of: ${VALID_CATEGORIES.join(", ")}`),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be 1–100")
  ],
  validateRequest,
  listProducts
);

/**
 * GET /api/catalog/products/:id
 * Public — fetch single product by MongoDB ObjectId OR slug
 */
router.get("/products/:id", getProduct);

/**
 * POST /api/catalog/products
 * Admin only — create a new product
 *
 * Body (JSON):
 * {
 *   "name":          "Tiger Prawns",
 *   "category":      "Seafood",
 *   "description":   "...",
 *   "minPrice":      29.99,
 *   "maxPrice":      39.99,
 *   "image":         "https://...",
 *   "availableCuts": [
 *     { "name": "Whole with Shell", "price": 29.99, "description": "..." },
 *     { "name": "Peeled & Deveined", "price": 34.50, "description": "..." }
 *   ]
 * }
 */
router.post(
  "/products",
  protect,
  authorizeRoles("admin"),
  [
    body("name")
      .isLength({ min: 2, max: 160 })
      .withMessage("name must be 2–160 characters"),
    body("category")
      .isIn(VALID_CATEGORIES)
      .withMessage(`category must be one of: ${VALID_CATEGORIES.join(", ")}`),
    body("description")
      .optional()
      .isLength({ max: 2000 })
      .withMessage("description cannot exceed 2000 characters"),
    body("minPrice")
      .isFloat({ min: 0 })
      .withMessage("minPrice must be a non-negative number"),
    body("maxPrice")
      .isFloat({ min: 0 })
      .withMessage("maxPrice must be a non-negative number"),
    body("image")
      .optional()
      .isString()
      .withMessage("image must be a string path or URL"),
    body("availableCuts")
      .optional()
      .isArray()
      .withMessage("availableCuts must be an array"),
    body("availableCuts.*.name")
      .if(body("availableCuts").exists())
      .notEmpty()
      .withMessage("Each cut must have a name"),
    body("availableCuts.*.price")
      .if(body("availableCuts").exists())
      .isFloat({ min: 0 })
      .withMessage("Each cut must have a non-negative price")
  ],
  validateRequest,
  createProduct
);

/**
 * PUT /api/catalog/products/:id
 * Admin only — update any field of a product (partial update supported)
 */
router.put(
  "/products/:id",
  protect,
  authorizeRoles("admin"),
  [
    param("id").isMongoId().withMessage("Invalid product ID"),
    body("name")
      .optional()
      .isLength({ min: 2, max: 160 })
      .withMessage("name must be 2–160 characters"),
    body("category")
      .optional()
      .isIn(VALID_CATEGORIES)
      .withMessage(`category must be one of: ${VALID_CATEGORIES.join(", ")}`),
    body("description")
      .optional()
      .isLength({ max: 2000 })
      .withMessage("description cannot exceed 2000 characters"),
    body("minPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("minPrice must be a non-negative number"),
    body("maxPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("maxPrice must be a non-negative number"),
    body("image")
      .optional()
      .isString()
      .withMessage("image must be a string path or URL"),
    body("availableCuts")
      .optional()
      .isArray()
      .withMessage("availableCuts must be an array")
  ],
  validateRequest,
  updateProduct
);

/**
 * DELETE /api/catalog/products/:id
 * Admin only — soft-delete (sets isActive: false)
 */
router.delete(
  "/products/:id",
  protect,
  authorizeRoles("admin"),
  [param("id").isMongoId().withMessage("Invalid product ID")],
  validateRequest,
  deleteProduct
);

module.exports = router;
