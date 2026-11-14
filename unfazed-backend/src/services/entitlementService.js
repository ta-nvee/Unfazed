
const Therapist = require("../models/Therapist");
const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");

const Client = require("../models/Client");
const Session = require("../models/Session");
const Lead = require("../models/Lead");

// Resource models
const RESOURCE_MODELS = {
  clients: Client,
  sessions: Session,
  leads: Lead,
};

// Corresponding limit fields
const RESOURCE_LIMITS = {
  clients: "maxClients",
  sessions: "maxSessions",
  leads: "maxLeads",
  services: "maxServices",
};

// Get therapist subscription and entitlements
const getTherapistEntitlements = async (therapistId) => {
  const therapist = await Therapist.findById(therapistId)
    .populate("subscriptionTier");

  if (!therapist) {
    throw new Error("Therapist not found.");
  }

  let tier = therapist.subscriptionTier;

  // Assign Starter as fallback when no valid tier is assigned
  if (!tier || !tier.isActive) {
    tier = await SubscriptionTierConfig.findOne({
      tierKey: "starter",
      isActive: true,
    });
  }

  if (!tier) {
    throw new Error("No active subscription tier is assigned.");
  }

  return {
    therapist,
    tier,
    limits: tier.limits,
    features: tier.features,
  };
};

// Check resource limits or feature access
const canAccess = async (therapistId, featureKey) => {
  const { therapist, limits, features } =
    await getTherapistEntitlements(therapistId);

  // ==========================================
  // RESOURCE LIMIT CHECKS
  // ==========================================

  if (RESOURCE_LIMITS[featureKey]) {
    const limitKey = RESOURCE_LIMITS[featureKey];
    const limit = limits?.[limitKey];

    if (limit === undefined || limit === null) {
      throw new Error(`Limit not configured for ${featureKey}.`);
    }

    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        featureKey,
        limit,
        currentCount: 0,
        remaining: -1,
      };
    }

    let currentCount = 0;

    // Services are stored inside the Therapist document
    if (featureKey === "services") {
      currentCount = Array.isArray(therapist.services)
        ? therapist.services.length
        : 0;
    } else {
      const Model = RESOURCE_MODELS[featureKey];

      if (!Model) {
        throw new Error(`Invalid resource: ${featureKey}`);
      }

      const countFilter = {
        therapist: therapistId,
      };

      // Count only active clients
      if (featureKey === "clients") {
        countFilter.status = "active";
      }

      currentCount = await Model.countDocuments(countFilter);
    }

    return {
      allowed: currentCount < limit,
      featureKey,
      limit,
      currentCount,
      remaining: Math.max(0, limit - currentCount),
      reason:
        currentCount >= limit
          ? `${featureKey} limit reached. Please upgrade your plan.`
          : null,
    };
  }

  // ==========================================
  // FEATURE FLAG CHECKS
  // ==========================================

  const featureObject =
    typeof features?.toObject === "function"
      ? features.toObject()
      : features || {};

  if (!Object.prototype.hasOwnProperty.call(featureObject, featureKey)) {
    throw new Error(`Invalid subscription feature: ${featureKey}`);
  }

  const allowed = featureObject[featureKey] === true;

  return {
    allowed,
    featureKey,
    reason: allowed
      ? null
      : "This feature is not available on your current plan. Please upgrade.",
  };
};

// Backward-compatible resource limit helper
const checkResourceLimit = async (therapistId, resource) => {
  return canAccess(therapistId, resource);
};

// Backward-compatible feature access helper
const hasFeatureAccess = async (therapistId, featureName) => {
  const result = await canAccess(therapistId, featureName);
  return result.allowed;
};

module.exports = {
  getTherapistEntitlements,
  canAccess,
  checkResourceLimit,
  hasFeatureAccess,
};
