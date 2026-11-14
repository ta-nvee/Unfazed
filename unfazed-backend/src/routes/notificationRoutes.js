
const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markNotificationRead,
} = require("../controllers/notificationController");

const authMiddleware = require("../middleware/authMiddleware");
const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");

// Client notification routes
router.get("/client", clientAuthMiddleware, getNotifications);
router.patch(
  "/client/:id/read",
  clientAuthMiddleware,
  markNotificationRead
);

// Therapist notification routes
router.get("/therapist", authMiddleware, getNotifications);
router.patch(
  "/therapist/:id/read",
  authMiddleware,
  markNotificationRead
);

module.exports = router;
