
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const entitlementMiddleware = require("../middleware/entitlementMiddleware");
const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");
const {
  createSession,
  getSessions,
  updateSession,
  cancelSession,
  setAvailability,
  blockAvailability,
  getAvailability,
  deleteAvailability,
  getPublicAvailability,
  createPublicBooking,
} = require("../controllers/schedulingController");

// ==========================================
// PUBLIC BOOKING ROUTES
// ==========================================

router.get("/public/:slug/availability", getPublicAvailability);
router.post(
  "/public/:slug/book",
  clientAuthMiddleware,
  createPublicBooking
);

// ==========================================
// THERAPIST ROUTES
// ==========================================

router.use(authMiddleware);

// Session management
router.post(
  "/",
  entitlementMiddleware("maxSessions"),
  createSession
);

router.get("/", getSessions);
router.put("/:id", updateSession);
router.patch("/:id/cancel", cancelSession);

// Weekly availability
router.post("/availability", setAvailability);
router.get("/availability", getAvailability);

// Block a specific date and time
router.post("/availability/block", blockAvailability);

// Delete availability or a blocked time
router.delete("/availability/:id", deleteAvailability);

module.exports = router;
