
const mongoose = require("mongoose");

const clientPackageSchema = new mongoose.Schema(
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

    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },

    // Payment that activated this client package.
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: undefined,
    },

    sessionsTotal: {
      type: Number,
      required: true,
      min: 1,
    },

    sessionsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    purchasedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "expired", "cancelled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

clientPackageSchema.index({
  therapist: 1,
  client: 1,
  status: 1,
});

// One payment can activate only one client package.
clientPackageSchema.index(
  { payment: 1 },
  {
    unique: true,
    sparse: true,
  }
);

module.exports = mongoose.model("ClientPackage", clientPackageSchema);
