const mongoose = require("mongoose");
const PartnerDeliveryTrip = require("../models/PartnerDeliveryTrip");
const User = require("../models/User");
const {
  computeTrailKm,
  istYmd,
  istMinutesNow,
  AUTO_END_AFTER_MINUTES,
  TRACKING_OPENS_MINUTES,
  MAX_TRIPS_PER_DAY
} = require("../utils/geoDistance");
const { reverseGeocode } = require("../utils/reverseGeocode");

const CUTOFF_LABEL = "10:00 PM";

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
    tripNumber: Number(raw.tripNumber || 1),
    status: raw.status,
    startedAt: raw.startedAt,
    endedAt: raw.endedAt,
    totalKm: Number(raw.totalKm || 0),
    pointCount: Array.isArray(raw.points) ? raw.points.length : 0,
    startLocation: raw.startLocation || null,
    endLocation: raw.endLocation || null,
    lastCapturedAt: raw.lastCapturedAt || null,
    lastLocationLabel: raw.lastLocationLabel || "",
    lastStreet: raw.lastStreet || "",
    lastArea: raw.lastArea || "",
    startedBy: raw.startedBy || "partner",
    endedBy: raw.endedBy || "",
    manualKm: Boolean(raw.manualKm),
    adminNotes: raw.adminNotes || ""
  };
};

const appendAdminNote = (trip, text) => {
  const note = String(text || "").trim();
  if (!note) return;
  const stamp = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit"
  });
  const line = `[${stamp}] ${note}`;
  trip.adminNotes = (trip.adminNotes ? `${trip.adminNotes} | ${line}` : line).slice(-1000);
};

const closeTrip = (trip, endedBy, loc) => {
  const last =
    loc ||
    (Array.isArray(trip.points) && trip.points.length
      ? trip.points[trip.points.length - 1]
      : null) ||
    trip.startLocation;

  if (loc) {
    appendPoint(trip, loc);
  }
  if (last && Number.isFinite(Number(last.lat)) && Number.isFinite(Number(last.lng))) {
    trip.endLocation = {
      lat: Number(last.lat),
      lng: Number(last.lng),
      capturedAt: last.capturedAt || new Date()
    };
  }
  trip.status = endedBy === "auto" ? "auto_ended" : "ended";
  trip.endedBy = endedBy;
  trip.endedAt = new Date();
  if (!trip.manualKm) {
    trip.totalKm = computeTrailKm(trip.points || []);
  }
};

const shouldAutoEnd = (trip) => {
  if (!trip || trip.status !== "active") return false;
  const today = istYmd();
  if (String(trip.date) < today) return true;
  return istMinutesNow() >= AUTO_END_AFTER_MINUTES;
};

