
const generateUniqueSlug = require("../utils/generateSlug");
const Therapist = require("../models/Therapist");

const {
  canAccess,
  getTherapistEntitlements,
} = require("../services/entitlementService");

// Escape special characters in search input
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Get logged-in therapist profile
const getProfile = async (req, res, next) => {
  try {
    const therapistId = req.therapist._id || req.therapist.id;

    const therapist = await Therapist.findById(therapistId);

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found.",
      });
    }

    if (!therapist.slug) {
      therapist.slug = await generateUniqueSlug(
        therapist.name,
        therapist._id
      );
      await therapist.save();
    }

    res.status(200).json({
      success: true,
      therapist,
    });
  } catch (error) {
    next(error);
  }
};

// Update therapist profile
const updateProfile = async (req, res, next) => {
  try {
    const therapistId = req.therapist._id || req.therapist.id;

    const {
      name,
      bio,
      profileImage,
      qualifications,
      education,
      experience,
      specializations,
      languages,
      services,
      isPublic,
      isAcceptingClients,
    } = req.body;

    const updates = {};

    // Name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Therapist name cannot be empty.",
        });
      }

      updates.name = name.trim();
      updates.slug = await generateUniqueSlug(
        name.trim(),
        therapistId
      );
    }

    // Bio
    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return res.status(400).json({
          success: false,
          message: "Bio must be text.",
        });
      }

      updates.bio = bio;
    }

    // Profile photo
    if (profileImage !== undefined) {
      if (typeof profileImage !== "string") {
        return res.status(400).json({
          success: false,
          message: "Profile image must be a valid image string.",
        });
      }

      if (profileImage.length > 3 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Profile image is too large. Please use an image under 2 MB.",
        });
      }

      updates.profileImage = profileImage.trim();
    }

    // Qualifications
    if (qualifications !== undefined) {
      if (typeof qualifications !== "string") {
        return res.status(400).json({
          success: false,
          message: "Qualifications must be text.",
        });
      }

      updates.qualifications = qualifications;
    }

    // Education
    if (education !== undefined) {
      if (!Array.isArray(education)) {
        return res.status(400).json({
          success: false,
          message: "Education must be an array.",
        });
      }

      const currentYear = new Date().getFullYear();

      for (const item of education) {
        if (
          !item ||
          typeof item.degree !== "string" ||
          typeof item.institution !== "string"
        ) {
          return res.status(400).json({
            success: false,
            message: "Each education entry must include a degree and institution.",
          });
        }

        if (
          item.year !== undefined &&
          item.year !== null &&
          item.year !== ""
        ) {
          const year = Number(item.year);

          if (
            !Number.isInteger(year) ||
            year < 1900 ||
            year > currentYear + 10
          ) {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid education year.",
            });
          }
        }
      }

      updates.education = education.map((item) => ({
        degree: item.degree.trim(),
        institution: item.institution.trim(),
        ...(item.year !== undefined &&
        item.year !== null &&
        item.year !== ""
          ? { year: Number(item.year) }
          : {}),
      }));
    }

    // Professional experience
    if (experience !== undefined) {
      const years = Number(experience);

      if (!Number.isFinite(years) || years < 0) {
        return res.status(400).json({
          success: false,
          message: "Experience must be a valid non-negative number.",
        });
      }

      updates.experience = years;
    }

    // Specializations
    if (specializations !== undefined) {
      if (!Array.isArray(specializations)) {
        return res.status(400).json({
          success: false,
          message: "Specializations must be an array.",
        });
      }

      updates.specializations = specializations;
    }

    // Languages
    if (languages !== undefined) {
      if (!Array.isArray(languages)) {
        return res.status(400).json({
          success: false,
          message: "Languages must be an array.",
        });
      }

      updates.languages = languages;
    }

    // ==========================================
    // SERVICES - SUBSCRIPTION RESTRICTIONS
    // ==========================================

    if (services !== undefined) {
      if (!Array.isArray(services)) {
        return res.status(400).json({
          success: false,
          message: "Services must be an array.",
        });
      }

      // Check whether service management is included
      const serviceAccess = await canAccess(
        therapistId,
        "serviceManagement"
      );

      if (!serviceAccess.allowed) {
        return res.status(403).json({
          success: false,
          code: "FEATURE_UPGRADE_REQUIRED",
          feature: "serviceManagement",
          message:
            "Service management is not available on your current subscription. Please upgrade your plan.",
        });
      }

      // Get subscription service limit
      const entitlements = await getTherapistEntitlements(
        therapistId
      );

      const maxServices = entitlements.limits?.maxServices;

      if (maxServices === undefined || maxServices === null) {
        return res.status(500).json({
          success: false,
          message: "Service limit is not configured for your subscription.",
        });
      }

      // -1 means unlimited
      if (
        maxServices !== -1 &&
        services.length > maxServices
      ) {
        return res.status(403).json({
          success: false,
          code: "RESOURCE_LIMIT_REACHED",
          resource: "services",
          limit: maxServices,
          requested: services.length,
          message:
            `Your current plan allows only ${maxServices} services. Please upgrade your subscription to add more services.`,
        });
      }

      updates.services = services;
    }

    // Public visibility
    if (isPublic !== undefined) {
      if (typeof isPublic !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Public visibility must be true or false.",
        });
      }

      updates.isPublic = isPublic;
    }

    // Accepting clients
    if (isAcceptingClients !== undefined) {
      if (typeof isAcceptingClients !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Accepting clients must be true or false.",
        });
      }

      updates.isAcceptingClients = isAcceptingClients;
    }

    const therapist = await Therapist.findByIdAndUpdate(
      therapistId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      therapist,
    });
  } catch (error) {
    next(error);
  }
};

// Get public therapists for client Explore page
const getPublicTherapists = async (req, res, next) => {
  try {
    const { search, specialization } = req.query;

    const filters = [
      { isPublic: true },
      { isAcceptingClients: true },
    ];

    if (search && search.trim()) {
      const searchRegex = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      filters.push({
        $or: [
          { name: searchRegex },
          { specializations: searchRegex },
        ],
      });
    }

    if (specialization && specialization.trim()) {
      filters.push({
        specializations: {
          $regex: escapeRegex(specialization.trim()),
          $options: "i",
        },
      });
    }

    const therapists = await Therapist.find({
      $and: filters,
    })
      .select(
        "name slug bio profileImage qualifications education experience specializations languages services isPublic isAcceptingClients"
      )
      .sort({ name: 1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: therapists.length,
      therapists,
    });
  } catch (error) {
    next(error);
  }
};

// Get one public therapist profile using branded slug
const getPublicProfile = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const therapist = await Therapist.findOne({
      slug: slug.toLowerCase(),
      isPublic: true,
      isAcceptingClients: true,
    }).select(
      "name slug bio profileImage qualifications education experience specializations languages services"
    );

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist profile not found or not accepting clients.",
      });
    }

    res.status(200).json({
      success: true,
      therapist,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getPublicProfile,
  getPublicTherapists,
};
