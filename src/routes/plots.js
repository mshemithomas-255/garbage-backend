const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const {
  getPlots,
  getPlot,
  createPlot,
  updatePlot,
  deletePlot,
  addUserToPlot,
  removeUserFromPlot,
} = require("../controllers/plotController");

// Validation rules
const plotValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("locationId").notEmpty().withMessage("Location ID is required"),
];

const userValidation = [
  body("userId").notEmpty().withMessage("User ID is required"),
];

// Routes
router.get("/", auth, getPlots);
router.get("/:id", auth, getPlot);
router.post("/", [auth, plotValidation], createPlot);
router.put("/:id", [auth, plotValidation], updatePlot);
router.delete("/:id", auth, deletePlot);
router.post("/:id/users", [auth, userValidation], addUserToPlot);
router.delete("/:id/users/:userId", auth, removeUserFromPlot);

module.exports = router;
