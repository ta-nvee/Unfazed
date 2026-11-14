
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Therapist = require("../models/Therapist");
const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");
const Package = require("../models/Package");

const generateUniqueSlug = require("../utils/generateSlug");

// ==========================================
// DEFAULT THERAPY PACKAGES
// ==========================================

const DEFAULT_PACKAGES = [
  {
    name: "Starter Pack",
    description: "3 therapy sessions",
    sessionCount: 3,
    price: 3000,
    validityDays: 30,
    isActive: true,
  },
  {
    name: "Growth Pack",
    description: "6 therapy sessions",
    sessionCount: 6,
    price: 5700,
    validityDays: 60,
    isActive: true,
  },
  {
    name: "Healing Pack",
    description: "10 therapy sessions",
    sessionCount: 10,
    price: 9000,
    validityDays: 90,
    isActive: true,
  },
  {
    name: "Transformation Pack",
    description: "15 therapy sessions",
    sessionCount: 15,
    price: 12750,
    validityDays: 120,
    isActive: true,
  },
  {
    name: "Intensive Care Pack",
    description: "20 therapy sessions",
    sessionCount: 20,
    price: 16000,
    validityDays: 180,
    isActive: true,
  },
];

// ==========================================
// CREATE TOKEN
// ==========================================

function createToken(therapist) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from .env");
  }

  return jwt.sign(
    { id: therapist._id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// ==========================================
// REGISTER THERAPIST
// ==========================================

exports.register = async (req, res) => {
  let createdTherapistId = null;

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        message: "Valid name and email are required",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await Therapist.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    // Find active Starter subscription.
    const starterTier = await SubscriptionTierConfig.findOne({
      tierKey: "starter",
      isActive: true,
    });

    if (!starterTier) {
      return res.status(503).json({
        success: false,
        message:
          "Registration is temporarily unavailable. Starter subscription is not configured.",
      });
    }

    // Hash password.
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique therapist slug.
    const slug = await generateUniqueSlug(name.trim());

    // Create therapist with Starter subscription.
    const therapist = await Therapist.create({
      name: name.trim(),
      email: normalizedEmail,
      password_hash: hashedPassword,
      slug,
      subscriptionTier: starterTier._id,
    });

    createdTherapistId = therapist._id;

    // ==========================================
    // AUTOMATICALLY CREATE FIVE PACKAGES
    // ==========================================

    const therapistPackages = DEFAULT_PACKAGES.map((item) => ({
      ...item,
      therapist: therapist._id,
    }));

    await Package.insertMany(therapistPackages);

    console.log(
      `Five default packages created for therapist: ${therapist._id}`
    );

    // Generate authentication token.
    const token = createToken(therapist);

    return res.status(201).json({
      success: true,
      message: "Registration successful. Five default therapy packages created.",
      token,
      therapist: {
        id: therapist._id,
        name: therapist.name,
        email: therapist.email,
        slug: therapist.slug,
        subscriptionTier: {
          tierKey: starterTier.tierKey,
          name: starterTier.name,
        },
      },
      packagesCreated: therapistPackages.length,
    });
  } catch (error) {
    console.error("Registration error:", error);

    // If package creation or token generation fails,
    // clean up the newly created therapist and packages.
    if (createdTherapistId) {
      try {
        await Package.deleteMany({
          therapist: createdTherapistId,
        });

        await Therapist.deleteOne({
          _id: createdTherapistId,
        });

        console.log("Incomplete therapist registration rolled back.");
      } catch (cleanupError) {
        console.error(
          "Registration cleanup error:",
          cleanupError
        );
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email or slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// ==========================================
// LOGIN THERAPIST
// ==========================================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const therapist = await Therapist.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password_hash");

    if (!therapist) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      therapist.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = createToken(therapist);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      therapist: {
        id: therapist._id,
        name: therapist.name,
        email: therapist.email,
        slug: therapist.slug,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
    });
  }
};