const maybeAutoEndTrip = async (trip) => {
  if (!shouldAutoEnd(trip)) return trip;
  closeTrip(trip, "auto");
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
  if (!trip.manualKm) {
    trip.totalKm = computeTrailKm(trip.points);
  }
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

/** All trips for one partner on one day (auto-ends stale active trips), ordered by trip number. */
const loadPartnerDayTrips = async (partnerId, date) => {
  const trips = await PartnerDeliveryTrip.find({ deliveryPartner: partnerId, date }).sort({
    tripNumber: 1,
    startedAt: 1
  });
  for (const trip of trips) {
    await maybeAutoEndTrip(trip);
  }
  return trips;
};

const nextFreeTripNumber = (trips) => {
  const used = new Set(trips.map((t) => Number(t.tripNumber || 1)));
  for (let n = 1; n <= MAX_TRIPS_PER_DAY; n += 1) {
    if (!used.has(n)) return n;
  }
  return null;
};

const summarizeDay = (trips) => {
  const active = trips.find((t) => t.status === "active") || null;
  const latest = active || trips[trips.length - 1] || null;
  const tripsUsed = trips.length;
  const minutes = istMinutesNow();
  const windowOpen = minutes >= TRACKING_OPENS_MINUTES && minutes < AUTO_END_AFTER_MINUTES;
  return {
    trip: shapeTrip(latest),
    trips: trips.map(shapeTrip),
    tripsUsed,
    maxTrips: MAX_TRIPS_PER_DAY,
    hasActiveTrip: Boolean(active),
    canStartNext: !active && tripsUsed < MAX_TRIPS_PER_DAY && windowOpen,
    totalKm: Math.round(trips.reduce((s, t) => s + Number(t.totalKm || 0), 0) * 100) / 100
  };
};

const windowInfo = () => {
  const minutes = istMinutesNow();
  return {
    trackingOpen: minutes >= TRACKING_OPENS_MINUTES && minutes < AUTO_END_AFTER_MINUTES,
    opensAtMinutes: TRACKING_OPENS_MINUTES,
    autoEndAfterMinutes: AUTO_END_AFTER_MINUTES,
    nowMinutesIst: minutes
  };
};

// @route GET /api/delivery-trips/me/today
const getMyTodayTrip = async (req, res, next) => {
  try {
    const date = istYmd();
    const trips = await loadPartnerDayTrips(req.user._id, date);
    res.json({
      date,
      ...summarizeDay(trips),
      window: windowInfo()
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
    if (minutes < TRACKING_OPENS_MINUTES) {
      return res.status(400).json({
        message: "Tracking starts from 5:00 AM. Try again during delivery hours."
      });
    }
    if (minutes >= AUTO_END_AFTER_MINUTES) {
      return res.status(400).json({
        message: `Delivery window closed after ${CUTOFF_LABEL}. Cannot start a new trip today.`
      });
    }

    const loc = parseLocation(req.body.location);
    if (!loc) {
      return res.status(400).json({ message: "GPS location is required to start from hub." });
    }

    const trips = await loadPartnerDayTrips(req.user._id, date);
    const active = trips.find((t) => t.status === "active");
    if (active) {
      return res.status(400).json({
        message: `Trip ${active.tripNumber || 1} is already running. End it at hub before starting a new one.`,
        trip: shapeTrip(active)
      });
    }
    const tripNumber = nextFreeTripNumber(trips);
    if (!tripNumber) {
      return res.status(400).json({
        message: `All ${MAX_TRIPS_PER_DAY} trips for today are used. Ask admin if you need another trip.`,
        trip: shapeTrip(trips[trips.length - 1])
      });
    }

    const trip = await PartnerDeliveryTrip.create({
      date,
      tripNumber,
      deliveryPartner: req.user._id,
      status: "active",
      startedAt: new Date(),
      startedBy: "partner",
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
      message: `Trip ${tripNumber} of ${MAX_TRIPS_PER_DAY} started from hub. Keep the app open while delivering.`,
      trip: shapeTrip(trip)
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "That trip already exists for today. Refresh and try again." });
    }
    next(error);
  }
};

const findActiveTripForPartner = async (partnerId) => {
  const date = istYmd();
  const trips = await loadPartnerDayTrips(partnerId, date);
  return {
    active: trips.find((t) => t.status === "active") || null,
    latest: trips[trips.length - 1] || null
  };
};

// @route POST /api/delivery-trips/me/ping
const pingMyTrip = async (req, res, next) => {
  try {
    const { active, latest } = await findActiveTripForPartner(req.user._id);
    if (!active) {
      if (latest) {
        return res.json({ message: "Trip already ended.", trip: shapeTrip(latest) });
      }
      return res.status(404).json({ message: "No active trip. Tap Start from hub first." });
    }

    const loc = parseLocation(req.body.location);
    if (!loc) {
      return res.status(400).json({ message: "GPS location required." });
    }

    appendPoint(active, loc);
    await maybeRefreshLocationLabel(active);
    await active.save();

    res.json({ trip: shapeTrip(active) });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/delivery-trips/me/end
const endMyTrip = async (req, res, next) => {
  try {
    const { active, latest } = await findActiveTripForPartner(req.user._id);
    if (!active) {
      if (latest) {
        return res.json({ message: "Trip already ended.", trip: shapeTrip(latest) });
      }
      return res.status(404).json({ message: "No trip found for today." });
    }

    closeTrip(active, "partner", parseLocation(req.body.location));
    await active.save();

    res.json({
      message: `Trip ${active.tripNumber || 1} ended at hub. Petrol km saved.`,
      trip: shapeTrip(active)
    });
  } catch (error) {
    next(error);
  }
};

/** Used by admin pages — auto-end any stale active trips for a date */
const finalizeTripsForDate = async (date) => {
  const today = istYmd();
  if (String(date) > today) return;
  if (date === today && istMinutesNow() < AUTO_END_AFTER_MINUTES) return;
  const active = await PartnerDeliveryTrip.find({ date, status: "active" });
  for (const trip of active) {
    await maybeAutoEndTrip(trip);
  }
};

// ─── Admin: Delivery Trips Control ──────────────────────────────────────────

const isValidYmd = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

// @route GET /api/delivery-trips/admin/day?date=YYYY-MM-DD
const adminGetDayTrips = async (req, res, next) => {
  try {
    const date = isValidYmd(req.query.date) ? String(req.query.date) : istYmd();
    await finalizeTripsForDate(date);

    const [partners, trips] = await Promise.all([
      User.find({ role: "delivery_partner" }).select("name phone status").sort({ name: 1 }).lean(),
      PartnerDeliveryTrip.find({ date }).sort({ tripNumber: 1, startedAt: 1 })
    ]);

    const byPartner = {};
    for (const trip of trips) {
      const pId = String(trip.deliveryPartner);
      if (!byPartner[pId]) byPartner[pId] = [];
      byPartner[pId].push(trip);
    }

    const rows = partners
      .filter((p) => p.status === "active" || byPartner[String(p._id)])
      .map((p) => ({
        partner: { _id: String(p._id), name: p.name, phone: p.phone, status: p.status },
        ...summarizeDay(byPartner[String(p._id)] || [])
      }));

    res.json({
      date,
      isToday: date === istYmd(),
      maxTrips: MAX_TRIPS_PER_DAY,
      window: windowInfo(),
      partners: rows
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/delivery-trips/admin/start  { partnerId, note? }
const adminStartTrip = async (req, res, next) => {
  try {
    const { partnerId, note } = req.body || {};
    if (!mongoose.isValidObjectId(partnerId)) {
      return res.status(400).json({ message: "Valid delivery partner is required." });
    }
    const partner = await User.findOne({ _id: partnerId, role: "delivery_partner" }).select("name");
    if (!partner) return res.status(404).json({ message: "Delivery partner not found." });

    if (istMinutesNow() >= AUTO_END_AFTER_MINUTES) {
      return res.status(400).json({
        message: `After ${CUTOFF_LABEL} trips close automatically. Cannot start a trip now.`
      });
    }

    const date = istYmd();
    const trips = await loadPartnerDayTrips(partnerId, date);
    const active = trips.find((t) => t.status === "active");
    if (active) {
      return res.status(400).json({
        message: `${partner.name} already has trip ${active.tripNumber || 1} running.`
      });
    }
    const tripNumber = nextFreeTripNumber(trips);
    if (!tripNumber) {
      return res.status(400).json({
        message: `${partner.name} has used all ${MAX_TRIPS_PER_DAY} trips today. Delete a mistaken trip or reopen one.`
      });
    }

    const lastKnown = [...trips].reverse().find(
      (t) => Number.isFinite(Number(t.lastLat)) && Number.isFinite(Number(t.lastLng))
    );
    const startLocation = lastKnown
      ? { lat: lastKnown.lastLat, lng: lastKnown.lastLng, capturedAt: new Date() }
      : undefined;

    const trip = new PartnerDeliveryTrip({
      date,
      tripNumber,
      deliveryPartner: partnerId,
      status: "active",
      startedAt: new Date(),
      startedBy: "admin",
      startLocation,
      points: startLocation ? [startLocation] : [],
      totalKm: 0,
      ...(startLocation
        ? {
            lastLat: startLocation.lat,
            lastLng: startLocation.lng,
            lastCapturedAt: startLocation.capturedAt
          }
        : {})
    });
    appendAdminNote(trip, `Started by admin ${req.user.name || ""}${note ? `: ${note}` : ""}`.trim());
    await trip.save();

    res.status(201).json({
      message: `Trip ${tripNumber} started for ${partner.name}. GPS will record once their app is open.`,
      trip: shapeTrip(trip)
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "That trip number already exists. Refresh and try again." });
    }
    next(error);
  }
};

const loadTripOr404 = async (req, res) => {
  const { tripId } = req.params;
  if (!mongoose.isValidObjectId(tripId)) {
    res.status(400).json({ message: "Invalid trip id." });
    return null;
  }
  const trip = await PartnerDeliveryTrip.findById(tripId);
  if (!trip) {
    res.status(404).json({ message: "Trip not found." });
    return null;
  }
  return trip;
};

// @route POST /api/delivery-trips/admin/trips/:tripId/end  { note? }
const adminEndTrip = async (req, res, next) => {
  try {
    const trip = await loadTripOr404(req, res);
    if (!trip) return;
    if (trip.status !== "active") {
      return res.status(400).json({ message: "This trip is already closed." });
    }
    closeTrip(trip, "admin");
    appendAdminNote(
      trip,
      `Ended by admin ${req.user.name || ""}${req.body?.note ? `: ${req.body.note}` : ""}`.trim()
    );
    await trip.save();
    res.json({ message: `Trip ${trip.tripNumber || 1} ended.`, trip: shapeTrip(trip) });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/delivery-trips/admin/trips/:tripId/reopen  { note? }
const adminReopenTrip = async (req, res, next) => {
  try {
    const trip = await loadTripOr404(req, res);
    if (!trip) return;
    if (trip.status === "active") {
      return res.status(400).json({ message: "Trip is already running." });
    }
    if (trip.date !== istYmd()) {
      return res.status(400).json({ message: "Only today's trips can be reopened." });
    }
    if (istMinutesNow() >= AUTO_END_AFTER_MINUTES) {
      return res.status(400).json({ message: `Cannot reopen after ${CUTOFF_LABEL}.` });
    }
    const otherActive = await PartnerDeliveryTrip.findOne({
      deliveryPartner: trip.deliveryPartner,
      date: trip.date,
      status: "active",
      _id: { $ne: trip._id }
    }).select("tripNumber");
    if (otherActive) {
      return res.status(400).json({
        message: `Trip ${otherActive.tripNumber || 1} is running. End it before reopening this one.`
      });
    }
    trip.status = "active";
    trip.endedAt = undefined;
    trip.endLocation = undefined;
    trip.endedBy = "";
    appendAdminNote(
      trip,
      `Reopened by admin ${req.user.name || ""}${req.body?.note ? `: ${req.body.note}` : ""}`.trim()
    );
    await trip.save();
    res.json({ message: `Trip ${trip.tripNumber || 1} reopened.`, trip: shapeTrip(trip) });
  } catch (error) {
    next(error);
  }
};

// @route PATCH /api/delivery-trips/admin/trips/:tripId  { totalKm?, resetKm?, note? }
const adminUpdateTrip = async (req, res, next) => {
  try {
    const trip = await loadTripOr404(req, res);
    if (!trip) return;
    const { totalKm, resetKm, note } = req.body || {};

    if (resetKm) {
      trip.manualKm = false;
      trip.totalKm = computeTrailKm(trip.points || []);
      appendAdminNote(trip, `Km reset to GPS (${trip.totalKm} km)${note ? `: ${note}` : ""}`);
    } else if (totalKm !== undefined && totalKm !== null && totalKm !== "") {
      const km = Number(totalKm);
      if (!Number.isFinite(km) || km < 0 || km > 1000) {
        return res.status(400).json({ message: "Enter a valid km between 0 and 1000." });
      }
      trip.totalKm = Math.round(km * 100) / 100;
      trip.manualKm = true;
      appendAdminNote(trip, `Km set to ${trip.totalKm} by admin${note ? `: ${note}` : ""}`);
    } else if (note) {
      appendAdminNote(trip, note);
    } else {
      return res.status(400).json({ message: "Nothing to update." });
    }

    await trip.save();
    res.json({ message: "Trip updated.", trip: shapeTrip(trip) });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/delivery-trips/admin/trips/:tripId
const adminDeleteTrip = async (req, res, next) => {
  try {
    const trip = await loadTripOr404(req, res);
    if (!trip) return;
    await trip.deleteOne();
    res.json({ message: `Trip ${trip.tripNumber || 1} deleted. The partner can use that trip slot again.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyTodayTrip,
  startMyTrip,
  pingMyTrip,
  endMyTrip,
  finalizeTripsForDate,
  shapeTrip,
  maybeAutoEndTrip,
  adminGetDayTrips,
  adminStartTrip,
  adminEndTrip,
  adminReopenTrip,
  adminUpdateTrip,
  adminDeleteTrip
};
