
const express = require("express");
const router = express.Router();

const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");

const {
  getAvailablePackages,
  getMyPackages,
  createPackageOrder,
  verifyPackagePayment,
} = require("../controllers/clientPackageController");

// All client package routes require authentication.
router.use(clientAuthMiddleware);

// Get active packages offered by the therapist.
router.get("/", getAvailablePackages);

// Get packages purchased by the logged-in client.
router.get("/my-packages", getMyPackages);

// Create Razorpay order for a package.
router.post("/:packageId/create-order", createPackageOrder);

// Verify payment and activate the purchased package.
router.post("/verify", verifyPackagePayment);

module.exports = router;
