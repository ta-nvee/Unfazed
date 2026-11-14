
const express = require("express");
const router = express.Router();

const {
  getProfile,
  updateProfile,
  getPublicProfile,
  getPublicTherapists,
} = require("../controllers/therapistController");

const authMiddleware = require("../middleware/authMiddleware");

// Protected therapist profile routes
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

// Public therapist directory
router.get("/", getPublicTherapists);

// Public branded therapist profile
router.get("/:slug", getPublicProfile);

module.exports = router;
