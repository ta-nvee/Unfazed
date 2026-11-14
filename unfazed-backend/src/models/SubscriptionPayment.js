
const mongoose = require("mongoose");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },

    subscriptionTier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionTierConfig",
      required: true,
    },

    tierKey: {
      type: String,
      enum: ["growth", "professional"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    razorpaySignature: {
      type: String,
      default: null,
      select: false,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Unique only for actual Razorpay payment IDs.
// Multiple pending payments can have null payment IDs.
subscriptionPaymentSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpayPaymentId: { $type: "string" },
    },
  }
);

module.exports = mongoose.model(
  "SubscriptionPayment",
  subscriptionPaymentSchema
);
