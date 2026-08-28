const Order = require("../models/Order");
const Product = require("../models/Product");

const FISH_VENDOR_CATEGORIES = ["Fish", "Seafood"];

const VENDOR_REPORT_SECTIONS = [
  "Fish & Seafood",
  "Chicken",
  "Mutton",
  "Country Chicken"
];

const LEGACY_VENDOR_FILTERS = ["Fish", "Seafood"];

const normalizeProductId = (productRef) => {
  if (!productRef) return "";
  if (typeof productRef === "object" && productRef._id) {
    return String(productRef._id).trim();
  }
  return String(productRef).trim();
};

const normalizeVendorCategoryFilter = (category) => {
  if (!category || String(category).toLowerCase() === "all") return "all";
  const value = String(category).trim();
  if (
    value === "Fish & Seafood" ||
    value === "Fish" ||
    value === "Seafood"
  ) {
    return "Fish & Seafood";
  }
  return value;
};

const getVendorSectionForProductCategory = (productCategory) => {
  if (FISH_VENDOR_CATEGORIES.includes(productCategory)) {
    return "Fish & Seafood";
  }
  if (VENDOR_REPORT_SECTIONS.includes(productCategory)) {
    return productCategory;
  }
  return "Other";
};

const sectionMatchesFilter = (section, filter) => {
  if (filter === "all") return true;
  return section === filter;
};

const buildTotals = (rows) => {
  const map = {};
  rows.forEach((r) => {
    const key = `${r.productName}||${r.cutName || "-"}||${r.unit || "kg"}`;
    if (!map[key]) {
      map[key] = {
        label: r.cutName ? `${r.productName} (${r.cutName})` : r.productName,
        quantity: 0,
        unit: r.unit || "kg"
      };
    }
    map[key].quantity += Number(r.quantity) || 0;
  });
  return Object.values(map)
    .map((t) => ({
      ...t,
      quantity: Math.round(t.quantity * 1000) / 1000
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Same order with repeated note text → show note once across item rows (merged cell).
 * Different notes per item in one order → each row keeps its own note.
 */
const annotateVendorNoteGroups = (rows) => {
  if (!rows?.length) return [];

  const annotated = rows.map((row) => ({ ...row }));
  let i = 0;

  while (i < annotated.length) {
    const orderId = String(annotated[i].orderId || "");
    let j = i + 1;
    while (j < annotated.length && String(annotated[j].orderId || "") === orderId) {
      j++;
    }

    const groupSize = j - i;
    const noteTexts = annotated.slice(i, j).map((r) => String(r.notes || "").trim());
    const firstNonEmpty = noteTexts.find((n) => n);
    const allShareSameNote =
      firstNonEmpty &&
      noteTexts.every((n) => !n || n === firstNonEmpty);

    if (allShareSameNote && groupSize > 1) {
      for (let k = i; k < j; k++) {
        annotated[k].displayNotes = k === i ? firstNonEmpty : "";
        annotated[k].notesRowSpan = k === i ? groupSize : 0;
      }
    } else {
      for (let k = i; k < j; k++) {
        annotated[k].displayNotes = noteTexts[k - i] || "";
        annotated[k].notesRowSpan = 1;
      }
    }

    i = j;
  }

  return annotated;
};

const annotateRowsByCategory = (rowsByCategory) => {
  Object.keys(rowsByCategory).forEach((cat) => {
    rowsByCategory[cat] = annotateVendorNoteGroups(rowsByCategory[cat] || []);
  });
  return rowsByCategory;
};

const buildVendorRowsForDate = async (date, categoryFilterInput) => {
  const categoryFilter = normalizeVendorCategoryFilter(categoryFilterInput);

  const orders = await Order.find({
    deliveryDate: date,
    status: { $ne: "cancelled" }
  })
    .populate("customer", "name")
    .sort({ deliveryTime: 1, createdAt: 1 })
    .lean();

  const productIds = [
    ...new Set(
      orders.flatMap((o) =>
        (o.items || []).map((item) => normalizeProductId(item.product)).filter(Boolean)
      )
    )
  ];

  const products = await Product.find({ _id: { $in: productIds } })
    .select("name category unit")
    .lean();

  const categoryByProduct = {};
  const unitByProduct = {};
  products.forEach((p) => {
    const id = String(p._id);
    categoryByProduct[id] = p.category;
    unitByProduct[id] = p.unit || "kg";
  });

  const rowsByCategory = {};
  VENDOR_REPORT_SECTIONS.forEach((cat) => {
    rowsByCategory[cat] = [];
  });
  rowsByCategory.Other = [];

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const productId = normalizeProductId(item.product);
      const productCategory = categoryByProduct[productId] || "Other";
      const section = getVendorSectionForProductCategory(productCategory);

      if (!sectionMatchesFilter(section, categoryFilter)) {
        return;
      }

      if (!rowsByCategory[section]) {
        rowsByCategory[section] = [];
      }

      rowsByCategory[section].push({
        productName: item.productName,
        cutName: item.cutName || "",
        quantity: item.quantity,
        unit: item.unit || unitByProduct[productId] || "kg",
        notes: item.notes || "",
        orderId: order._id,
        customerName: order.customer?.name || "Guest",
        bookingSource: order.bookingSource || "website"
      });
    });
  });

  annotateRowsByCategory(rowsByCategory);

  const stats = {
    totalOrders: orders.length,
    manualOrders: orders.filter((o) => o.bookingSource === "manual").length,
    websiteOrders: orders.filter((o) => o.bookingSource === "website").length
  };

  return {
    rowsByCategory,
    buildTotals,
    VENDOR_REPORT_SECTIONS,
    stats,
    categoryFilter
  };
};

const isAllowedVendorCategoryFilter = (filter) => {
  if (filter === "all") return true;
  return (
    VENDOR_REPORT_SECTIONS.includes(filter) ||
    LEGACY_VENDOR_FILTERS.includes(filter)
  );
};

module.exports = {
  FISH_VENDOR_CATEGORIES,
  VENDOR_REPORT_SECTIONS,
  normalizeProductId,
  normalizeVendorCategoryFilter,
  getVendorSectionForProductCategory,
  buildVendorRowsForDate,
  buildTotals,
  annotateVendorNoteGroups,
  isAllowedVendorCategoryFilter
};
