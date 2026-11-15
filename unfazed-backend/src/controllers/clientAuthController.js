
const Client = require("../models/Client");
const Therapist = require("../models/Therapist");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");

const {
  checkResourceLimit,
} = require("../services/entitlementService");

// ==========================================
// HELPER: GENERATE CLIENT JWT
// ==========================================

const generateClientToken = (clientId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      id: clientId,
      role: "client",
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// ==========================================
// HELPER: GET AUTHENTICATED CLIENT ID
// ==========================================

const getAuthenticatedClientId = (req) => {
  const authenticatedClient = req.client;

  return (
    authenticatedClient?._id ||
    authenticatedClient?.id ||
    authenticatedClient ||
    req.clientId
  );
};

// ==========================================
// 1. CLIENT REGISTRATION — INVITATION BASED
// ==========================================

const registerClient = async (req, res, next) => {
  try {
    const { name, email, password, inviteToken } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      typeof inviteToken !== "string" ||
      !inviteToken.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and invitation token are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedInviteToken = inviteToken.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(normalizedInviteToken)
      .digest("hex");

    const client = await Client.findOne({
      inviteTokenHash: tokenHash,
    }).select("+inviteTokenHash +password_hash");

    if (!client) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation token.",
      });
    }

    if (
      !client.inviteExpiresAt ||
      client.inviteExpiresAt < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invitation has expired. Contact your therapist.",
      });
    }

    if (client.accountCreatedAt || client.password_hash) {
      return res.status(409).json({
        success: false,
        message: "Client account already exists.",
      });
    }

    if (
      !client.email ||
      client.email.toLowerCase() !== normalizedEmail
    ) {
      return res.status(400).json({
        success: false,
        message: "Email does not match the invitation.",
      });
    }

    client.name = name.trim();
    client.password_hash = await bcrypt.hash(password, 10);
    client.accountCreatedAt = new Date();
    client.inviteTokenHash = undefined;
    client.inviteExpiresAt = undefined;
    client.status = "active";

    await client.save();

    const token = generateClientToken(client._id);

    return res.status(201).json({
      success: true,
      message: "Client account created successfully.",
      token,
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
};

// ==========================================
// 2. CLIENT SELF REGISTRATION
// ==========================================

const registerClientWithTherapist = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      therapistId,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !therapistId
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and therapist selection are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(therapistId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid therapist selection.",
      });
    }

    const therapist = await Therapist.findOne({
      _id: therapistId,
      isPublic: true,
      isAcceptingClients: true,
    }).select("_id name slug");

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found or not accepting new clients.",
      });
    }

    // FIND EXISTING CLIENT FOR THIS THERAPIST.
    // This also finds clients created during public booking.
    const existingClient = await Client.findOne({
      therapist: therapist._id,
      email: normalizedEmail,
    }).select("+password_hash +inviteTokenHash");

    let client;

    if (existingClient) {
      // An account has already been created.
      if (
        existingClient.accountCreatedAt ||
        existingClient.password_hash
      ) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists. Please log in.",
        });
      }

      // Do not bypass an invitation issued by the therapist.
      if (existingClient.inviteTokenHash) {
        return res.status(409).json({
          success: false,
          message:
            "An invitation already exists for this email. Please register using your therapist's invitation.",
        });
      }

      // REUSE THE EXISTING PUBLIC BOOKING CLIENT.
      // Do not create another Client document.
      // This preserves existing sessions, payments and intake details.
      if (existingClient.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "This client record is inactive. Please contact your therapist.",
        });
      }

      existingClient.name = name.trim();
      existingClient.password_hash = await bcrypt.hash(password, 10);
      existingClient.accountCreatedAt = new Date();
      existingClient.status = "active";

      await existingClient.save();

      client = existingClient;
    } else {
      // NO EXISTING BOOKING OR CLIENT RECORD.
      // Create a new client as usual.
      const limitCheck = await checkResourceLimit(
        therapist._id,
        "clients"
      );

      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: limitCheck.reason,
          limit: limitCheck.limit,
          currentCount: limitCheck.currentCount,
          remaining: limitCheck.remaining,
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      client = await Client.create({
        therapist: therapist._id,
        name: name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        accountCreatedAt: new Date(),
        status: "active",
      });
    }

    // TOKEN USES THE SAME CLIENT ID AS THE PUBLIC BOOKING.
    const token = generateClientToken(client._id);

    return res.status(201).json({
      success: true,
      message: "Your account has been created successfully.",
      token,
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        therapist: {
          id: therapist._id,
          name: therapist.name,
          slug: therapist.slug,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
};

// ==========================================
// 3. CLIENT LOGIN
// ==========================================

const loginClient = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const client = await Client.findOne({
      email: normalizedEmail,
    }).select("+password_hash");

    if (
      !client ||
      !client.password_hash ||
      !client.accountCreatedAt ||
      client.status !== "active"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      client.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateClientToken(client._id);

    return res.status(200).json({
      success: true,
      message: "Client login successful.",
      token,
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. GET LOGGED-IN CLIENT PROFILE
// ==========================================

const getMyProfile = async (req, res, next) => {
  try {
    const clientId = getAuthenticatedClientId(req);

    const client = await Client.findOne({
      _id: clientId,
      status: "active",
    })
      .select(
        "name email phone therapist intake accountCreatedAt createdAt"
      )
      .populate("therapist", "name slug");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully.",
      client,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. UPDATE LOGGED-IN CLIENT PROFILE
// ==========================================

const updateMyProfile = async (req, res, next) => {
  try {
    const clientId = getAuthenticatedClientId(req);

    const {
      name,
      email,
      phone,
      gender,
      dateOfBirth,
    } = req.body;

    const client = await Client.findOne({
      _id: clientId,
      status: "active",
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found.",
      });
    }

    const hasUpdates =
      name !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      gender !== undefined ||
      dateOfBirth !== undefined;

    if (!hasUpdates) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Name cannot exceed 100 characters.",
        });
      }

      client.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address.",
        });
      }

      const existingClient = await Client.findOne({
        email: normalizedEmail,
        _id: { $ne: client._id },
      });

      if (existingClient) {
        return res.status(409).json({
          success: false,
          message:
            "This email is already associated with another account.",
        });
      }

      client.email = normalizedEmail;
    }

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          success: false,
          message: "Phone number must be a string.",
        });
      }

      client.phone = phone.trim();
    }

    if (!client.intake) {
      client.intake = {};
    }

    if (gender !== undefined) {
      if (typeof gender !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid gender value.",
        });
      }

      client.intake.gender = gender.trim();
    }

    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === "") {
        client.intake.dateOfBirth = undefined;
      } else {
        if (typeof dateOfBirth !== "string") {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid date of birth.",
          });
        }

        const parsedDate = new Date(dateOfBirth);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid date of birth.",
          });
        }

        if (parsedDate > new Date()) {
          return res.status(400).json({
            success: false,
            message: "Date of birth cannot be in the future.",
          });
        }

        client.intake.dateOfBirth = parsedDate;
      }
    }

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Your profile has been updated successfully.",
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        intake: client.intake,
        therapist: client.therapist,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already in use.",
      });
    }

    next(error);
  }
};

