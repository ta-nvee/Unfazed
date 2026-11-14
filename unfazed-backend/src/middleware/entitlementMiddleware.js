
const entitlementService = require("../services/entitlementService");

const entitlementMiddleware = (featureKey) => {
  return async (req, res, next) => {
    try {
      if (!req.therapist || !req.therapist.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const access = await entitlementService.canAccess(
        req.therapist.id,
        featureKey
      );

      // IMPORTANT: Check the allowed property, not the object.
      if (!access.allowed) {
        return res.status(403).json({
          success: false,
          message:
            access.reason ||
            "Your subscription does not include this feature.",
          featureKey,
          upgradeRequired: true,
          limit: access.limit ?? null,
          currentCount: access.currentCount ?? null,
          remaining: access.remaining ?? null,
        });
      }

      req.entitlement = access;

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = entitlementMiddleware;
