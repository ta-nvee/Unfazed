
const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
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

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // Client tags for CRM organization
    tags: {
      type: [String],
      default: [],
      set: (tags) =>
        tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    },

    // Client login password (stored as a hash)
    password_hash: {
      type: String,
      select: false,
    },

    // Hashed one-time invitation token
    inviteTokenHash: {
      type: String,
      select: false,
    },

    // Invitation expiry date
    inviteExpiresAt: {
      type: Date,
      default: null,
    },

    // When the client creates their account
    accountCreatedAt: {
      type: Date,
      default: null,
    },

    // Client intake information
    intake: {
      dateOfBirth: {
        type: Date,
        default: null,
      },
      gender: {
        type: String,
        trim: true,
        default: "",
      },
      occupation: {
        type: String,
        trim: true,
        default: "",
      },
      emergencyContact: {
        name: {
          type: String,
          trim: true,
          default: "",
        },
        phone: {
          type: String,
          trim: true,
          default: "",
        },
        relationship: {
          type: String,
          trim: true,
          default: "",
        },
      },
      presentingConcern: {
        type: String,
        trim: true,
        default: "",
      },
      relevantHistory: {
        type: String,
        trim: true,
        default: "",
      },
      completedAt: {
        type: Date,
        default: null,
      },
    },

    // Keep consent records for audit history
    consentRecords: [
      {
        consentVersion: {
          type: String,
          required: true,
        },
        accepted: {
          type: Boolean,
          required: true,
        },
        acceptedAt: {
          type: Date,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);
