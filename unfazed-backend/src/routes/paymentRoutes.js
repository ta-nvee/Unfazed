
const express = require("express");
const router = express.Router();

const {
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getPayments,
  downloadInvoice,
} = require("../controllers/paymentController");

const {
  createPublicPaymentOrder,
  verifyPublicPayment,
} = require("../controllers/publicPaymentController");

const authMiddleware = require("../middleware/authMiddleware");

// ==========================================
// PUBLIC CLIENT BOOKING PAYMENT ROUTES
// ==========================================

router.post("/public/create-order", createPublicPaymentOrder);
router.post("/public/verify", verifyPublicPayment);

// ==========================================
// RAZORPAY WEBHOOK
// ==========================================

router.post("/webhook", handleRazorpayWebhook);

// ==========================================
// THERAPIST AUTHENTICATION
// ==========================================

router.use(authMiddleware);

// Existing therapist payment routes
router.post("/create-order", createPaymentOrder);
router.post("/verify", verifyPayment);
router.get("/", getPayments);
router.get("/:paymentId/invoice", downloadInvoice);

module.exports = router;
