const User = require("../models/User");
const Plot = require("../models/Plot");
const bcrypt = require("bcryptjs");

// @desc    Get all users
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("plotId", "name")
      .select("-password");
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("plotId", "name")
      .select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Create a user
// @route   POST /api/users
// @access  Private (Admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    user = new User({
      name,
      email,
      password,
      role: role || "user",
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, paymentStatus, paidAmount } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount;

    user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    // If user is in a plot, update plot totals
    if (user.plotId) {
      const plot = await Plot.findById(user.plotId);
      if (plot) {
        const totalPaid = (await User.find({ plotId: plot._id })).reduce(
          (sum, u) => sum + (u.paidAmount || 0),
          0,
        );
        plot.paidAmount = totalPaid;
        await plot.save();

        // Update location totals
        const Location = require("../models/Location");
        const location = await Location.findById(plot.locationId);
        if (location) {
          const plots = await Plot.find({ locationId: location._id });
          location.totalPaidAmount = plots.reduce(
            (sum, p) => sum + (p.paidAmount || 0),
            0,
          );
          await location.save();
        }
      }
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Remove user from plot if assigned
    if (user.plotId) {
      const plot = await Plot.findById(user.plotId);
      if (plot) {
        plot.users = plot.users.filter(
          (userId) => userId.toString() !== req.params.id,
        );
        await plot.save();

        // Update plot totals
        const totalPaid = (await User.find({ plotId: plot._id })).reduce(
          (sum, u) => sum + (u.paidAmount || 0),
          0,
        );
        plot.paidAmount = totalPaid;
        await plot.save();
      }
    }

    await user.deleteOne();
    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Mark user as paid
// @route   PUT /api/users/:id/pay
// @access  Private (Admin only)
exports.markUserPaid = async (req, res) => {
  try {
    const { amount } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.paidAmount = (user.paidAmount || 0) + amount;

    // Update payment status based on paid amount
    // Assuming monthly fee is 100, you can adjust this
    const monthlyFee = 100;
    if (user.paidAmount >= monthlyFee) {
      user.paymentStatus = "paid";
    } else if (user.paidAmount > 0) {
      user.paymentStatus = "partial";
    } else {
      user.paymentStatus = "pending";
    }

    await user.save();

    // Update plot totals if user is in a plot
    if (user.plotId) {
      const plot = await Plot.findById(user.plotId);
      if (plot) {
        const totalPaid = (await User.find({ plotId: plot._id })).reduce(
          (sum, u) => sum + (u.paidAmount || 0),
          0,
        );
        plot.paidAmount = totalPaid;
        await plot.save();

        // Update location totals
        const Location = require("../models/Location");
        const location = await Location.findById(plot.locationId);
        if (location) {
          const plots = await Plot.find({ locationId: location._id });
          location.totalPaidAmount = plots.reduce(
            (sum, p) => sum + (p.paidAmount || 0),
            0,
          );
          await location.save();
        }
      }
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get users by plot
// @route   GET /api/users/plot/:plotId
// @access  Private
exports.getUsersByPlot = async (req, res) => {
  try {
    const users = await User.find({ plotId: req.params.plotId }).select(
      "-password",
    );
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
