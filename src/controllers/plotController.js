const Plot = require("../models/Plot");
const Location = require("../models/Location");
const User = require("../models/User");

// @desc    Get all plots
// @route   GET /api/plots
// @access  Private
exports.getPlots = async (req, res) => {
  try {
    const plots = await Plot.find()
      .populate("users", "name email paymentStatus paidAmount")
      .populate("locationId", "name address");
    res.json(plots);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get single plot
// @route   GET /api/plots/:id
// @access  Private
exports.getPlot = async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id)
      .populate("users", "name email paymentStatus paidAmount")
      .populate("locationId", "name address");

    if (!plot) {
      return res.status(404).json({ msg: "Plot not found" });
    }

    res.json(plot);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Create a plot
// @route   POST /api/plots
// @access  Private (Admin only)
exports.createPlot = async (req, res) => {
  try {
    const { name, locationId, expectedAmount, paidAmount, expenses } = req.body;

    // Check if location exists
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ msg: "Location not found" });
    }

    const plot = new Plot({
      name,
      locationId,
      expectedAmount: expectedAmount || 0,
      paidAmount: paidAmount || 0,
      expenses: expenses || 0,
      users: [],
    });

    await plot.save();

    // Add plot to location
    location.plots.push(plot._id);
    await location.save();

    // Update location totals
    await updateLocationTotals(locationId);

    // Return populated plot
    const populatedPlot = await Plot.findById(plot._id).populate(
      "locationId",
      "name address",
    );

    res.json(populatedPlot);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update plot
// @route   PUT /api/plots/:id
// @access  Private (Admin only)
exports.updatePlot = async (req, res) => {
  try {
    const { name, expectedAmount, paidAmount, expenses, locationId } = req.body;

    let plot = await Plot.findById(req.params.id);
    if (!plot) {
      return res.status(404).json({ msg: "Plot not found" });
    }

    // If location is being changed, update both locations
    if (locationId && locationId !== plot.locationId.toString()) {
      // Remove from old location
      await Location.findByIdAndUpdate(plot.locationId, {
        $pull: { plots: plot._id },
      });

      // Add to new location
      await Location.findByIdAndUpdate(locationId, {
        $push: { plots: plot._id },
      });

      plot.locationId = locationId;
    }

    plot.name = name || plot.name;
    plot.expectedAmount =
      expectedAmount !== undefined ? expectedAmount : plot.expectedAmount;
    plot.paidAmount = paidAmount !== undefined ? paidAmount : plot.paidAmount;
    plot.expenses = expenses !== undefined ? expenses : plot.expenses;

    await plot.save();

    // Update location totals for both old and new locations
    if (locationId && locationId !== plot.locationId) {
      await updateLocationTotals(plot.locationId);
      await updateLocationTotals(locationId);
    } else {
      await updateLocationTotals(plot.locationId);
    }

    const populatedPlot = await Plot.findById(plot._id)
      .populate("users", "name email paymentStatus paidAmount")
      .populate("locationId", "name address");

    res.json(populatedPlot);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update plot
// @route   PUT /api/plots/:id
// @access  Private (Admin only)
exports.updatePlot = async (req, res) => {
  try {
    const { name, expectedAmount, paidAmount, expenses } = req.body;

    let plot = await Plot.findById(req.params.id);
    if (!plot) {
      return res.status(404).json({ msg: "Plot not found" });
    }

    plot = await Plot.findByIdAndUpdate(
      req.params.id,
      { name, expectedAmount, paidAmount, expenses },
      { new: true, runValidators: true },
    );

    // Update location totals
    await updateLocationTotals(plot.locationId);

    res.json(plot);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Delete plot
// @route   DELETE /api/plots/:id
// @access  Private (Admin only)
exports.deletePlot = async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id);
    if (!plot) {
      return res.status(404).json({ msg: "Plot not found" });
    }

    // Remove plot reference from location
    await Location.findByIdAndUpdate(plot.locationId, {
      $pull: { plots: plot._id },
    });

    // Remove plot reference from users
    await User.updateMany({ plotId: plot._id }, { $unset: { plotId: "" } });

    // Delete the plot
    await plot.deleteOne();

    // Update location totals
    await updateLocationTotals(plot.locationId);

    res.json({ msg: "Plot deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Add user to plot
// @route   POST /api/plots/:id/users
// @access  Private (Admin only)
exports.addUserToPlot = async (req, res) => {
  try {
    const { userId } = req.body;

    const plot = await Plot.findById(req.params.id);
    if (!plot) {
      return res.status(404).json({ msg: "Plot not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if user is already in a plot
    if (user.plotId) {
      return res
        .status(400)
        .json({ msg: "User is already assigned to a plot" });
    }

    // Add user to plot
    plot.users.push(userId);
    await plot.save();

    // Update user's plot reference
    user.plotId = plot._id;
    await user.save();

    // Update plot totals
    await updatePlotTotals(plot._id);

    const updatedPlot = await Plot.findById(plot._id).populate(
      "users",
      "name email paymentStatus paidAmount",
    );
    res.json(updatedPlot);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Remove user from plot
// @route   DELETE /api/plots/:id/users/:userId
// @access  Private (Admin only)
exports.removeUserFromPlot = async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id);
    if (!plot) {
      return res.status(404).json({ msg: "Plot not found" });
    }

    // Remove user from plot
    plot.users = plot.users.filter(
      (userId) => userId.toString() !== req.params.userId,
    );
    await plot.save();

    // Remove plot reference from user
    await User.findByIdAndUpdate(req.params.userId, {
      $unset: { plotId: "" },
    });

    // Update plot totals
    await updatePlotTotals(plot._id);

    const updatedPlot = await Plot.findById(plot._id).populate(
      "users",
      "name email paymentStatus paidAmount",
    );
    res.json(updatedPlot);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Helper functions remain the same...
const updatePlotTotals = async (plotId) => {
  const plot = await Plot.findById(plotId).populate("users");
  const totalPaid = plot.users.reduce(
    (sum, user) => sum + (user.paidAmount || 0),
    0,
  );

  plot.paidAmount = totalPaid;
  await plot.save();

  await updateLocationTotals(plot.locationId);
};

const updateLocationTotals = async (locationId) => {
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
};
