const DateAvailability = require("../models/DateAvailability");

const getAvailability = async (req, res, next) => {
  try {
    const availabilities = await DateAvailability.find().sort({ date: 1 }).lean();
    res.json({ availabilities });
  } catch (error) {
    next(error);
  }
};

const getAvailabilityByDate = async (req, res, next) => {
  try {
    const { date } = req.params;
    let availability = await DateAvailability.findOne({ date }).lean();
    
    if (!availability) {
      // Default open availability
      availability = {
        date,
        isClosed: false,
        unavailableCategories: [],
        unavailableProducts: []
      };
    }
    
    res.json({ availability });
  } catch (error) {
    next(error);
  }
};

const updateAvailability = async (req, res, next) => {
  try {
    const { date } = req.params;
    const { isClosed, unavailableCategories, unavailableProducts, notes } = req.body;

    const availability = await DateAvailability.findOneAndUpdate(
      { date },
      {
        date,
        isClosed,
        unavailableCategories,
        unavailableProducts,
        ...(notes !== undefined ? { notes } : {})
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ availability });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailability,
  getAvailabilityByDate,
  updateAvailability
};
