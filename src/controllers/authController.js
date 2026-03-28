const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const { AppError } = require("../middleware/errorHandler");

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { user: { id: userId, role } },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" },
  );
};

// Helper function to hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError("Invalid email or password", 401));
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        secretWordSet: user.secretWordSet,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError("Current password is incorrect", 400));
    }

    if (currentPassword === newPassword) {
      return next(
        new AppError(
          "New password must be different from current password",
          400,
        ),
      );
    }

    if (newPassword.length < 6) {
      return next(new AppError("Password must be at least 6 characters", 400));
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: "Password changed successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        secretWordSet: user.secretWordSet,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Set secret word
// @route   POST /api/auth/set-secret-word
// @access  Private
exports.setSecretWord = async (req, res, next) => {
  try {
    const { secretWord, confirmSecretWord } = req.body;

    if (secretWord !== confirmSecretWord) {
      return next(new AppError("Secret words do not match", 400));
    }

    if (secretWord.length < 4) {
      return next(
        new AppError("Secret word must be at least 4 characters", 400),
      );
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    user.secretWord = await hashPassword(secretWord);
    user.secretWordSet = true;
    await user.save();

    res.json({
      success: true,
      message:
        "Secret word set successfully! You can now use it for password recovery.",
      secretWordSet: true,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify secret word
// @route   POST /api/auth/verify-secret-word
// @access  Public
exports.verifySecretWord = async (req, res, next) => {
  try {
    const { email, secretWord } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError("No account found with this email", 404));
    }

    if (!user.secretWordSet) {
      return next(
        new AppError(
          "Secret word not set for this account. Please contact admin.",
          400,
        ),
      );
    }

    const isMatch = await user.compareSecretWord(secretWord);
    if (!isMatch) {
      return next(new AppError("Invalid secret word. Please try again.", 400));
    }

    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "15m" },
    );

    res.json({
      success: true,
      message: "Secret word verified successfully",
      resetToken,
      userId: user._id,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password using secret word
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return next(new AppError("Passwords do not match", 400));
    }

    if (newPassword.length < 6) {
      return next(new AppError("Password must be at least 6 characters", 400));
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || "secret");
    } catch (err) {
      return next(
        new AppError("Reset link has expired. Please try again.", 400),
      );
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return next(
        new AppError(
          "New password must be different from current password",
          400,
        ),
      );
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    const loginToken = generateToken(user._id, user.role);

    res.json({
      success: true,
      message:
        "Password reset successfully! You can now login with your new password.",
      token: loginToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        secretWordSet: user.secretWordSet,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user.id },
      });
      if (existingUser) {
        return next(
          new AppError("Email already in use by another account", 400),
        );
      }
      user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: "Profile updated successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        secretWordSet: user.secretWordSet,
      },
    });
  } catch (err) {
    next(err);
  }
};
