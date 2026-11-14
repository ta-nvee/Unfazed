
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");

const SubscriptionTierConfig = require("./models/SubscriptionTierConfig");
const Therapist = require("./models/Therapist");

const subscriptionTiers = [
  {
    tierKey: "starter",
    name: "Starter",
    description: "Essential tools for independent therapists getting started.",
    price: 0,
    currency: "INR",
    billingCycle: "monthly",

    limits: {
      maxClients: 10,
      maxSessions: 20,
      maxLeads: 0,
      maxServices: 1,
      maxPackages: 5,
    },

    features: {
      clientManagement: true,
      sessionScheduling: true,
      serviceManagement: true,
      sessionNotes: false,
      advancedNoteTemplates: false,
      basicAnalytics: true,
      advancedAnalytics: false,
      leadManagement: false,
      onlinePayments: true,
      packageManagement: true,
      invoiceGeneration: false,
      chat: false,
    },

    isActive: true,
  },

  {
    tierKey: "growth",
    name: "Growth",
    description: "More capacity and tools for growing therapy practices.",
    price: 1000,
    currency: "INR",
    billingCycle: "monthly",

    limits: {
      maxClients: 50,
      maxSessions: 100,
      maxLeads: 50,
      maxServices: 10,
      maxPackages: 20,
    },

    features: {
      clientManagement: true,
      sessionScheduling: true,
      serviceManagement: true,
      sessionNotes: true,
      advancedNoteTemplates: false,
      basicAnalytics: true,
      advancedAnalytics: false,
      leadManagement: true,
      onlinePayments: true,
      packageManagement: true,
      invoiceGeneration: true,
      chat: true,
    },

    isActive: true,
  },

  {
    tierKey: "professional",
    name: "Professional",
    description: "Advanced tools and unlimited practice capacity.",
    price: 2000,
    currency: "INR",
    billingCycle: "monthly",

    limits: {
      maxClients: -1,
      maxSessions: -1,
      maxLeads: -1,
      maxServices: -1,
      maxPackages: -1,
    },

    features: {
      clientManagement: true,
      sessionScheduling: true,
      serviceManagement: true,
      sessionNotes: true,
      advancedNoteTemplates: true,
      basicAnalytics: true,
      advancedAnalytics: true,
      leadManagement: true,
      onlinePayments: true,
      packageManagement: true,
      invoiceGeneration: true,
      chat: true,
    },

    isActive: true,
  },
];

const seedSubscriptionTiers = async () => {
  try {
    await connectDB();

    for (const tierData of subscriptionTiers) {
      await SubscriptionTierConfig.updateOne(
        { tierKey: tierData.tierKey },
        { $set: tierData },
        { upsert: true, runValidators: true }
      );

      console.log(`${tierData.name} tier configured.`);
    }

    const starterTier = await SubscriptionTierConfig.findOne({
      tierKey: "starter",
      isActive: true,
    });

    if (!starterTier) {
      throw new Error("Starter subscription tier could not be found.");
    }

    const assignmentResult = await Therapist.updateMany(
      {
        $or: [
          { subscriptionTier: null },
          { subscriptionTier: { $exists: false } },
        ],
      },
      {
        $set: { subscriptionTier: starterTier._id },
      }
    );

    console.log(
      `${assignmentResult.modifiedCount} existing therapist(s) assigned to Starter.`
    );

    const tiers = await SubscriptionTierConfig.find({
      tierKey: { $in: ["starter", "growth", "professional"] },
    }).sort({ price: 1 });

    console.log("\nSubscription tiers configured successfully.\n");

    console.table(
      tiers.map((tier) => ({
        Name: tier.name,
        Price: `₹${tier.price}/month`,
        Clients: tier.limits.maxClients === -1 ? "Unlimited" : tier.limits.maxClients,
        Sessions: tier.limits.maxSessions === -1 ? "Unlimited" : tier.limits.maxSessions,
        Leads: tier.limits.maxLeads === -1 ? "Unlimited" : tier.limits.maxLeads,
        Services: tier.limits.maxServices === -1 ? "Unlimited" : tier.limits.maxServices,
        Packages: tier.limits.maxPackages === -1 ? "Unlimited" : tier.limits.maxPackages,
      }))
    );
  } catch (error) {
    console.error("Subscription seeding failed:", error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
};

seedSubscriptionTiers();
