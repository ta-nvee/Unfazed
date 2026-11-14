
const mongoose = require("mongoose");

const subscriptionTierConfigSchema = new mongoose.Schema(
  {
    tierKey: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "one-time"],
      default: "monthly",
    },

    // ==========================================
    // RESOURCE LIMITS
    // -1 means unlimited
    // ==========================================

    limits: {
      maxClients: {
        type: Number,
        default: 10,
        min: -1,
      },

      maxSessions: {
        type: Number,
        default: 20,
        min: -1,
      },

      maxLeads: {
        type: Number,
        default: 10,
        min: -1,
      },

      maxServices: {
        type: Number,
        default: 2,
        min: -1,
      },

      maxPackages: {
        type: Number,
        default: 5,
        min: -1,
      },
    },

    // ==========================================
    // FEATURE-BASED SUBSCRIPTION ACCESS
    // ==========================================

    features: {
      // Core modules
      clientManagement: {
        type: Boolean,
        default: true,
      },

      sessionScheduling: {
        type: Boolean,
        default: true,
      },

      serviceManagement: {
        type: Boolean,
        default: true,
      },

      // Session notes
      sessionNotes: {
        type: Boolean,
        default: false,
      },

      advancedNoteTemplates: {
        type: Boolean,
        default: false,
      },

      // Analytics
      basicAnalytics: {
        type: Boolean,
        default: true,
      },

      advancedAnalytics: {
        type: Boolean,
        default: false,
      },

      // CRM
      leadManagement: {
        type: Boolean,
        default: false,
      },

      // Payments and packages
      onlinePayments: {
        type: Boolean,
        default: true,
      },

      packageManagement: {
        type: Boolean,
        default: false,
      },

      invoiceGeneration: {
        type: Boolean,
        default: false,
      },

      // Communication
      chat: {
        type: Boolean,
        default: false,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "SubscriptionTierConfig",
  subscriptionTierConfigSchema
);
