
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    paymentType: {
      type: String,
      enum: ["session", "package"],
      default: "session",
      index: true,
    },

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },

    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
    },

    clientPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientPackage",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    netAmount: {
      type: Number,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    provider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay",
    },

    razorpayOrderId: {
      type: String,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      default: undefined,
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

    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    invoiceGeneratedAt: {
      type: Date,
      default: null,
    },

    // Stored PDF location
    invoiceFilePath: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.pre("validate", function () {
  if (this.netAmount === undefined || this.netAmount === null) {
    this.netAmount = this.amount - this.platformFee;
  }
});

paymentSchema.index({ therapist: 1, client: 1, createdAt: -1 });

paymentSchema.index(
  { razorpayPaymentId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
