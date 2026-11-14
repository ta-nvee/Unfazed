
const mongoose = require("mongoose");

const clientIntakeSchema = new mongoose.Schema(
  {
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      default: "",
    },

    occupation: {
      type: String,
      default: "",
    },

    presentingConcern: {
      type: String,
      default: "",
    },

    therapyHistory: {
      type: String,
      default: "",
    },

    medicalHistory: {
      type: String,
      default: "",
    },

    medications: {
      type: String,
      default: "",
    },

    emergencyContactName: {
      type: String,
      default: "",
    },

    emergencyContactPhone: {
      type: String,
      default: "",
    },

    consent: {
      accepted: {
        type: Boolean,
        required: true,
      },

      acceptedAt: {
        type: Date,
        required: true,
      },

      version: {
        type: String,
        required: true,
        default: "1.0",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ClientIntake", clientIntakeSchema);
