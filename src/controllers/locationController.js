const Location = require("../models/Location");
const Plot = require("../models/Plot");
const { AppError } = require("../middleware/errorHandler");

// Helper function to update location totals
const updateLocationTotalsHelper = async (locationId) => {
  const plots = await Plot.find({ locationId });
  const location = await Location.findById(locationId);

  if (location) {
    location.totalExpectedAmount = plots.reduce(
      (sum, plot) => sum + (plot.expectedAmount || 0),
      0,
    );
    location.totalPaidAmount = plots.reduce(
      (sum, plot) => sum + (plot.paidAmount || 0),
      0,
    );
    location.totalExpenses = plots.reduce(
      (sum, plot) => sum + (plot.expenses || 0),
      0,
    );
    await location.save();
  }
  return location;
};

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
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

// @desc    Get single location by ID
// @route   GET /api/locations/:id
// @access  Private
exports.getLocation = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id).populate({
      path: "plots",
      populate: {
        path: "users",
        select: "name email paymentStatus paidAmount",
      },
    });

    if (!location) {
      return next(new AppError("Location not found", 404));
    }

    res.json({
      success: true,
      data: location,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a location
// @route   POST /api/locations
// @access  Private (Admin only)
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
      totalExpectedAmount: 0,
      totalPaidAmount: 0,
      totalExpenses: 0,
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
// @route   PUT /api/locations/:id
// @access  Private (Admin only)
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
    ).populate({
      path: "plots",
      populate: {
        path: "users",
        select: "name email paymentStatus paidAmount",
      },
    });

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
// @route   DELETE /api/locations/:id
// @access  Private (Admin only)
exports.deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return next(new AppError("Location not found", 404));
    }

    // First, get all plots in this location to update their users
    const plots = await Plot.find({ locationId: req.params.id });

    // Remove plot reference from users
    for (const plot of plots) {
      await User.updateMany({ plotId: plot._id }, { $unset: { plotId: "" } });
    }

    // Delete all plots in this location
    await Plot.deleteMany({ locationId: req.params.id });

    // Delete the location
    await location.deleteOne();

    res.json({
      success: true,
      message: "Location and all associated plots deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update location totals (expected amount, paid amount, expenses)
// @route   PUT /api/locations/:id/update-totals
// @access  Private (Admin only)
exports.updateLocationTotals = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return next(new AppError("Location not found", 404));
    }

    // Get all plots in this location
    const plots = await Plot.find({ locationId: req.params.id });

    // Calculate totals
    const totalExpectedAmount = plots.reduce(
      (sum, plot) => sum + (plot.expectedAmount || 0),
      0,
    );
    const totalPaidAmount = plots.reduce(
      (sum, plot) => sum + (plot.paidAmount || 0),
      0,
    );
    const totalExpenses = plots.reduce(
      (sum, plot) => sum + (plot.expenses || 0),
      0,
    );

    // Update location totals
    location.totalExpectedAmount = totalExpectedAmount;
    location.totalPaidAmount = totalPaidAmount;
    location.totalExpenses = totalExpenses;

    await location.save();

    // Return updated location with populated plots
    const updatedLocation = await Location.findById(req.params.id).populate({
      path: "plots",
      populate: {
        path: "users",
        select: "name email paymentStatus paidAmount",
      },
    });

    res.json({
      success: true,
      message: "Location totals updated successfully",
      data: updatedLocation,
    });
  } catch (err) {
    next(err);
  }
};
