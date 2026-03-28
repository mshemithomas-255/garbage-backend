const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  markUserPaid,
  getUsersByPlot,
} = require("../controllers/userController");

// Validation rules
const userValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please include a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const paymentValidation = [
  body("amount")
    .isNumeric()
    .withMessage("Amount must be a number")
    .isFloat({ min: 0 })
    .withMessage("Amount must be positive"),
];

// Routes
router.get("/", auth, getUsers);
router.get("/plot/:plotId", auth, getUsersByPlot);
router.get("/:id", auth, getUser);
router.post("/", [auth, userValidation], createUser);
router.put("/:id", [auth, userValidation], updateUser);
router.delete("/:id", auth, deleteUser);
router.put("/:id/pay", [auth, paymentValidation], markUserPaid);

module.exports = router;
