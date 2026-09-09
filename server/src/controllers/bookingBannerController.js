const BookingBanner = require("../models/BookingBanner");

const DEFAULT_KEY = "default";

const shape = (doc) => {
  if (!doc) {
    return { enabled: false, message: "" };
  }
  const raw = doc.toObject ? doc.toObject() : doc;
  const message = String(raw.message || "").trim();
  const enabled = raw.enabled === true && message.length > 0;
  return {
    enabled,
    message: enabled ? message : message,
    updatedAt: raw.updatedAt
  };
};

const getOrCreate = async () => {
  let doc = await BookingBanner.findOne({ key: DEFAULT_KEY });
  if (doc) return doc;

  try {
    doc = await BookingBanner.create({
      key: DEFAULT_KEY,
      enabled: false,
      message: ""
    });
    return doc;
  } catch (error) {
    if (error?.code === 11000) {
      doc = await BookingBanner.findOne({ key: DEFAULT_KEY });
      if (doc) return doc;
    }
    throw error;
  }
};

// @route   GET /api/booking-banner
const getPublicBookingBanner = async (req, res, next) => {
  try {
    const doc = await getOrCreate();
    const shaped = shape(doc);
    // Public: only expose when enabled with text
    res.json({
      banner: {
        enabled: shaped.enabled,
        message: shaped.enabled ? shaped.message : ""
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/booking-banner/admin
const getAdminBookingBanner = async (req, res, next) => {
  try {
    const doc = await getOrCreate();
    const raw = doc.toObject ? doc.toObject() : doc;
    res.json({
      banner: {
        enabled: raw.enabled === true,
        message: String(raw.message || "").trim(),
        updatedAt: raw.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/booking-banner/admin
const updateBookingBanner = async (req, res, next) => {
  try {
    const { enabled, message } = req.body;
    const doc = await getOrCreate();

    if (enabled !== undefined) {
      doc.enabled = Boolean(enabled);
    }
    if (message !== undefined) {
      doc.message = String(message || "").trim().slice(0, 180);
    }
    doc.updatedBy = req.user._id;
    await doc.save();

    res.json({
      banner: {
        enabled: doc.enabled === true,
        message: String(doc.message || "").trim(),
        updatedAt: doc.updatedAt
      },
      message: "Fish banner updated"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicBookingBanner,
  getAdminBookingBanner,
  updateBookingBanner
};
