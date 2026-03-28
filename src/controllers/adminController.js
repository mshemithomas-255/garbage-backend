const User = require("../models/User");

// @desc    Get all admins
// @route   GET /api/admins
// @access  Private (Super Admin only)
exports.getAdmins = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ msg: "Not authorized. Super admin only." });
    }

    const admins = await User.find({
      role: { $in: ["superadmin", "admin"] },
    }).select("-password");

    res.json(admins);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Create admin
// @route   POST /api/admins
// @access  Private (Super Admin only)
exports.createAdmin = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ msg: "Not authorized. Super admin only." });
    }

    const { name, email, password, role } = req.body;

    // Check if admin already exists
    let admin = await User.findOne({ email });
    if (admin) {
      return res.status(400).json({ msg: "Admin already exists" });
    }

    admin = new User({
      name,
      email,
      password,
      role: role || "admin",
    });

    await admin.save();

    // Return admin without password
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.json(adminResponse);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update admin
// @route   PUT /api/admins/:id
// @access  Private (Super Admin only)
exports.updateAdmin = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ msg: "Not authorized. Super admin only." });
    }

    const { name, email, role } = req.body;

    let admin = await User.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    // Prevent changing superadmin role
    if (admin.role === "superadmin" && role !== "superadmin") {
      return res.status(400).json({ msg: "Cannot change superadmin role" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role && admin.role !== "superadmin") updateData.role = role;

    admin = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json(admin);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Delete admin
// @route   DELETE /api/admins/:id
// @access  Private (Super Admin only)
exports.deleteAdmin = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ msg: "Not authorized. Super admin only." });
    }

    const admin = await User.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    // Prevent deleting superadmin
    if (admin.role === "superadmin") {
      return res.status(400).json({ msg: "Cannot delete superadmin" });
    }

    await admin.deleteOne();
    res.json({ msg: "Admin deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get admin by ID
// @route   GET /api/admins/:id
// @access  Private (Super Admin only)
exports.getAdmin = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ msg: "Not authorized. Super admin only." });
    }

    const admin = await User.findById(req.params.id).select("-password");
    if (!admin) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    res.json(admin);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
