
const Package = require("../models/Package");
const ClientPackage = require("../models/ClientPackage");

const {
  canAccess,
  getTherapistEntitlements,
} = require("../services/entitlementService");

// Check package feature access
const checkPackageAccess = async (req, res) => {
  const access = await canAccess(
    req.therapist.id,
    "packageManagement"
  );

  if (!access.allowed) {
    res.status(403).json({
      success: false,
      code: "FEATURE_UPGRADE_REQUIRED",
      message: access.reason,
      feature: "packageManagement",
    });

    return false;
  }

  return true;
};

// Create package
exports.createPackage = async (req, res) => {
  try {
    if (!(await checkPackageAccess(req, res))) return;

    const { therapist, limits } =
      await getTherapistEntitlements(req.therapist.id);

    const maxPackages = limits.maxPackages;

    const currentCount = await Package.countDocuments({
      therapist: therapist._id,
    });

    // -1 means unlimited
    if (maxPackages !== -1 && currentCount >= maxPackages) {
      return res.status(403).json({
        success: false,
        code: "RESOURCE_LIMIT_REACHED",
        message: `You have reached your package limit of ${maxPackages}. Please upgrade your subscription.`,
        resource: "packages",
        limit: maxPackages,
        currentCount,
      });
    }

    const {
      name,
      description,
      sessionCount,
      price,
      validityDays,
    } = req.body;

    const newPackage = await Package.create({
      therapist: therapist._id,
      name,
      description,
      sessionCount,
      price,
      validityDays,
    });

    return res.status(201).json({
      success: true,
      message: "Package created successfully",
      package: newPackage,
    });
  } catch (error) {
    console.error("Create package error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get therapist's packages
exports.getPackages = async (req, res) => {
  try {
    if (!(await checkPackageAccess(req, res))) return;

    const packages = await Package.find({
      therapist: req.therapist.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      packages,
    });
  } catch (error) {
    console.error("Get packages error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a package
exports.updatePackage = async (req, res) => {
  try {
    if (!(await checkPackageAccess(req, res))) return;

    const allowedFields = [
      "name",
      "description",
      "sessionCount",
      "price",
      "validityDays",
      "isActive",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedPackage = await Package.findOneAndUpdate(
      {
        _id: req.params.id,
        therapist: req.therapist.id,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedPackage) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Package updated successfully",
      package: updatedPackage,
    });
  } catch (error) {
    console.error("Update package error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a package if it has no purchases
exports.deletePackage = async (req, res) => {
  try {
    if (!(await checkPackageAccess(req, res))) return;

    const existingPackage = await Package.findOne({
      _id: req.params.id,
      therapist: req.therapist.id,
    });

    if (!existingPackage) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const hasPurchases = await ClientPackage.exists({
      package: existingPackage._id,
      therapist: req.therapist.id,
    });

    if (hasPurchases) {
      return res.status(400).json({
        success: false,
        message: "This package has purchases. Deactivate it instead.",
      });
    }

    await existingPackage.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error("Delete package error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
