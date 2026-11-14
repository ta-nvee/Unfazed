
const express = require("express");
const router = express.Router();

const {
  getSubscriptionTiers,
  getSubscriptionTierByKey,
  getMySubscription,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} = require("../controllers/subscriptionController");

const authMiddleware = require("../middleware/authMiddleware");

// Current subscription
router.get("/my-subscription", authMiddleware, getMySubscription);

// Create Razorpay subscription order
router.post("/create-order", authMiddleware, createSubscriptionOrder);

// Verify Razorpay subscription payment
router.post("/verify-payment", authMiddleware, verifySubscriptionPayment);

// Get all active plans
router.get("/", getSubscriptionTiers);

// Get plan by tier key
router.get("/:tierKey", getSubscriptionTierByKey);

module.exports = router;
