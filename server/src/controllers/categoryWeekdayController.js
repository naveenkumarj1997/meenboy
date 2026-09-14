const CategoryWeekdayRules = require("../models/CategoryWeekdayRules");
const { PRODUCT_CATEGORIES } = require("../models/Product");
const {
  defaultRules,
  shapeConfig,
  shapeRule,
  buildCustomerNotices
} = require("../utils/categoryWeekdayRules");

const DEFAULT_KEY = "default";

const getOrCreate = async () => {
  let doc = await CategoryWeekdayRules.findOne({ key: DEFAULT_KEY });
  if (doc) {
    // Backfill any missing categories
    const have = new Set((doc.rules || []).map((r) => r.category));
    let changed = false;
    for (const rule of defaultRules()) {
      if (!have.has(rule.category)) {
        doc.rules.push(rule);
        changed = true;
      }
    }
    if (changed) await doc.save();
    return doc;
  }

  try {
    doc = await CategoryWeekdayRules.create({
      key: DEFAULT_KEY,
      enabled: true,
      rules: defaultRules()
    });
    return doc;
  } catch (error) {
    if (error?.code === 11000) {
      doc = await CategoryWeekdayRules.findOne({ key: DEFAULT_KEY });
      if (doc) return doc;
    }
    throw error;
  }
};

// @route GET /api/category-weekday-rules
const getPublicCategoryWeekdayRules = async (req, res, next) => {
  try {
    const doc = await getOrCreate();
    const config = shapeConfig(doc);
    const categoriesParam = String(req.query.categories || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    res.json({
      config,
      notices: buildCustomerNotices(config, categoriesParam)
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/category-weekday-rules/admin
const getAdminCategoryWeekdayRules = async (req, res, next) => {
  try {
    const doc = await getOrCreate();
    res.json({ config: shapeConfig(doc) });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/category-weekday-rules/admin
const updateAdminCategoryWeekdayRules = async (req, res, next) => {
  try {
    const { enabled, rules } = req.body;
    const doc = await getOrCreate();

    if (enabled !== undefined) {
      doc.enabled = Boolean(enabled);
    }

    if (Array.isArray(rules)) {
      const nextRules = [];
      for (const category of PRODUCT_CATEGORIES) {
        const incoming = rules.find((r) => r?.category === category);
        if (incoming) {
          nextRules.push(
            shapeRule({
              category,
              deliveryWeekdays: incoming.deliveryWeekdays,
              cutoffEnabled: incoming.cutoffEnabled,
              cutoffDaysBefore: incoming.cutoffDaysBefore,
              cutoffHour: incoming.cutoffHour,
              cutoffMinute: incoming.cutoffMinute
            })
          );
        } else {
          const existing = (doc.rules || []).find((r) => r.category === category);
          nextRules.push(existing ? shapeRule(existing) : shapeRule(defaultRules().find((r) => r.category === category)));
        }
      }
      doc.rules = nextRules;
    }

    doc.updatedBy = req.user._id;
    await doc.save();

    res.json({
      config: shapeConfig(doc),
      message: "Weekday category rules saved"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrCreate,
  getPublicCategoryWeekdayRules,
  getAdminCategoryWeekdayRules,
  updateAdminCategoryWeekdayRules
};
