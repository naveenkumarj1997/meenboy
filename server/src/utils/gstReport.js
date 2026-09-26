const { resolveRange } = require("./calculationsReport");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const splitInclusive = (gross, ratePercent) => {
  const grossAmt = round2(gross);
  const rate = Math.max(0, Number(ratePercent) || 0);
  if (rate <= 0 || grossAmt <= 0) {
    return {
      taxable: grossAmt,
      tax: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      rate
    };
  }
  const taxable = round2((grossAmt * 100) / (100 + rate));
  const tax = round2(grossAmt - taxable);
  const cgst = round2(tax / 2);
  const sgst = round2(tax - cgst);
  return { taxable, tax, cgst, sgst, igst: 0, rate };
};

const DEFAULT_CATEGORY_RATES = [
  { category: "Fish", hsnCode: "0302", gstRatePercent: 0 },
  { category: "Seafood", hsnCode: "0306", gstRatePercent: 0 },
  { category: "Chicken", hsnCode: "0207", gstRatePercent: 0 },
  { category: "Country Chicken", hsnCode: "0207", gstRatePercent: 0 },
  { category: "Mutton", hsnCode: "0204", gstRatePercent: 0 }
];

const getOrCreateGstSettings = async () => {
  const ShopGstSettings = require("../models/ShopGstSettings");
  let doc = await ShopGstSettings.findOne({ key: "default" });
  if (!doc) {
    doc = await ShopGstSettings.create({ key: "default" });
  }
  return doc;
};

const rateForCategory = (settings, category, product) => {
  if (product && product.gstRatePercent != null && product.gstRatePercent !== "") {
    return {
      rate: Number(product.gstRatePercent) || 0,
      hsn: String(product.hsnCode || "").trim()
    };
  }
  const cat = String(category || "Other").trim();
  const fromSettings = (settings.categoryRates || []).find(
    (r) => String(r.category).toLowerCase() === cat.toLowerCase()
  );
  if (fromSettings) {
    return {
      rate: Number(fromSettings.gstRatePercent) || 0,
      hsn: String(product?.hsnCode || fromSettings.hsnCode || "").trim()
    };
  }
  const fallback = DEFAULT_CATEGORY_RATES.find(
    (r) => r.category.toLowerCase() === cat.toLowerCase()
  );
  return {
    rate: fallback ? fallback.gstRatePercent : 0,
    hsn: String(product?.hsnCode || fallback?.hsnCode || "").trim()
  };
};

const normalizeProductId = (ref) => {
  if (!ref) return "";
  if (typeof ref === "object" && ref._id) return String(ref._id);
  return String(ref).trim();
};

/**
 * Build GST sales register + rate/HSN summary for a date range (TN B2C: CGST+SGST).
 */
