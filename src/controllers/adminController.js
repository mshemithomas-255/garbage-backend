const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { AppError } = require("../middleware/errorHandler");

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// @desc    Get all admins
exports.getAdmins = async (req, res, next) => {
  try {
    if (req.user.role !== "superadmin") {
      return next(new AppError("Not authorized. Super admin only.", 403));
    }

    const admins = await User.find({
      role: { $in: ["superadmin", "admin"] },
    }).select("-password -secretWord");

    res.json({
      success: true,
      data: admins,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create admin
exports.createAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "superadmin") {
      return next(new AppError("Not authorized. Super admin only.", 403));
    }

    const { name, email, phone, password, role } = req.body;

    let admin = await User.findOne({ $or: [{ email }, { phone }] });
    if (admin) {
      if (admin.email === email) {
        return next(new AppError("Email already exists", 400));
      }
      if (admin.phone === phone) {
        return next(new AppError("Phone number already exists", 400));
      }
    }

    const hashedPassword = await hashPassword(password);

    admin = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || "admin",
    });

    await admin.save();

    const adminResponse = admin.toObject();
    delete adminResponse.password;
    delete adminResponse.secretWord;

    res.json({
      success: true,
      message: "Admin created successfully",
      data: adminResponse,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update admin
exports.updateAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "superadmin") {
      return next(new AppError("Not authorized. Super admin only.", 403));
    }

    const { name, email, phone, role } = req.body;

    let admin = await User.findById(req.params.id);
    if (!admin) {
      return next(new AppError("Admin not found", 404));
    }

    if (admin.role === "superadmin" && role !== "superadmin") {
      return next(new AppError("Cannot change superadmin role", 400));
    }

    if (email && email !== admin.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return next(new AppError("Email already in use", 400));
      }
      admin.email = email;
    }

    if (phone && phone !== admin.phone) {
      const existingUser = await User.findOne({
        phone,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return next(new AppError("Phone number already in use", 400));
      }
      admin.phone = phone;
    }

    if (name) admin.name = name;
    if (role && admin.role !== "superadmin") admin.role = role;

    await admin.save();

    const adminResponse = admin.toObject();
    delete adminResponse.password;
    delete adminResponse.secretWord;

    res.json({
      success: true,
      message: "Admin updated successfully",
      data: adminResponse,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete admin
exports.deleteAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "superadmin") {
      return next(new AppError("Not authorized. Super admin only.", 403));
    }

    const admin = await User.findById(req.params.id);
    if (!admin) {
      return next(new AppError("Admin not found", 404));
    }

    if (admin.role === "superadmin") {
      return next(new AppError("Cannot delete superadmin", 400));
    }

    await admin.deleteOne();

    res.json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get admin by ID
exports.getAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "superadmin") {
      return next(new AppError("Not authorized. Super admin only.", 403));
    }

    const admin = await User.findById(req.params.id).select(
      "-password -secretWord",
    );
    if (!admin) {
      return next(new AppError("Admin not found", 404));
    }

    res.json({
      success: true,
      data: admin,
    });
  } catch (err) {
    next(err);
  }
};
