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

const adminValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please include a valid email"),
  body("phone")
    .matches(/^[0-9]{10,15}$/)
    .withMessage("Please include a valid phone number (10-15 digits)"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const updateAdminValidation = [
  body("name").optional().notEmpty().withMessage("Name cannot be empty"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please include a valid email"),
  body("phone")
    .optional()
    .matches(/^[0-9]{10,15}$/)
    .withMessage("Please include a valid phone number (10-15 digits)"),
];

router.get("/", auth, getAdmins);
router.get("/:id", auth, getAdmin);
router.post("/", [auth, adminValidation], createAdmin);
router.put("/:id", [auth, updateAdminValidation], updateAdmin);
router.delete("/:id", auth, deleteAdmin);

module.exports = router;
