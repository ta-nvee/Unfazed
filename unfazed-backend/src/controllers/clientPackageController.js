
const mongoose = require("mongoose");
const crypto = require("crypto");

const razorpay = require("../config/razorpay");

const Package = require("../models/Package");
const ClientPackage = require("../models/ClientPackage");
const Payment = require("../models/Payment");

const {
  activatePackageFromPayment,
} = require("../services/packageActivationService");

// ==========================================
// GET AVAILABLE PACKAGES
// ==========================================

exports.getAvailablePackages = async (req, res, next) => {
  try {
    const packages = await Package.find({
      therapist: req.client.therapist,
      isActive: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET CLIENT'S PURCHASED PACKAGES
// ==========================================

exports.getMyPackages = async (req, res, next) => {
  try {
    const clientPackages = await ClientPackage.find({
      client: req.client._id,
      therapist: req.client.therapist,
    })
      .populate(
        "package",
        "name description sessionCount price validityDays"
      )
      .sort({ purchasedAt: -1 });

    return res.status(200).json({
      success: true,
      count: clientPackages.length,
      clientPackages,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE PACKAGE PAYMENT ORDER
// ==========================================

exports.createPackageOrder = async (req, res, next) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Razorpay is not configured.",
      });
    }

    const { packageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid package ID.",
      });
    }

    const selectedPackage = await Package.findOne({
      _id: packageId,
      therapist: req.client.therapist,
      isActive: true,
    });

    if (!selectedPackage) {
      return res.status(404).json({
        success: false,
        message: "Package not found or unavailable.",
      });
    }

    const amount = Number(selectedPackage.price);
    const amountInPaise = Math.round(amount * 100);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid package price.",
      });
    }

    // Confirm the client and therapist references are available.
    if (!req.client.therapist || !req.client._id) {
      return res.status(401).json({
        success: false,
        message: "Client authentication is invalid.",
      });
    }

    // Create Razorpay order using the database package price.
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `pkg_${Date.now()}`,
      notes: {
        clientId: req.client._id.toString(),
        therapistId: req.client.therapist.toString(),
        packageId: selectedPackage._id.toString(),
      },
    });

    if (!order || !order.id) {
      throw new Error("Razorpay did not return a valid order.");
    }

    // Store the pending payment.
    const payment = await Payment.create({
      therapist: req.client.therapist,
      client: req.client._id,
      paymentType: "package",
      package: selectedPackage._id,
      amount,
      platformFee: 0,
      netAmount: amount,
      currency: "INR",
      status: "pending",
      provider: "razorpay",
      razorpayOrderId: order.id,
    });

    return res.status(201).json({
      success: true,
      message: "Package payment order created.",
      order,
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VERIFY PACKAGE PAYMENT
// ==========================================

exports.verifyPackagePayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !razorpay_order_id.trim() ||
      !razorpay_payment_id.trim() ||
      !razorpay_signature.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid payment verification details are required.",
      });
    }

    if (!razorpay || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Razorpay is not configured correctly.",
      });
    }

    // Find the payment belonging to this authenticated client.
    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      client: req.client._id,
      therapist: req.client.therapist,
      paymentType: "package",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Package payment not found.",
      });
    }

    // Do not accept payments in invalid states.
    if (!["pending", "paid"].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: "This payment cannot be verified.",
      });
    }

    // Validate signature format.
    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature format.",
      });
    }

    // Verify Razorpay signature.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const received = Buffer.from(razorpay_signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    // Confirm payment directly with Razorpay.
    const gatewayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      !gatewayPayment ||
      gatewayPayment.order_id !== razorpay_order_id ||
      gatewayPayment.status !== "captured" ||
      gatewayPayment.captured !== true
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment has not been captured.",
      });
    }

    // Verify amount and currency against the stored payment.
    const expectedAmount = Math.round(Number(payment.amount) * 100);

    if (
      !Number.isSafeInteger(expectedAmount) ||
      gatewayPayment.amount !== expectedAmount ||
      gatewayPayment.currency !== payment.currency
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment amount or currency does not match.",
      });
    }

    // Activate package through the transaction-based service.
    const result = await activatePackageFromPayment(
      payment._id,
      razorpay_payment_id,
      razorpay_signature
    );

    return res.status(200).json({
      success: true,
      message: result.alreadyActivated
        ? "Package payment already verified."
        : "Package purchased and activated successfully.",
      clientPackage: result.clientPackage,
      payment: {
        id: result.payment._id,
        amount: result.payment.amount,
        status: result.payment.status,
        invoiceNumber: result.payment.invoiceNumber,
        invoiceGeneratedAt: result.payment.invoiceGeneratedAt,
      },
    });
  } catch (error) {
    if (
      error.message ===
      "Payment ID does not match this package payment."
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};
