const Location = require("../models/Location");
const Plot = require("../models/Plot");
const { AppError } = require("../middleware/errorHandler");

// @desc    Get all locations
exports.getLocations = async (req, res, next) => {
  try {
    const locations = await Location.find().populate({
      path: "plots",
      populate: {
        path: "users",
        select: "name email paymentStatus paidAmount",
      },
    });
    res.json({
      success: true,
      data: locations,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a location
exports.createLocation = async (req, res, next) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return next(new AppError("Name and address are required", 400));
    }

    const location = new Location({
      name,
      address,
      plots: [],
    });

    await location.save();

    res.json({
      success: true,
      message: "Location created successfully",
      data: location,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update location
exports.updateLocation = async (req, res, next) => {
  try {
    const { name, address } = req.body;

    let location = await Location.findById(req.params.id);
    if (!location) {
      return next(new AppError("Location not found", 404));
    }

    location = await Location.findByIdAndUpdate(
      req.params.id,
      { name, address },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete location
exports.deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return next(new AppError("Location not found", 404));
    }

    await Plot.deleteMany({ locationId: req.params.id });
    await location.deleteOne();

    res.json({
      success: true,
      message: "Location and all associated plots deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
