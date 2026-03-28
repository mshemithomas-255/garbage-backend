const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const {
  login,
  getMe,
  changePassword,
  updateProfile,
} = require("../controllers/authController");

// Validation rules
const loginValidation = [
  body("email").isEmail().withMessage("Please include a valid email"),
  body("password").exists().withMessage("Password is required"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

const updateProfileValidation = [
  body("name").optional().notEmpty().withMessage("Name cannot be empty"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please include a valid email"),
];

// Routes
router.post("/login", loginValidation, login);
router.get("/me", auth, getMe);
router.put(
  "/change-password",
  [auth, changePasswordValidation],
  changePassword,
);
router.put("/update-profile", [auth, updateProfileValidation], updateProfile);

module.exports = router;
