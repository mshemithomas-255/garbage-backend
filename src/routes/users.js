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

const userValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please include a valid email"),
  body("phone")
    .matches(/^[0-9]{10,15}$/)
    .withMessage("Please include a valid phone number (10-15 digits)"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const updateUserValidation = [
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

const paymentValidation = [
  body("amount")
    .isNumeric()
    .withMessage("Amount must be a number")
    .isFloat({ min: 0 })
    .withMessage("Amount must be positive"),
];

router.get("/", auth, getUsers);
router.get("/plot/:plotId", auth, getUsersByPlot);
router.get("/:id", auth, getUser);
router.post("/", [auth, userValidation], createUser);
router.put("/:id", [auth, updateUserValidation], updateUser);
router.delete("/:id", auth, deleteUser);
router.put("/:id/pay", [auth, paymentValidation], markUserPaid);

module.exports = router;
