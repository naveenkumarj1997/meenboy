const CustomerReview = require("../models/CustomerReview");
const SourcingPhoto = require("../models/SourcingPhoto");

const clip = (s, n) => String(s || "").trim().slice(0, n);
const toRating = (v) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 1 || n > 5) return 0;
  return n;
};

const PHOTO_CATEGORIES = new Set(["fishing", "sourcing", "cutting"]);

const shapeReview = (doc) => {
  const r = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(r._id),
    name: r.name,
    place: r.place || "",
    review: r.review,
    rating: r.rating,
    isPublished: r.isPublished !== false,
    sortOrder: Number(r.sortOrder) || 0,
    createdAt: r.createdAt
  };
};

const shapePhoto = (doc) => {
  const p = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(p._id),
    imageUrl: p.imageUrl,
    caption: p.caption || "",
    category: p.category || "sourcing",
    isPublished: p.isPublished !== false,
    sortOrder: Number(p.sortOrder) || 0,
    createdAt: p.createdAt
  };
};

const listSort = { sortOrder: 1, createdAt: -1 };

const getPublicReviews = async (req, res, next) => {
  try {
    const rows = await CustomerReview.find({ isPublished: true }).sort(listSort).limit(24).lean();
    res.json({ reviews: rows.map(shapeReview) });
  } catch (error) {
    next(error);
  }
};

const listAdminReviews = async (req, res, next) => {
  try {
    const rows = await CustomerReview.find({}).sort(listSort).lean();
    res.json({ reviews: rows.map(shapeReview) });
  } catch (error) {
    next(error);
  }
};

const createReview = async (req, res, next) => {
  try {
    const name = clip(req.body?.name, 80);
    const review = clip(req.body?.review, 600);
    const rating = toRating(req.body?.rating);
    if (!name) return res.status(400).json({ message: "Customer name is required." });
    if (!review) return res.status(400).json({ message: "Review text is required." });
    if (!rating) return res.status(400).json({ message: "Choose a star rating from 1 to 5." });
    const doc = await CustomerReview.create({
      name,
      place: clip(req.body?.place, 80),
      review,
      rating,
      isPublished: req.body?.isPublished !== false,
      sortOrder: Number(req.body?.sortOrder) || 0
    });
    res.status(201).json({ review: shapeReview(doc), message: "Review added. It will show on the home page if published." });
  } catch (error) {
    next(error);
  }
};

const updateReview = async (req, res, next) => {
  try {
    const doc = await CustomerReview.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Review not found." });
    if (req.body.name !== undefined) {
      const name = clip(req.body.name, 80);
      if (!name) return res.status(400).json({ message: "Customer name is required." });
      doc.name = name;
    }
    if (req.body.place !== undefined) doc.place = clip(req.body.place, 80);
    if (req.body.review !== undefined) {
      const review = clip(req.body.review, 600);
      if (!review) return res.status(400).json({ message: "Review text is required." });
      doc.review = review;
    }
    if (req.body.rating !== undefined) {
      const rating = toRating(req.body.rating);
      if (!rating) return res.status(400).json({ message: "Choose a star rating from 1 to 5." });
      doc.rating = rating;
    }
    if (req.body.isPublished !== undefined) doc.isPublished = Boolean(req.body.isPublished);
    if (req.body.sortOrder !== undefined) doc.sortOrder = Number(req.body.sortOrder) || 0;
    await doc.save();
    res.json({ review: shapeReview(doc), message: "Review updated." });
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const doc = await CustomerReview.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Review not found." });
    res.json({ message: "Review removed." });
  } catch (error) {
    next(error);
  }
};

const getPublicPhotos = async (req, res, next) => {
  try {
    const rows = await SourcingPhoto.find({ isPublished: true }).sort(listSort).limit(36).lean();
    res.json({ photos: rows.map(shapePhoto) });
  } catch (error) {
    next(error);
  }
};

const listAdminPhotos = async (req, res, next) => {
  try {
    const rows = await SourcingPhoto.find({}).sort(listSort).lean();
    res.json({ photos: rows.map(shapePhoto) });
  } catch (error) {
    next(error);
  }
};

const createPhoto = async (req, res, next) => {
  try {
    const imageUrl = clip(req.body?.imageUrl, 500);
    if (!imageUrl) return res.status(400).json({ message: "Upload a photo first." });
    const category = PHOTO_CATEGORIES.has(req.body?.category) ? req.body.category : "sourcing";
    const doc = await SourcingPhoto.create({
      imageUrl,
      caption: clip(req.body?.caption, 160),
      category,
      isPublished: req.body?.isPublished !== false,
      sortOrder: Number(req.body?.sortOrder) || 0
    });
    res.status(201).json({ photo: shapePhoto(doc), message: "Photo added. It will show on the home page if published." });
  } catch (error) {
    next(error);
  }
};

const updatePhoto = async (req, res, next) => {
  try {
    const doc = await SourcingPhoto.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Photo not found." });
    if (req.body.imageUrl !== undefined) {
      const imageUrl = clip(req.body.imageUrl, 500);
      if (!imageUrl) return res.status(400).json({ message: "Photo is required." });
      doc.imageUrl = imageUrl;
    }
    if (req.body.caption !== undefined) doc.caption = clip(req.body.caption, 160);
    if (req.body.category !== undefined) {
      if (!PHOTO_CATEGORIES.has(req.body.category)) {
        return res.status(400).json({ message: "Category must be fishing, sourcing or cutting." });
      }
      doc.category = req.body.category;
    }
    if (req.body.isPublished !== undefined) doc.isPublished = Boolean(req.body.isPublished);
    if (req.body.sortOrder !== undefined) doc.sortOrder = Number(req.body.sortOrder) || 0;
    await doc.save();
    res.json({ photo: shapePhoto(doc), message: "Photo updated." });
  } catch (error) {
    next(error);
  }
};

const deletePhoto = async (req, res, next) => {
  try {
    const doc = await SourcingPhoto.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Photo not found." });
    res.json({ message: "Photo removed." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicReviews,
  listAdminReviews,
  createReview,
  updateReview,
  deleteReview,
  getPublicPhotos,
  listAdminPhotos,
  createPhoto,
  updatePhoto,
  deletePhoto
};
