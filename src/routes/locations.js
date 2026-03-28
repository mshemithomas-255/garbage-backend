const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
  updateLocationTotals,
} = require("../controllers/locationController");

// Validation rules
const locationValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("address").notEmpty().withMessage("Address is required"),
];

// Routes
router.get("/", auth, getLocations);
router.get("/:id", auth, getLocation);
router.post("/", [auth, locationValidation], createLocation);
router.put("/:id", [auth, locationValidation], updateLocation);
router.delete("/:id", auth, deleteLocation);
router.put("/:id/update-totals", auth, updateLocationTotals);

module.exports = router;
