
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
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

    // Package used to pay for this session, if applicable.
    clientPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientPackage",
      default: null,
      index: true,
    },

    // Prevents duplicate session deductions.
    packageSessionDeducted: {
      type: Boolean,
      default: false,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },

    sessionType: {
      type: String,
      enum: ["online", "in-person"],
      default: "online",
    },

    meetingLink: {
      type: String,
      default: "",
      trim: true,
    },

    fee: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ therapist: 1, startTime: 1 });
sessionSchema.index({ client: 1, startTime: 1 });

module.exports = mongoose.model("Session", sessionSchema);
