
const crypto = require("crypto");

const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");
const SubscriptionPayment = require("../models/SubscriptionPayment");
const Therapist = require("../models/Therapist");
const razorpay = require("../config/razorpay");

// ==========================================
// GET ALL ACTIVE SUBSCRIPTION PLANS
// ==========================================

const getSubscriptionTiers = async (req, res) => {
  try {
    const tiers = await SubscriptionTierConfig.find({
      isActive: true,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: tiers.length,
      tiers,
    });
  } catch (error) {
    console.error("Get subscription tiers error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subscription plans.",
    });
  }
};

// ==========================================
// GET SUBSCRIPTION PLAN BY TIER KEY
// ==========================================

const getSubscriptionTierByKey = async (req, res) => {
  try {
    const { tierKey } = req.params;

    const tier = await SubscriptionTierConfig.findOne({
      tierKey: tierKey.toLowerCase(),
      isActive: true,
    });

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found.",
      });
    }

    return res.status(200).json({
      success: true,
      tier,
    });
  } catch (error) {
    console.error("Get subscription tier error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subscription plan.",
    });
  }
};

// ==========================================
// GET CURRENT THERAPIST SUBSCRIPTION
// ==========================================

const getMySubscription = async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.therapist.id)
      .populate("subscriptionTier");

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found.",
      });
    }

    return res.status(200).json({
      success: true,
      subscription: therapist.subscriptionTier || null,
    });
  } catch (error) {
    console.error("Get my subscription error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch current subscription.",
    });
  }
};

// ==========================================
// CREATE SUBSCRIPTION RAZORPAY ORDER
// ==========================================

const createSubscriptionOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Razorpay is not configured.",
      });
    }

    const therapistId = req.therapist.id;
    const { tierKey } = req.body;

    if (!["growth", "professional"].includes(tierKey)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid paid subscription plan.",
      });
    }

    const therapist = await Therapist.findById(therapistId)
      .populate("subscriptionTier");

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found.",
      });
    }

    const tier = await SubscriptionTierConfig.findOne({
      tierKey,
      isActive: true,
    });

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: "Selected subscription plan is unavailable.",
      });
    }

    const currentTierKey = therapist.subscriptionTier?.tierKey;

    const planRank = {
      starter: 0,
      growth: 1,
      professional: 2,
    };

    if (
      currentTierKey &&
      planRank[tierKey] <= (planRank[currentTierKey] ?? -1)
    ) {
      return res.status(400).json({
        success: false,
        message: "You can only upgrade to a higher subscription plan.",
      });
    }

    if (!Number.isFinite(tier.price) || tier.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan price.",
      });
    }

    const amountInPaise = Math.round(tier.price * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: tier.currency || "INR",
      receipt: `sub_${Date.now()}`,
      notes: {
        therapistId: therapistId.toString(),
        tierKey: tier.tierKey,
      },
    });

    await SubscriptionPayment.create({
      therapist: therapistId,
      subscriptionTier: tier._id,
      tierKey: tier.tierKey,
      amount: tier.price,
      currency: tier.currency || "INR",
      status: "pending",
      razorpayOrderId: order.id,
    });

    return res.status(201).json({
      success: true,
      message: "Subscription payment order created.",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      tier: {
        name: tier.name,
        tierKey: tier.tierKey,
        price: tier.price,
      },
    });
  } catch (error) {
    console.error("Create subscription order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create subscription payment order.",
    });
  }
};

// ==========================================
// VERIFY SUBSCRIPTION PAYMENT
// ==========================================

const verifySubscriptionPayment = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Razorpay is not configured.",
      });
    }

    const therapistId = req.therapist.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are required.",
      });
    }

    const payment = await SubscriptionPayment.findOne({
      razorpayOrderId: razorpay_order_id,
      therapist: therapistId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Subscription payment order not found.",
      });
    }

    // Prevent duplicate verification from changing the plan again.
    if (payment.status === "paid") {
      if (payment.razorpayPaymentId !== razorpay_payment_id) {
        return res.status(400).json({
          success: false,
          message: "This order has already been paid.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Subscription payment was already verified.",
      });
    }

    // Verify Razorpay signature.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(razorpay_signature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    // Confirm payment status and amount with Razorpay.
    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      razorpayPayment.status !== "captured" ||
      razorpayPayment.amount !== Math.round(payment.amount * 100) ||
      razorpayPayment.currency !== payment.currency
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not captured or payment details do not match.",
      });
    }

    const therapist = await Therapist.findById(therapistId);

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found.",
      });
    }

    const tier = await SubscriptionTierConfig.findOne({
      _id: payment.subscriptionTier,
      tierKey: payment.tierKey,
      isActive: true,
    });

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan is no longer available.",
      });
    }

    // Upgrade the therapist's subscription.
    therapist.subscriptionTier = tier._id;
    await therapist.save();

    // Mark the payment as successful.
    payment.status = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paidAt = new Date();

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Subscription upgraded successfully.",
      subscription: {
        tierKey: tier.tierKey,
        name: tier.name,
        price: tier.price,
        currency: tier.currency,
      },
    });
  } catch (error) {
    console.error("Verify subscription payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify subscription payment.",
    });
  }
};

module.exports = {
  getSubscriptionTiers,
  getSubscriptionTierByKey,
  getMySubscription,
  createSubscriptionOrder,
  verifySubscriptionPayment,
};
