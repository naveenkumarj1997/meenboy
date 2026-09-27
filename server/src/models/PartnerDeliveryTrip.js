const mongoose = require("mongoose");

const gpsPointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    capturedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

/** Hub→hub petrol tracking trip. Up to MAX_TRIPS_PER_DAY per partner per delivery day. */
const partnerDeliveryTripSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD (IST delivery day)
      required: true,
      index: true
    },
    tripNumber: {
      type: Number,
      default: 1,
      min: 1
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["active", "ended", "auto_ended"],
      default: "active",
      index: true
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    startLocation: {
      lat: Number,
      lng: Number,
      capturedAt: Date
    },
    endLocation: {
      lat: Number,
      lng: Number,
      capturedAt: Date
    },
    points: {
      type: [gpsPointSchema],
      default: []
    },
    /** Sum of trail segments (km). Recalculated on ping/end. */
    totalKm: {
      type: Number,
      default: 0,
      min: 0
    },
    /** Last known GPS (for admin live tracking) */
    lastLat: { type: Number },
    lastLng: { type: Number },
    lastCapturedAt: { type: Date },
    /** Human-readable street / area from reverse geocode */
    lastStreet: { type: String, trim: true, default: "" },
    lastArea: { type: String, trim: true, default: "" },
    lastLocationLabel: { type: String, trim: true, default: "" },
    lastGeocodedAt: { type: Date },
    startedBy: { type: String, enum: ["partner", "admin"], default: "partner" },
    endedBy: { type: String, enum: ["partner", "admin", "auto", ""], default: "" },
    /** Set when admin overrides km manually (GPS failure etc.) */
    manualKm: { type: Boolean, default: false },
    adminNotes: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

partnerDeliveryTripSchema.index(
  { date: 1, deliveryPartner: 1, tripNumber: 1 },
  { unique: true }
);

const PartnerDeliveryTrip = mongoose.model("PartnerDeliveryTrip", partnerDeliveryTripSchema);

/** Drop the legacy one-trip-per-day unique index so trips 2 and 3 can be created. */
PartnerDeliveryTrip.migrateLegacyIndexes = async () => {
  try {
    const indexes = await PartnerDeliveryTrip.collection.indexes();
    const legacy = indexes.find(
      (idx) =>
        idx.unique &&
        idx.key &&
        Object.keys(idx.key).length === 2 &&
        idx.key.date === 1 &&
        idx.key.deliveryPartner === 1
    );
    if (legacy) {
      await PartnerDeliveryTrip.collection.dropIndex(legacy.name);
    }
    await PartnerDeliveryTrip.syncIndexes();
  } catch (err) {
    if (err?.codeName !== "NamespaceNotFound") throw err;
  }
};

module.exports = PartnerDeliveryTrip;