// ==========================================
// 6. CHANGE CLIENT PASSWORD
// ==========================================

const changeMyPassword = async (req, res, next) => {
  try {
    const clientId = getAuthenticatedClientId(req);

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      typeof currentPassword !== "string" ||
      !currentPassword ||
      typeof newPassword !== "string" ||
      !newPassword ||
      typeof confirmPassword !== "string" ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current password, new password and confirmation are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from your current password.",
      });
    }

    const client = await Client.findOne({
      _id: clientId,
      status: "active",
    }).select("+password_hash");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client account not found.",
      });
    }

    if (!client.password_hash) {
      return res.status(400).json({
        success: false,
        message: "No password is set for this account.",
      });
    }

    const isCurrentPasswordCorrect = await bcrypt.compare(
      currentPassword,
      client.password_hash
    );

    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Your current password is incorrect.",
      });
    }

    client.password_hash = await bcrypt.hash(newPassword, 10);

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Your password has been changed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. CLIENT SELECT / CHANGE THERAPIST
// ==========================================

const selectTherapist = async (req, res, next) => {
  try {
    const clientId = getAuthenticatedClientId(req);
    const { therapistId } = req.body;

    if (
      !therapistId ||
      !mongoose.Types.ObjectId.isValid(therapistId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid therapist.",
      });
    }

    const client = await Client.findOne({
      _id: clientId,
      status: "active",
      accountCreatedAt: { $ne: null },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Active client account not found.",
      });
    }

    if (client.therapist.toString() === therapistId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You are already connected with this therapist.",
      });
    }

    const therapist = await Therapist.findOne({
      _id: therapistId,
      isPublic: true,
      isAcceptingClients: true,
    }).select("_id name slug");

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found or not accepting new clients.",
      });
    }

    const limitCheck = await checkResourceLimit(
      therapist._id,
      "clients"
    );

    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: limitCheck.reason,
        limit: limitCheck.limit,
        currentCount: limitCheck.currentCount,
        remaining: limitCheck.remaining,
      });
    }

    client.therapist = therapist._id;

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Your therapist has been changed successfully.",
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        therapist: {
          id: therapist._id,
          name: therapist.name,
          slug: therapist.slug,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORT ALL CONTROLLERS
// ==========================================

module.exports = {
  registerClient,
  registerClientWithTherapist,
  loginClient,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  selectTherapist,
};
