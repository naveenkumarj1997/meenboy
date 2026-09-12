const PartnerDeliveryTrip = require("../models/PartnerDeliveryTrip");
const {
  computeTrailKm,
  istYmd,
  istMinutesNow,
  AUTO_END_AFTER_MINUTES
} = require("../utils/geoDistance");
const { reverseGeocode } = require("../utils/reverseGeocode");

const parseLocation = (location) => {
  if (!location || typeof location !== "object") return null;
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng, capturedAt: new Date() };
};

const shapeTrip = (doc) => {
  if (!doc) return null;
  const raw = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(raw._id),
    date: raw.date,
    status: raw.status,
    startedAt: raw.startedAt,
    endedAt: raw.endedAt,
    totalKm: Number(raw.totalKm || 0),
    pointCount: Array.isArray(raw.points) ? raw.points.length : 0,
    startLocation: raw.startLocation || null,
    endLocation: raw.endLocation || null,
    lastLocationLabel: raw.lastLocationLabel || "",
    lastStreet: raw.lastStreet || "",
    lastArea: raw.lastArea || ""
  };
};

const maybeAutoEndTrip = async (trip) => {
  if (!trip || trip.status !== "active") return trip;
  if (istMinutesNow() < AUTO_END_AFTER_MINUTES) return trip;

  const last =
    (Array.isArray(trip.points) && trip.points.length
      ? trip.points[trip.points.length - 1]
      : null) || trip.startLocation;

  trip.status = "auto_ended";
  trip.endedAt = new Date();
  if (last && Number.isFinite(Number(last.lat)) && Number.isFinite(Number(last.lng))) {
    trip.endLocation = {
      lat: Number(last.lat),
      lng: Number(last.lng),
      capturedAt: last.capturedAt || new Date()
    };
  }
  trip.totalKm = computeTrailKm(trip.points || []);
  await trip.save();
  return trip;
};

const appendPoint = (trip, loc) => {
  if (!loc) return false;
  const points = trip.points || [];
  points.push({
    lat: loc.lat,
    lng: loc.lng,
    capturedAt: loc.capturedAt || new Date()
  });
  if (points.length > 1500) {
    trip.points = points.slice(points.length - 1500);
  } else {
    trip.points = points;
  }
  trip.totalKm = computeTrailKm(trip.points);
  trip.lastLat = loc.lat;
  trip.lastLng = loc.lng;
  trip.lastCapturedAt = loc.capturedAt || new Date();
  return true;
};

/** Refresh street/area label at most every 3 minutes while moving. */
const maybeRefreshLocationLabel = async (trip) => {
  if (!trip || !Number.isFinite(Number(trip.lastLat)) || !Number.isFinite(Number(trip.lastLng))) {
    return;
  }
  const lastGeo = trip.lastGeocodedAt ? new Date(trip.lastGeocodedAt).getTime() : 0;
  if (Date.now() - lastGeo < 3 * 60 * 1000 && trip.lastLocationLabel) return;

  const geo = await reverseGeocode(trip.lastLat, trip.lastLng);
  if (!geo) return;
  trip.lastStreet = geo.street || "";
  trip.lastArea = geo.area || "";
  trip.lastLocationLabel = geo.label || "";
  trip.lastGeocodedAt = new Date();
};

