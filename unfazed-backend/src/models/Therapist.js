
const mongoose = require("mongoose");

const therapistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password_hash: {
      type: String,
      required: true,
      select: false,
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
    },

    bio: {
      type: String,
      default: "",
    },

    // Profile photo URL or image data URL
    profileImage: {
      type: String,
      default: "",
    },

    // Keep existing qualifications field for backward compatibility
    qualifications: {
      type: String,
      default: "",
    },

    // Multiple education entries
    education: [
      {
        degree: {
          type: String,
          trim: true,
          default: "",
        },
        institution: {
          type: String,
          trim: true,
          default: "",
        },
        year: {
          type: Number,
          min: 1900,
          max: 2100,
        },
      },
    ],

    experience: {
      type: Number,
      min: 0,
      default: 0,
    },

    specializations: {
      type: [String],
      default: [],
    },

    languages: {
      type: [String],
      default: [],
    },

    services: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
          default: "",
        },
        duration: {
          type: Number,
          default: 60,
        },
        price: {
          type: Number,
          min: 0,
          default: 0,
        },
      },
    ],

    isPublic: {
      type: Boolean,
      default: false,
    },

    isAcceptingClients: {
      type: Boolean,
      default: false,
    },

    subscriptionTier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionTierConfig",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Therapist", therapistSchema);
