const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const {
  login,
  getMe,
  changePassword,
  updateProfile,
  setSecretWord,
  verifySecretWord,
  resetPassword,
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
  body("phone")
    .optional()
    .matches(/^[0-9]{10,15}$/)
    .withMessage("Please include a valid phone number (10-15 digits)"),
];

const secretWordValidation = [
  body("secretWord")
    .isLength({ min: 4 })
    .withMessage("Secret word must be at least 4 characters"),
  body("confirmSecretWord")
    .notEmpty()
    .withMessage("Please confirm your secret word"),
];

const verifySecretWordValidation = [
  body("email").isEmail().withMessage("Please include a valid email"),
  body("secretWord").notEmpty().withMessage("Secret word is required"),
];

const resetPasswordValidation = [
  body("resetToken").notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password"),
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
router.post("/set-secret-word", [auth, secretWordValidation], setSecretWord);
router.post(
  "/verify-secret-word",
  verifySecretWordValidation,
  verifySecretWord,
);
router.post("/reset-password", resetPasswordValidation, resetPassword);

module.exports = router;
