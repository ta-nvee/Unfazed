
const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Client = require("../models/Client");

const {
  canAccess,
  checkResourceLimit,
} = require("../services/entitlementService");

// Check whether the therapist's plan supports lead management
const checkLeadAccess = async (therapistId, res) => {
  const allowed = await canAccess(therapistId, "leadManagement");

  if (!allowed) {
    res.status(403).json({
      success: false,
      code: "FEATURE_UPGRADE_REQUIRED",
      feature: "leadManagement",
      message:
        "Lead management is not available on your current subscription plan. Please upgrade your plan.",
    });

    return false;
  }

  return true;
};

// Create a lead
const createLead = async (req, res, next) => {
  try {
    const therapistId = req.therapist.id;

    if (!(await checkLeadAccess(therapistId, res))) return;

    const { name, email, phone, source, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Lead name is required.",
      });
    }

    const limitCheck = await checkResourceLimit(
      therapistId,
      "leads"
    );

    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        code: "RESOURCE_LIMIT_REACHED",
        resource: "leads",
        message:
          "Your subscription lead limit has been reached. Please upgrade your plan.",
        limit: limitCheck.limit,
        currentCount: limitCheck.currentCount,
        remaining: limitCheck.remaining,
      });
    }

    const lead = await Lead.create({
      therapist: therapistId,
      name: name.trim(),
      email: email || "",
      phone: phone || "",
      source: source || "other",
      notes: notes || "",
    });

    return res.status(201).json({
      success: true,
      message: "Lead created successfully.",
      lead,
    });
  } catch (error) {
    next(error);
  }
};

// Get all leads
const getLeads = async (req, res, next) => {
  try {
    const therapistId = req.therapist.id;

    if (!(await checkLeadAccess(therapistId, res))) return;

    const leads = await Lead.find({
      therapist: therapistId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    next(error);
  }
};

// Get one lead
const getLeadById = async (req, res, next) => {
  try {
    const therapistId = req.therapist.id;

    if (!(await checkLeadAccess(therapistId, res))) return;

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID.",
      });
    }

    const lead = await Lead.findOne({
      _id: id,
      therapist: therapistId,
    }).populate("convertedClient", "name email phone");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    return res.status(200).json({
      success: true,
      lead,
    });
  } catch (error) {
    next(error);
  }
};

// Update a lead
const updateLead = async (req, res, next) => {
  try {
    const therapistId = req.therapist.id;

    if (!(await checkLeadAccess(therapistId, res))) return;

    const { id } = req.params;
    const { name, email, phone, source, status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID.",
      });
    }

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Lead name cannot be empty.",
      });
    }

    if (status === "converted") {
      return res.status(400).json({
        success: false,
        message:
          "Use the convert lead action to convert a lead into a client.",
      });
    }

    const existingLead = await Lead.findOne({
      _id: id,
      therapist: therapistId,
    });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    if (
      existingLead.status === "converted" &&
      status !== undefined &&
      status !== "converted"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A converted lead cannot be moved to another status.",
      });
    }

    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (source !== undefined) updates.source = source;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const lead = await Lead.findOneAndUpdate(
      {
        _id: id,
        therapist: therapistId,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully.",
      lead,
    });
  } catch (error) {
    next(error);
  }
};

// Convert lead into a client using a transaction
const convertLead = async (req, res, next) => {
  const therapistId = req.therapist.id;
  const { id } = req.params;

  if (!(await checkLeadAccess(therapistId, res))) return;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lead ID.",
    });
  }

  const mongoSession = await mongoose.startSession();

  try {
    const existingLead = await Lead.findOne({
      _id: id,
      therapist: therapistId,
    });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    if (
      existingLead.convertedClient ||
      existingLead.status === "converted"
    ) {
      return res.status(400).json({
        success: false,
        message: "This lead has already been converted.",
      });
    }

    const limitCheck = await checkResourceLimit(
      therapistId,
      "clients"
    );

    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        code: "RESOURCE_LIMIT_REACHED",
        resource: "clients",
        message:
          "Your subscription client limit has been reached. Please upgrade your plan.",
        limit: limitCheck.limit,
        currentCount: limitCheck.currentCount,
        remaining: limitCheck.remaining,
      });
    }

    let convertedClient;

    await mongoSession.withTransaction(async () => {
      const lead = await Lead.findOne({
        _id: id,
        therapist: therapistId,
      }).session(mongoSession);

      if (!lead) {
        const error = new Error("Lead not found.");
        error.statusCode = 404;
        throw error;
      }

      if (
        lead.convertedClient ||
        lead.status === "converted"
      ) {
        const error = new Error(
          "This lead has already been converted."
        );
        error.statusCode = 400;
        throw error;
      }

      const [client] = await Client.create(
        [
          {
            therapist: therapistId,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            status: "active",
          },
        ],
        { session: mongoSession }
      );

      lead.status = "converted";
      lead.convertedClient = client._id;

      await lead.save({ session: mongoSession });

      convertedClient = client;
    });

    return res.status(200).json({
      success: true,
      message: "Lead successfully converted into a client.",
      client: convertedClient,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  } finally {
    await mongoSession.endSession();
  }
};

// Delete a lead
const deleteLead = async (req, res, next) => {
  try {
    const therapistId = req.therapist.id;

    if (!(await checkLeadAccess(therapistId, res))) return;

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID.",
      });
    }

    const lead = await Lead.findOneAndDelete({
      _id: id,
      therapist: therapistId,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  convertLead,
  deleteLead,
};
