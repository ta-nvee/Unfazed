
const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    isBooked: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },
  },
  { timestamps: true }
);

availabilitySchema.index({ therapist: 1, startTime: 1 });

module.exports = mongoose.model("Availability", availabilitySchema);

