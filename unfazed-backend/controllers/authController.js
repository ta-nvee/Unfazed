
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Therapist = require("../models/Therapist");

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

function createSlug(name) {
  return (
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

// Register therapist
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
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

    const hashedPassword = await bcrypt.hash(password, 12);

    const therapist = await Therapist.create({
      name: name.trim(),
      email: normalizedEmail,
      password_hash: hashedPassword,
      slug: createSlug(name),
    });

    const token = createToken(therapist);

    return res.status(201).json({
      message: "Registration successful",
      token,
      therapist: {
        id: therapist._id,
        name: therapist.name,
        email: therapist.email,
        slug: therapist.slug,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email or slug already exists",
      });
    }

    return res.status(500).json({
      message: "Registration failed",
    });
  }
};

// Login therapist
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