// @route GET /api/delivery-trips/me/today
const getMyTodayTrip = async (req, res, next) => {
  try {
    const date = istYmd();
    let trip = await PartnerDeliveryTrip.findOne({
      deliveryPartner: req.user._id,
      date
    });
    if (trip) trip = await maybeAutoEndTrip(trip);

    const minutes = istMinutesNow();
    res.json({
      date,
      trip: shapeTrip(trip),
      window: {
        trackingOpen: minutes >= 5 * 60 && minutes < AUTO_END_AFTER_MINUTES,
        autoEndAfterMinutes: AUTO_END_AFTER_MINUTES,
        nowMinutesIst: minutes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/delivery-trips/me/start
const startMyTrip = async (req, res, next) => {
  try {
    const date = istYmd();
    const minutes = istMinutesNow();
    if (minutes < 5 * 60) {
      return res.status(400).json({
        message: "Tracking starts from 5:00 AM. Try again during delivery hours."
      });
    }
    if (minutes >= AUTO_END_AFTER_MINUTES) {
      return res.status(400).json({
        message: "Delivery window closed after 1:00 PM. Cannot start a new trip today."
      });
    }

    const loc = parseLocation(req.body.location);
    if (!loc) {
      return res.status(400).json({ message: "GPS location is required to start from hub." });
    }

    let trip = await PartnerDeliveryTrip.findOne({
      deliveryPartner: req.user._id,
      date
    });

    if (trip) {
      trip = await maybeAutoEndTrip(trip);
      if (trip.status === "active") {
        return res.status(400).json({ message: "Trip already started today.", trip: shapeTrip(trip) });
      }
      return res.status(400).json({
        message: "Today's trip already ended (one trip per day).",
        trip: shapeTrip(trip)
      });
    }

    trip = await PartnerDeliveryTrip.create({
      date,
      deliveryPartner: req.user._id,
      status: "active",
      startedAt: new Date(),
      startLocation: loc,
      points: [{ lat: loc.lat, lng: loc.lng, capturedAt: loc.capturedAt }],
      totalKm: 0,
      lastLat: loc.lat,
      lastLng: loc.lng,
      lastCapturedAt: loc.capturedAt
    });

    await maybeRefreshLocationLabel(trip);
    await trip.save();

    res.status(201).json({
      message: "Trip started from hub. Keep the app open while delivering.",
      trip: shapeTrip(trip)
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Trip already exists for today." });
    }
    next(error);
  }
};

// @route POST /api/delivery-trips/me/ping
const pingMyTrip = async (req, res, next) => {
  try {
    const date = istYmd();
    let trip = await PartnerDeliveryTrip.findOne({
      deliveryPartner: req.user._id,
      date
    });
    if (!trip) {
      return res.status(404).json({ message: "No active trip. Tap Start from hub first." });
    }
    trip = await maybeAutoEndTrip(trip);
    if (trip.status !== "active") {
      return res.json({
        message: "Trip already ended.",
        trip: shapeTrip(trip)
      });
    }

    const loc = parseLocation(req.body.location);
    if (!loc) {
      return res.status(400).json({ message: "GPS location required." });
    }

    appendPoint(trip, loc);
    await maybeRefreshLocationLabel(trip);
    await trip.save();

    res.json({ trip: shapeTrip(trip) });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/delivery-trips/me/end
const endMyTrip = async (req, res, next) => {
  try {
    const date = istYmd();
    let trip = await PartnerDeliveryTrip.findOne({
      deliveryPartner: req.user._id,
      date
    });
    if (!trip) {
      return res.status(404).json({ message: "No trip found for today." });
    }
    trip = await maybeAutoEndTrip(trip);
    if (trip.status !== "active") {
      return res.json({
        message: "Trip already ended.",
        trip: shapeTrip(trip)
      });
    }

    const loc = parseLocation(req.body.location);
    if (loc) {
      appendPoint(trip, loc);
      trip.endLocation = loc;
    } else if (trip.points?.length) {
      const last = trip.points[trip.points.length - 1];
      trip.endLocation = {
        lat: last.lat,
        lng: last.lng,
        capturedAt: last.capturedAt
      };
    }

    trip.status = "ended";
    trip.endedAt = new Date();
    trip.totalKm = computeTrailKm(trip.points || []);
    await trip.save();

    res.json({
      message: "Trip ended at hub. Petrol km saved.",
      trip: shapeTrip(trip)
    });
  } catch (error) {
    next(error);
  }
};

/** Used by admin petrol page — auto-end any stale active trips for a date */
const finalizeTripsForDate = async (date) => {
  if (istYmd() !== date) return;
  if (istMinutesNow() < AUTO_END_AFTER_MINUTES) return;
  const active = await PartnerDeliveryTrip.find({ date, status: "active" });
  for (const trip of active) {
    await maybeAutoEndTrip(trip);
  }
};

module.exports = {
  getMyTodayTrip,
  startMyTrip,
  pingMyTrip,
  endMyTrip,
  finalizeTripsForDate,
  shapeTrip,
  maybeAutoEndTrip
};
