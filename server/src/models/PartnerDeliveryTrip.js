const mongoose = require("mongoose");

const gpsPointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    capturedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

/** One hub→hub petrol tracking trip per partner per delivery day. */
const partnerDeliveryTripSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD (IST delivery day)
      required: true,
      index: true
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
    lastGeocodedAt: { type: Date }
  },
  { timestamps: true }
);

partnerDeliveryTripSchema.index({ date: 1, deliveryPartner: 1 }, { unique: true });

module.exports = mongoose.model("PartnerDeliveryTrip", partnerDeliveryTripSchema);
