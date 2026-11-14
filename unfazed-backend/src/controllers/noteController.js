
const mongoose = require("mongoose");
const SessionNote = require("../models/SessionNote");
const Client = require("../models/Client");
const Session = require("../models/Session");

const { canAccess } = require("../services/entitlementService");

// ==========================================
// SUBSCRIPTION ACCESS HELPERS
// ==========================================

const checkSessionNoteAccess = async (therapistId) => {
  return canAccess(therapistId, "sessionNotes");
};

const checkAdvancedTemplateAccess = async (therapistId, noteType) => {
  if (!["soap", "dap"].includes(noteType)) {
    return { allowed: true };
  }

  return canAccess(therapistId, "advancedNoteTemplates");
};

const sendUpgradeRequired = (res, feature, message) => {
  return res.status(403).json({
    success: false,
    code: "FEATURE_UPGRADE_REQUIRED",
    feature,
    message,
  });
};

const requireSessionNotes = async (therapistId, res) => {
  const access = await checkSessionNoteAccess(therapistId);

  if (!access.allowed) {
    sendUpgradeRequired(
      res,
      "sessionNotes",
      "Session notes are not available on your current subscription. Please upgrade your plan."
    );

    return false;
  }

  return true;
};

// ==========================================
// CREATE NOTE (THERAPIST ONLY)
// ==========================================

const createNote = async (req, res, next) => {
  try {
    const therapistId = req.therapist._id || req.therapist.id;

    // Check session notes subscription access
    if (!(await requireSessionNotes(therapistId, res))) {
      return;
    }

    const { client, session, content, noteType, visibility } = req.body;

    if (!client || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Client and note content are required.",
      });
    }

    if (!mongoose.isValidObjectId(client)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID.",
      });
    }

    const allowedNoteTypes = [
      "session",
      "progress",
      "general",
      "soap",
      "dap",
    ];

    const selectedNoteType = noteType || "general";

    if (!allowedNoteTypes.includes(selectedNoteType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note type.",
      });
    }

    if (visibility && !["private", "shared"].includes(visibility)) {
      return res.status(400).json({
        success: false,
        message: "Visibility must be private or shared.",
      });
    }

    // Verify client belongs to therapist
    const clientExists = await Client.findOne({
      _id: client,
      therapist: therapistId,
    });

    if (!clientExists) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    // Verify session belongs to the same therapist and client
    if (session) {
      if (!mongoose.isValidObjectId(session)) {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID.",
        });
      }

      const sessionExists = await Session.findOne({
        _id: session,
        therapist: therapistId,
        client,
      });

      if (!sessionExists) {
        return res.status(404).json({
          success: false,
          message: "Session not found for this client.",
        });
      }
    }

    // Check advanced template subscription access
    const access = await checkAdvancedTemplateAccess(
      therapistId,
      selectedNoteType
    );

    if (!access.allowed) {
      return sendUpgradeRequired(
        res,
        "advancedNoteTemplates",
        "SOAP and DAP templates require a higher subscription plan. Please upgrade your plan."
      );
    }

    const note = await SessionNote.create({
      therapist: therapistId,
      client,
      session: session || null,
      content: content.trim(),
      noteType: selectedNoteType,
      visibility: visibility || "private",
    });

    return res.status(201).json({
      success: true,
      message: "Note created successfully.",
      note,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET CLIENT NOTES (THERAPIST ONLY)
// ==========================================

const getClientNotes = async (req, res, next) => {
  try {
    const therapistId = req.therapist._id || req.therapist.id;
    const { clientId } = req.params;

    if (!(await requireSessionNotes(therapistId, res))) {
      return;
    }

    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID.",
      });
    }

    const clientExists = await Client.findOne({
      _id: clientId,
      therapist: therapistId,
    });

    if (!clientExists) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    const notes = await SessionNote.find({
      therapist: therapistId,
      client: clientId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SHARED NOTES (CLIENT ONLY)
// ==========================================

const getSharedClientNotes = async (req, res, next) => {
  try {
    const clientId = req.client._id;

    // Find the therapist associated with this client
    const client = await Client.findById(clientId).select("therapist");

    if (!client || !client.therapist) {
      return res.status(404).json({
        success: false,
        message: "Client or associated therapist not found.",
      });
    }

    // Check whether the therapist's subscription allows notes
    if (!(await requireSessionNotes(client.therapist, res))) {
      return;
    }

    const notes = await SessionNote.find({
      client: clientId,
      visibility: "shared",
    })
      .select("content noteType visibility session createdAt updatedAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE NOTE (THERAPIST ONLY)
// ==========================================

const updateNote = async (req, res, next) => {
  try {
    const therapistId = req.therapist._id || req.therapist.id;

    if (!(await requireSessionNotes(therapistId, res))) {
      return;
    }

    const { id } = req.params;
    const { content, noteType, visibility } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID.",
      });
    }

    const updates = {};

    if (content !== undefined) {
      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Note content cannot be empty.",
        });
      }

      updates.content = content.trim();
    }

    if (noteType !== undefined) {
      const allowedNoteTypes = [
        "session",
        "progress",
        "general",
        "soap",
        "dap",
      ];

      if (!allowedNoteTypes.includes(noteType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid note type.",
        });
      }

      const access = await checkAdvancedTemplateAccess(
        therapistId,
        noteType
      );

      if (!access.allowed) {
        return sendUpgradeRequired(
          res,
          "advancedNoteTemplates",
          "SOAP and DAP templates require a higher subscription plan. Please upgrade your plan."
        );
      }

      updates.noteType = noteType;
    }

    if (visibility !== undefined) {
      if (!["private", "shared"].includes(visibility)) {
        return res.status(400).json({
          success: false,
          message: "Visibility must be private or shared.",
        });
      }

      updates.visibility = visibility;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const note = await SessionNote.findOneAndUpdate(
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

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note updated successfully.",
      note,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE NOTE (THERAPIST ONLY)
// ==========================================

const deleteNote = async (req, res, next) => {
  try {
    const therapistId = req.therapist._id || req.therapist.id;

    if (!(await requireSessionNotes(therapistId, res))) {
      return;
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID.",
      });
    }

    const note = await SessionNote.findOneAndDelete({
      _id: id,
      therapist: therapistId,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  createNote,
  getClientNotes,
  getSharedClientNotes,
  updateNote,
  deleteNote,
};
