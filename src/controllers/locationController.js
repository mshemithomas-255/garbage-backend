const Location = require("../models/Location");
const Plot = require("../models/Plot");

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
exports.getLocations = async (req, res) => {
  try {
    const locations = await Location.find().populate({
      path: "plots",
      populate: {
        path: "users",
        select: "name email paymentStatus paidAmount",
      },
    });
    res.json(locations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get single location
// @route   GET /api/locations/:id
// @access  Private
exports.getLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id).populate({
      path: "plots",
      populate: {
        path: "users",
        select: "name email paymentStatus paidAmount",
      },
    });

    if (!location) {
      return res.status(404).json({ msg: "Location not found" });
    }

    res.json(location);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Create a location
// @route   POST /api/locations
// @access  Private (Admin only)
exports.createLocation = async (req, res) => {
  try {
    const { name, address } = req.body;

    const location = new Location({
      name,
      address,
      plots: [],
    });

    await location.save();
    res.json(location);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private (Admin only)
exports.updateLocation = async (req, res) => {
  try {
    const { name, address } = req.body;

    let location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ msg: "Location not found" });
    }

    location = await Location.findByIdAndUpdate(
      req.params.id,
      { name, address },
      { new: true, runValidators: true },
    );

    res.json(location);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private (Admin only)
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ msg: "Location not found" });
    }

    // Delete all plots in this location
    await Plot.deleteMany({ locationId: req.params.id });

    // Delete the location
    await location.deleteOne();

    res.json({ msg: "Location and associated plots deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update location totals
// @route   PUT /api/locations/:id/update-totals
// @access  Private (Admin only)
exports.updateLocationTotals = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ msg: "Location not found" });
    }

    const plots = await Plot.find({ locationId: req.params.id });

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

    res.json(location);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