const getGstReportData = async (query = {}) => {
  const Order = require("../models/Order");
  const WalkInSale = require("../models/WalkInSale");
  const Product = require("../models/Product");
  const DailyPurchase = require("../models/DailyPurchase");

  const settings = await getOrCreateGstSettings();
  const { from, to, period, businessStart, today } = resolveRange(query);

  const products = await Product.find({}).select("name category hsnCode gstRatePercent").lean();
  const productById = {};
  const productByName = {};
  products.forEach((p) => {
    productById[String(p._id)] = p;
    productByName[String(p.name || "").trim().toLowerCase()] = p;
  });

  const sales = [];
  const rateMap = {};
  const hsnMap = {};

  const bumpAgg = (map, key, fields) => {
    if (!map[key]) {
      map[key] = {
        ...fields,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        tax: 0,
        gross: 0,
        lines: 0
      };
    }
    map[key].taxable = round2(map[key].taxable + fields.taxable);
    map[key].cgst = round2(map[key].cgst + fields.cgst);
    map[key].sgst = round2(map[key].sgst + fields.sgst);
    map[key].tax = round2(map[key].tax + fields.tax);
    map[key].gross = round2(map[key].gross + fields.gross);
    map[key].lines += 1;
  };

  const addLine = ({
    date,
    docType,
    docNo,
    customerName,
    category,
    productName,
    quantity,
    unit,
    gross,
    product
  }) => {
    const { rate, hsn } = rateForCategory(settings, category, product);
    const split = splitInclusive(gross, rate);
    const row = {
      date,
      docType,
      docNo,
      customerName: customerName || "Guest",
      category: category || "Other",
      productName: productName || "-",
      quantity: Number(quantity) || 0,
      unit: unit || "kg",
      hsn: hsn || "-",
      rate: split.rate,
      taxable: split.taxable,
      cgst: split.cgst,
      sgst: split.sgst,
      tax: split.tax,
      gross: round2(gross)
    };
    sales.push(row);

    bumpAgg(rateMap, String(split.rate), {
      rate: split.rate,
      taxable: split.taxable,
      cgst: split.cgst,
      sgst: split.sgst,
      tax: split.tax,
      gross: round2(gross)
    });
    bumpAgg(hsnMap, `${hsn || "-"}|${split.rate}`, {
      hsn: hsn || "-",
      rate: split.rate,
      taxable: split.taxable,
      cgst: split.cgst,
      sgst: split.sgst,
      tax: split.tax,
      gross: round2(gross)
    });
  };

  const orders = await Order.find({
    status: "delivered",
    deliveryDate: { $gte: from, $lte: to }
  })
    .populate("customer", "name excludeFromEarnings")
    .lean();

  for (const order of orders) {
    if (order.customer?.excludeFromEarnings) continue;
    const docNo = `ORD-${String(order._id).slice(-8).toUpperCase()}`;
    const customerName = order.customer?.name || "Customer";

    for (const item of order.items || []) {
      const pid = normalizeProductId(item.product);
      const product =
        productById[pid] ||
        productByName[String(item.productName || "").trim().toLowerCase()];
      const category = product?.category || "Other";
      addLine({
        date: order.deliveryDate,
        docType: "Delivery",
        docNo,
        customerName,
        category,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit || product?.unit || "kg",
        gross: Number(item.totalPrice) || 0,
        product
      });
    }

    const deliveryFee = Number(order.deliveryFee) || 0;
    if (deliveryFee > 0) {
      const rate = Number(settings.deliveryFeeGstRatePercent) || 0;
      const split = splitInclusive(deliveryFee, rate);
      const row = {
        date: order.deliveryDate,
        docType: "Delivery",
        docNo,
        customerName,
        category: "Delivery",
        productName: "Delivery fee",
        quantity: 1,
        unit: "svc",
        hsn: String(settings.deliveryFeeHsn || "-").trim() || "-",
        rate: split.rate,
        taxable: split.taxable,
        cgst: split.cgst,
        sgst: split.sgst,
        tax: split.tax,
        gross: round2(deliveryFee)
      };
      sales.push(row);
      bumpAgg(rateMap, String(split.rate), {
        rate: split.rate,
        taxable: split.taxable,
        cgst: split.cgst,
        sgst: split.sgst,
        tax: split.tax,
        gross: round2(deliveryFee)
      });
      bumpAgg(hsnMap, `${row.hsn}|${split.rate}`, {
        hsn: row.hsn,
        rate: split.rate,
        taxable: split.taxable,
        cgst: split.cgst,
        sgst: split.sgst,
        tax: split.tax,
        gross: round2(deliveryFee)
      });
    }
  }

  const walkIns = await WalkInSale.find({
    saleDate: { $gte: from, $lte: to },
    status: { $ne: "cancelled" }
  }).lean();

  for (const sale of walkIns) {
    const docNo = sale.billNumber || `WI-${String(sale._id).slice(-8).toUpperCase()}`;
    for (const item of sale.items || []) {
      const pid = normalizeProductId(item.product);
      const product =
        productById[pid] ||
        productByName[String(item.productName || "").trim().toLowerCase()];
      const category = item.category || product?.category || "Other";
      addLine({
        date: sale.saleDate,
        docType: "Walk-in",
        docNo,
        customerName: sale.customerName || "Walk-in",
        category,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit || "kg",
        gross: Number(item.totalPrice) || 0,
        product
      });
    }
  }

  sales.sort((a, b) => {
    const d = String(a.date).localeCompare(String(b.date));
    if (d !== 0) return d;
    return String(a.docNo).localeCompare(String(b.docNo));
  });

  const purchases = await DailyPurchase.find({ date: { $gte: from, $lte: to } }).lean();
  let purchaseTotal = 0;
  const purchaseDays = purchases.map((p) => {
    const total = round2(
      Number(p.chickenShop || 0) +
        Number(p.muttonShop || 0) +
        Number(p.fishCompany || 0) +
        Number(p.localFishShop || 0)
    );
    purchaseTotal += total;
    return {
      date: p.date,
      chickenShop: round2(p.chickenShop),
      muttonShop: round2(p.muttonShop),
      fishCompany: round2(p.fishCompany),
      localFishShop: round2(p.localFishShop),
      total
    };
  });

  const summary = sales.reduce(
    (acc, row) => {
      acc.gross = round2(acc.gross + row.gross);
      acc.taxable = round2(acc.taxable + row.taxable);
      acc.cgst = round2(acc.cgst + row.cgst);
      acc.sgst = round2(acc.sgst + row.sgst);
      acc.tax = round2(acc.tax + row.tax);
      acc.lines += 1;
      return acc;
    },
    { gross: 0, taxable: 0, cgst: 0, sgst: 0, tax: 0, lines: 0 }
  );

  return {
    period,
    range: { from, to },
    businessStartDate: businessStart,
    today,
    settings: {
      legalName: settings.legalName,
      tradeName: settings.tradeName,
      gstin: settings.gstin,
      stateCode: settings.stateCode,
      stateName: settings.stateName,
      addressLine1: settings.addressLine1,
      addressLine2: settings.addressLine2,
      city: settings.city,
      postalCode: settings.postalCode,
      phone: settings.phone,
      email: settings.email,
      pricesInclusive: settings.pricesInclusive,
      registrationType: settings.registrationType,
      deliveryFeeGstRatePercent: settings.deliveryFeeGstRatePercent,
      deliveryFeeHsn: settings.deliveryFeeHsn,
      categoryRates: settings.categoryRates,
      notes: settings.notes
    },
    summary: {
      ...summary,
      purchaseTotal: round2(purchaseTotal),
      docs: new Set(sales.map((s) => `${s.docType}:${s.docNo}`)).size
    },
    sales,
    rateWise: Object.values(rateMap).sort((a, b) => a.rate - b.rate),
    hsnWise: Object.values(hsnMap).sort((a, b) =>
      String(a.hsn).localeCompare(String(b.hsn))
    ),
    purchases: purchaseDays,
    disclaimer:
      "Helper records for your CA / GSTR entry. Confirm HSN & rates with a tax professional. Does not file GST returns."
  };
};

module.exports = {
  getOrCreateGstSettings,
  getGstReportData,
  splitInclusive,
  DEFAULT_CATEGORY_RATES
};
