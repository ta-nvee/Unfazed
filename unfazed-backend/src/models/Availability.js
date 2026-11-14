
const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
    },

    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Optional date for a specific availability override
    date: {
      type: String,
      default: null,
    },

    // Identifies whether this is a weekly rule or a date-specific rule
    availabilityType: {
      type: String,
      enum: ["weekly", "date-specific"],
      default: "weekly",
    },
  },
  { timestamps: true }
);

availabilitySchema.index({ therapist: 1, dayOfWeek: 1 });
availabilitySchema.index({ therapist: 1, date: 1 });

module.exports = mongoose.model("Availability", availabilitySchema);
