const Category = require("../models/Category");
const Product = require("../models/Product");

// ══════════════════════════════════════════════════════════════════════════════
//  CATEGORY CONTROLLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/catalog/categories
 * List all active categories (public)
 */
const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/catalog/categories
 * Create a category (admin only)
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;
    const category = await Category.create({ name, slug, description });
    res.status(201).json({ message: "Category created", category });
  } catch (error) {
    next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PRODUCT CONTROLLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/catalog/products
 * List products — supports ?category=Fish&q=salmon&page=1&limit=20&sort=-createdAt
 * Public route
 */
const listProducts = async (req, res, next) => {
  try {
    const {
      category,
      q,
      page    = 1,
      limit   = 20,
      sort    = "-createdAt"
    } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (q)        filter.$text = { $search: q };

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page:  pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/catalog/products/:id
 * Get single product by MongoDB _id OR slug (public)
 */
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // If it looks like a Mongo ObjectId use _id, otherwise treat as slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id, isActive: true } : { slug: id, isActive: true };

    const product = await Product.findOne(query).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, data: { product } });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/catalog/products
 * Create a product (admin only)
 *
 * Body: { name, category, description, minPrice, maxPrice, availableCuts[], image, slug? }
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      category,
      unit,
      description,
      minPrice,
      maxPrice,
      availableCuts,
      image
    } = req.body;

    const product = await Product.create({
      name,
      slug:           slug || undefined, // let pre-save hook auto-generate if not supplied
      category,
      unit,
      description,
      minPrice:       Number(minPrice),
      maxPrice:       Number(maxPrice),
      availableCuts:  Array.isArray(availableCuts) ? availableCuts : [],
      image:          image || ""
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data:    { product }
    });
  } catch (error) {
    // Mongoose duplicate key (slug collision)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with that slug already exists. Provide a unique slug."
      });
    }
    return next(error);
  }
};

/**
 * PUT /api/catalog/products/:id
 * Update a product (admin only)
 *
 * Partial updates supported — only send fields you want to change.
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Safety: never allow _id to be overwritten
    const { _id, slug, ...updates } = req.body; // eslint-disable-line no-unused-vars

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.json({
      success: true,
      message: "Product updated successfully",
      data:    { product }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/catalog/products/:id
 * Soft-delete a product — sets isActive: false (admin only)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    ).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, message: "Product deleted (deactivated) successfully" });
  } catch (error) {
    return next(error);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
module.exports = {
  listCategories,
  createCategory,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
