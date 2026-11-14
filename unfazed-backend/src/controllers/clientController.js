
const Client = require("../models/Client");
const Session = require("../models/Session");
const crypto = require("crypto");

const {
  checkResourceLimit,
} = require("../services/entitlementService");

// ==========================================
// 1. CREATE CLIENT
// ==========================================

const createClient = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Client name is required.",
      });
    }

    // Check subscription client limit
    const limitCheck = await checkResourceLimit(
      req.therapist.id,
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

    // Generate secure invitation token
    const invitationToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Store only hashed invitation token
    const inviteTokenHash = crypto
      .createHash("sha256")
      .update(invitationToken)
      .digest("hex");

    // Invitation expires after 7 days
    const inviteExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    const client = await Client.create({
      therapist: req.therapist.id,
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      phone: phone ? phone.trim() : undefined,
      inviteTokenHash,
      inviteExpiresAt,
    });

    return res.status(201).json({
      success: true,
      message: "Client created successfully.",
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        status: client.status,
      },
      invitation: {
        token: invitationToken,
        expiresAt: inviteExpiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// 2. GET ALL CLIENTS
// ==========================================

const getClients = async (req, res, next) => {
  try {
    const clients = await Client.find({
      therapist: req.therapist.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// 3. GET SINGLE CLIENT
// Includes complete client record
// ==========================================

const getClientById = async (req, res, next) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      therapist: req.therapist.id,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    return res.status(200).json({
      success: true,
      client,
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// 4. GET CLIENT INTAKE AND CONSENT
// ==========================================

const getClientIntake = async (req, res, next) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      therapist: req.therapist.id,
    }).select(
      "name email phone intake consentRecords createdAt"
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    return res.status(200).json({
      success: true,
      intake: client.intake || {},
      consentRecords: client.consentRecords || [],
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// 5. UPDATE CLIENT
// ==========================================

const updateClient = async (req, res, next) => {
  try {
    const { name, email, phone, status } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Client name cannot be empty.",
        });
      }

      updates.name = name.trim();
    }

    if (email !== undefined) {
      updates.email = email
        ? email.trim().toLowerCase()
        : undefined;
    }

    if (phone !== undefined) {
      updates.phone = phone ? phone.trim() : undefined;
    }

    if (status !== undefined) {
      updates.status = status;
    }

    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        therapist: req.therapist.id,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Client updated successfully.",
      client,
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// 6. UPDATE CLIENT TAGS
// ==========================================

const updateClientTags = async (req, res, next) => {
  try {
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: "Tags must be provided as an array.",
      });
    }

    if (tags.length > 10) {
      return res.status(400).json({
        success: false,
        message: "A maximum of 10 tags is allowed.",
      });
    }

    if (!tags.every((tag) => typeof tag === "string")) {
      return res.status(400).json({
        success: false,
        message: "Every tag must be a string.",
      });
    }

    const normalizedTags = [
      ...new Set(
        tags
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];

    if (normalizedTags.some((tag) => tag.length > 30)) {
      return res.status(400).json({
        success: false,
        message: "Each tag must not exceed 30 characters.",
      });
    }

    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        therapist: req.therapist.id,
      },
      {
        $set: {
          tags: normalizedTags,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Client tags updated successfully.",
      client,
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// 7. GET CLIENT SESSION HISTORY
// ==========================================

const getClientSessionHistory = async (req, res, next) => {
  try {
    // Verify client belongs to logged-in therapist
    const client = await Client.findOne({
      _id: req.params.id,
      therapist: req.therapist.id,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    const sessions = await Session.find({
      client: req.params.id,
      therapist: req.therapist.id,
    }).sort({
      startTime: -1,
    });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// 8. DELETE CLIENT
// ==========================================

const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      therapist: req.therapist.id,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Client deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};


// ==========================================
// EXPORT ALL CONTROLLERS
// ==========================================

module.exports = {
  createClient,
  getClients,
  getClientById,
  getClientIntake,
  updateClient,
  updateClientTags,
  getClientSessionHistory,
  deleteClient,
};
