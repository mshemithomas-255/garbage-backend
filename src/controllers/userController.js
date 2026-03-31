const User = require("../models/User");
const Plot = require("../models/Plot");
const bcrypt = require("bcryptjs");
const { AppError } = require("../middleware/errorHandler");

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// @desc    Get all users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate("plotId", "name")
      .select("-password -secretWord");
    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("plotId", "name")
      .select("-password -secretWord");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a user
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { phone }] });
    if (user) {
      if (user.email === email) {
        return next(new AppError("Email already exists", 400));
      }
      if (user.phone === phone) {
        return next(new AppError("Phone number already exists", 400));
      }
    }

    const hashedPassword = await hashPassword(password);

    user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || "user",
    });

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.secretWord;

    res.json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, paymentStatus, paidAmount } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check email uniqueness
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return next(new AppError("Email already in use", 400));
      }
      user.email = email;
    }

    // Check phone uniqueness
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({
        phone,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return next(new AppError("Phone number already in use", 400));
      }
      user.phone = phone;
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (paymentStatus) user.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) user.paidAmount = paidAmount;

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.secretWord;

    // Update plot totals if needed
    if (user.plotId) {
      const plot = await Plot.findById(user.plotId);
      if (plot) {
        const totalPaid = (await User.find({ plotId: plot._id })).reduce(
          (sum, u) => sum + (u.paidAmount || 0),
          0,
        );
        plot.paidAmount = totalPaid;
        await plot.save();

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

    res.json({
      success: true,
      message: "User updated successfully",
      data: userResponse,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.plotId) {
      const plot = await Plot.findById(user.plotId);
      if (plot) {
        plot.users = plot.users.filter(
          (userId) => userId.toString() !== req.params.id,
        );
        await plot.save();

        const totalPaid = (await User.find({ plotId: plot._id })).reduce(
          (sum, u) => sum + (u.paidAmount || 0),
          0,
        );
        plot.paidAmount = totalPaid;
        await plot.save();
      }
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark user as paid
exports.markUserPaid = async (req, res, next) => {
  try {
    const { amount } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    user.paidAmount = (user.paidAmount || 0) + amount;

    const monthlyFee = 100;
    if (user.paidAmount >= monthlyFee) {
      user.paymentStatus = "paid";
    } else if (user.paidAmount > 0) {
      user.paymentStatus = "partial";
    } else {
      user.paymentStatus = "pending";
    }

    await user.save();

    if (user.plotId) {
      const plot = await Plot.findById(user.plotId);
      if (plot) {
        const totalPaid = (await User.find({ plotId: plot._id })).reduce(
          (sum, u) => sum + (u.paidAmount || 0),
          0,
        );
        plot.paidAmount = totalPaid;
        await plot.save();

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

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.secretWord;

    res.json({
      success: true,
      message: `Payment of KSh ${amount} added successfully`,
      data: userResponse,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get users by plot
exports.getUsersByPlot = async (req, res, next) => {
  try {
    const users = await User.find({ plotId: req.params.plotId }).select(
      "-password -secretWord",
    );
    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};
