const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { user: { id: userId, role } },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" },
  );
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = generateToken(user._id, user.role);

    res.json({
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
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -secretWord",
    );
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Find user by ID
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: "Current password is incorrect" });
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ msg: "New password must be different from current password" });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user._id, user.role);

    res.json({
      msg: "Password changed successfully",
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
    console.error("Error in changePassword:", err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Set secret word for password recovery
// @route   POST /api/auth/set-secret-word
// @access  Private
exports.setSecretWord = async (req, res) => {
  try {
    const { secretWord, confirmSecretWord } = req.body;

    if (secretWord !== confirmSecretWord) {
      return res.status(400).json({ msg: "Secret words do not match" });
    }

    if (secretWord.length < 4) {
      return res
        .status(400)
        .json({ msg: "Secret word must be at least 4 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Hash and save secret word
    const salt = await bcrypt.genSalt(10);
    user.secretWord = await bcrypt.hash(secretWord, salt);
    user.secretWordSet = true;
    await user.save();

    res.json({
      msg: "Secret word set successfully",
      secretWordSet: true,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Verify secret word for password recovery
// @route   POST /api/auth/verify-secret-word
// @access  Public
exports.verifySecretWord = async (req, res) => {
  try {
    const { email, secretWord } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!user.secretWordSet) {
      return res
        .status(400)
        .json({ msg: "Secret word not set for this account" });
    }

    const isMatch = await user.compareSecretWord(secretWord);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid secret word" });
    }

    // Generate temporary token for password reset
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "15m" },
    );

    res.json({
      msg: "Secret word verified",
      resetToken,
      userId: user._id,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Reset password using secret word
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords do not match" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ msg: "Password must be at least 6 characters" });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || "secret");
    } catch (err) {
      return res.status(400).json({ msg: "Invalid or expired reset token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if new password is same as old
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ msg: "New password must be different from current password" });
    }

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Generate new login token
    const loginToken = generateToken(user._id, user.role);

    res.json({
      msg: "Password reset successfully",
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
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user.id },
      });
      if (existingUser) {
        return res.status(400).json({ msg: "Email already in use" });
      }
      user.email = email;
    }

    if (name) user.name = name;

    await user.save();

    // Generate new token
    const token = generateToken(user._id, user.role);

    res.json({
      msg: "Profile updated successfully",
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
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
