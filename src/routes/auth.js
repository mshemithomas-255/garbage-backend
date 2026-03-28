const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const { login, getMe } = require("../controllers/authController");

// Validation rules
const loginValidation = [
  body("email").isEmail().withMessage("Please include a valid email"),
  body("password").exists().withMessage("Password is required"),
];

// Routes
router.post("/login", loginValidation, login);
router.get("/me", auth, getMe);

module.exports = router;
