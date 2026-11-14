
const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    source: {
      type: String,
      enum: ["website", "referral", "social_media", "other"],
      default: "other",
    },

    status: {
      type: String,
      enum: ["new", "contacted", "converted", "closed"],
      default: "new",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    convertedClient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
  },
  { timestamps: true }
);

leadSchema.index({ therapist: 1, createdAt: -1 });

module.exports = mongoose.model("Lead", leadSchema);
