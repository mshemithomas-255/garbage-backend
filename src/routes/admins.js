const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const {
  getAdmins,
  getAdmin,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} = require("../controllers/adminController");

// Validation rules
const adminValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please include a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

// Routes
router.get("/", auth, getAdmins);
router.get("/:id", auth, getAdmin);
router.post("/", [auth, adminValidation], createAdmin);
router.put("/:id", [auth, adminValidation], updateAdmin);
router.delete("/:id", auth, deleteAdmin);

module.exports = router;
