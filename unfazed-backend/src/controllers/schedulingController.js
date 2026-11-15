
const mongoose = require("mongoose");

const Session = require("../models/Session");
const Client = require("../models/Client");
const ClientPackage = require("../models/ClientPackage");
const Availability = require("../models/Availability");
const Therapist = require("../models/Therapist");
const Notification = require("../models/Notification");

const {
  checkResourceLimit,
} = require("../services/entitlementService");

// ==========================================
// BOOKING NOTIFICATION HELPER
// ==========================================

const createBookingNotifications = async ({
  therapistId,
  clientId,
  sessionId,
  title,
  message,
}) => {
  try {
    await Notification.insertMany([
      {
        therapist: therapistId,
        client: clientId,
        recipientType: "therapist",
        type: "booking_update",
        title,
        message,
        relatedId: sessionId,
      },
      {
        therapist: therapistId,
        client: clientId,
        recipientType: "client",
        type: "booking_update",
        title,
        message,
        relatedId: sessionId,
      },
    ]);
  } catch (error) {
    console.error("Booking notification error:", error.message);
  }
};

// ==========================================
// CUSTOM ERROR HELPER
// ==========================================

const createRequestError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ==========================================
// CREATE A NEW SESSION
// ==========================================

const createSession = async (req, res, next) => {
  try {
    const {
      client,
      startTime,
      endTime,
      sessionType,
      meetingLink,
      fee,
      clientPackage,
    } = req.body;

    if (!client || !startTime || !endTime) {
      return res.status(400).json({
        message: "Client, start time and end time are required.",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return res.status(400).json({
        message: "Please provide valid session dates and times.",
      });
    }

    const clientExists = await Client.findOne({
      _id: client,
      therapist: req.therapist.id,
    });

    if (!clientExists) {
      return res.status(404).json({
        message: "Client not found.",
      });
    }

    let selectedClientPackage = null;

    if (clientPackage) {
      selectedClientPackage = await ClientPackage.findOne({
        _id: clientPackage,
        therapist: req.therapist.id,
        client,
        status: "active",
        expiresAt: { $gt: new Date() },
        $expr: {
          $lt: ["$sessionsUsed", "$sessionsTotal"],
        },
      });

      if (!selectedClientPackage) {
        return res.status(400).json({
          success: false,
          message:
            "This client package is expired, exhausted, or invalid.",
        });
      }
    }

    const limitCheck = await checkResourceLimit(
      req.therapist.id,
      "sessions"
    );

    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        message:
          "Your subscription session limit has been reached. Please upgrade your plan.",
        limit: limitCheck.limit,
        currentCount: limitCheck.currentCount,
        remaining: limitCheck.remaining,
      });
    }

    const overlappingSession = await Session.findOne({
      therapist: req.therapist.id,
      status: "scheduled",
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (overlappingSession) {
      return res.status(409).json({
        message: "Another session is already scheduled during this time.",
      });
    }

    const session = await Session.create({
      therapist: req.therapist.id,
      client,
      clientPackage: selectedClientPackage
        ? selectedClientPackage._id
        : null,
      startTime: start,
      endTime: end,
      sessionType,
      meetingLink,
      fee,
    });

    await createBookingNotifications({
      therapistId: req.therapist.id,
      clientId: clientExists._id,
      sessionId: session._id,
      title: "New session scheduled",
      message: "A new therapy session has been scheduled.",
    });

    return res.status(201).json({
      success: true,
      message: "Session scheduled successfully.",
      session,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET ALL SESSIONS
// ==========================================

const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({
      therapist: req.therapist.id,
    })
      .populate("client", "name email phone")
      .populate("clientPackage")
      .sort({ startTime: 1 });

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
// UPDATE A SESSION
// ==========================================

const updateSession = async (req, res, next) => {
  const mongoSession = await mongoose.startSession();

  try {
    let updatedSessionId;

    await mongoSession.withTransaction(async () => {
      const currentSession = await Session.findOne({
        _id: req.params.id,
        therapist: req.therapist.id,
      }).session(mongoSession);

      if (!currentSession) {
        throw createRequestError("Session not found.", 404);
      }

      const allowedFields = [
        "startTime",
        "endTime",
        "sessionType",
        "meetingLink",
        "fee",
        "status",
      ];

      const updates = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (
        currentSession.status === "completed" &&
        updates.status &&
        updates.status !== "completed"
      ) {
        throw createRequestError(
          "A completed session cannot be reopened or changed.",
          400
        );
      }

      if (updates.startTime || updates.endTime) {
        const start = new Date(
          updates.startTime || currentSession.startTime
        );

        const end = new Date(
          updates.endTime || currentSession.endTime
        );

        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime()) ||
          end <= start
        ) {
          throw createRequestError(
            "Invalid session dates or times.",
            400
          );
        }

        updates.startTime = start;
        updates.endTime = end;

        const overlap = await Session.findOne({
          _id: { $ne: req.params.id },
          therapist: req.therapist.id,
          status: "scheduled",
          startTime: { $lt: end },
          endTime: { $gt: start },
        }).session(mongoSession);

        if (overlap) {
          throw createRequestError(
            "Another session is already scheduled during this time.",
            409
          );
        }
      }

      // Deduct package session only when transitioning to completed.
      const isBeingCompleted =
        updates.status === "completed" &&
        currentSession.status !== "completed";

      if (isBeingCompleted && currentSession.clientPackage) {
        const updatedPackage = await ClientPackage.findOneAndUpdate(
          {
            _id: currentSession.clientPackage,
            therapist: req.therapist.id,
            client: currentSession.client,
            status: "active",
            expiresAt: { $gt: new Date() },
            $expr: {
              $lt: ["$sessionsUsed", "$sessionsTotal"],
            },
          },
          {
            $inc: {
              sessionsUsed: 1,
            },
          },
          {
            new: true,
            runValidators: true,
            session: mongoSession,
          }
        );

        if (!updatedPackage) {
          throw createRequestError(
            "This client's package is expired or has no remaining sessions.",
            400
          );
        }

        if (
          updatedPackage.sessionsUsed >=
          updatedPackage.sessionsTotal
        ) {
          await ClientPackage.updateOne(
            {
              _id: updatedPackage._id,
              status: "active",
            },
            {
              $set: {
                status: "completed",
              },
            },
            {
              session: mongoSession,
            }
          );
        }

        updates.packageSessionDeducted = true;
      }

      const updatedSession = await Session.findOneAndUpdate(
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
          session: mongoSession,
        }
      );

      if (!updatedSession) {
        throw createRequestError("Session not found.", 404);
      }

      updatedSessionId = updatedSession._id;
    });

    const session = await Session.findById(updatedSessionId)
      .populate("client", "name email phone")
      .populate("clientPackage");

    await createBookingNotifications({
      therapistId: req.therapist.id,
      clientId: session.client._id,
      sessionId: session._id,
      title: "Session updated",
      message:
        session.status === "completed"
          ? "Your therapy session has been marked as completed."
          : "Your therapy session details have been updated.",
    });

    return res.status(200).json({
      success: true,
      message:
        session.status === "completed"
          ? "Session completed successfully. Package usage updated if applicable."
          : "Session updated successfully.",
      session,
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

// ==========================================
// CANCEL A SESSION
// ==========================================

const cancelSession = async (req, res, next) => {
  try {
    const existingSession = await Session.findOne({
      _id: req.params.id,
      therapist: req.therapist.id,
    });

    if (!existingSession) {
      return res.status(404).json({
        message: "Session not found.",
      });
    }

    if (existingSession.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "A completed session cannot be cancelled.",
      });
    }

    const session = await Session.findOneAndUpdate(
      {
        _id: req.params.id,
        therapist: req.therapist.id,
      },
      {
        status: "cancelled",
      },
      {
        new: true,
      }
    );

    await createBookingNotifications({
      therapistId: req.therapist.id,
      clientId: session.client,
      sessionId: session._id,
      title: "Session cancelled",
      message: "A therapy session has been cancelled.",
    });

    return res.status(200).json({
      success: true,
      message: "Session cancelled successfully.",
      session,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// AVAILABILITY HELPERS
// ==========================================

const makeISTDate = (date, time) => {
  return new Date(`${date}T${time}:00+05:30`);
};

const isValidBookingDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsed = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatTime = (minutes) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mins = String(minutes % 60).padStart(2, "0");

  return `${hours}:${mins}`;
};

// ==========================================
// SET THERAPIST WEEKLY AVAILABILITY
// ==========================================

const setAvailability = async (req, res, next) => {
  try {
    const { dayOfWeek, startTime, endTime } = req.body;

    if (
      dayOfWeek === undefined ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid day, start time and end time are required.",
      });
    }

    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (
      !timePattern.test(startTime) ||
      !timePattern.test(endTime) ||
      startTime >= endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid start or end time.",
      });
    }

    const availability = await Availability.create({
      therapist: req.therapist.id,
      dayOfWeek,
      startTime,
      endTime,
      availabilityType: "weekly",
      isAvailable: true,
    });

    return res.status(201).json({
      success: true,
      message: "Availability created successfully.",
      availability,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// BLOCK A SPECIFIC DATE AND TIME
// ==========================================

const blockAvailability = async (req, res, next) => {
  try {
    const { date, startTime, endTime } = req.body;

    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (
      !isValidBookingDate(date) ||
      !timePattern.test(startTime || "") ||
      !timePattern.test(endTime || "") ||
      startTime >= endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date, start time and end time.",
      });
    }

    const [year, month, day] = date.split("-").map(Number);

    const dayOfWeek = new Date(
      Date.UTC(year, month - 1, day)
    ).getUTCDay();

    const start = makeISTDate(date, startTime);
    const end = makeISTDate(date, endTime);

    if (start <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "The blocked time must start in the future.",
      });
    }

    const overlappingSession = await Session.findOne({
      therapist: req.therapist.id,
      status: "scheduled",
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (overlappingSession) {
      return res.status(409).json({
        success: false,
        message: "This time overlaps with an existing booking.",
      });
    }

    const blockedTime = await Availability.create({
      therapist: req.therapist.id,
      dayOfWeek,
      date,
      startTime,
      endTime,
      availabilityType: "date-specific",
      isAvailable: false,
    });

    return res.status(201).json({
      success: true,
      message: "Date and time blocked successfully.",
      blockedTime,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET THERAPIST AVAILABILITY
// ==========================================

const getAvailability = async (req, res, next) => {
  try {
    const availability = await Availability.find({
      therapist: req.therapist.id,
    }).sort({ dayOfWeek: 1, date: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count: availability.length,
      availability,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE THERAPIST AVAILABILITY
// ==========================================

const deleteAvailability = async (req, res, next) => {
  try {
    const availability = await Availability.findOneAndDelete({
      _id: req.params.id,
      therapist: req.therapist.id,
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Availability not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Availability deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PUBLIC: GET AVAILABLE SLOTS
// ==========================================

const getPublicAvailability = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { date, serviceId } = req.query;

    if (!isValidBookingDate(date) || !serviceId) {
      return res.status(400).json({
        success: false,
        message: "A valid date and service ID are required.",
      });
    }

    const therapist = await Therapist.findOne({ slug });

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found.",
      });
    }

    const service = therapist.services.id(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Selected service not found.",
      });
    }

    const duration = Number(service.duration);

    if (!Number.isInteger(duration) || duration <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid service duration.",
      });
    }

    const [year, month, day] = date.split("-").map(Number);

    const dayOfWeek = new Date(
      Date.UTC(year, month - 1, day)
    ).getUTCDay();

    const availability = await Availability.find({
      therapist: therapist._id,
      dayOfWeek,
      isAvailable: true,
      $or: [
        { availabilityType: "weekly" },
        { availabilityType: { $exists: false } },
      ],
    }).sort({ startTime: 1 });

    const blockedTimes = await Availability.find({
      therapist: therapist._id,
      date,
      availabilityType: "date-specific",
      isAvailable: false,
    });

    const dayStart = makeISTDate(date, "00:00");
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const existingSessions = await Session.find({
      therapist: therapist._id,
      status: "scheduled",
      startTime: { $lt: dayEnd },
      endTime: { $gt: dayStart },
    }).select("startTime endTime");

    const slots = [];
    const addedTimes = new Set();
    const now = new Date();

    for (const window of availability) {
      const windowStart = toMinutes(window.startTime);
      const windowEnd = toMinutes(window.endTime);

      for (
        let startMinutes = windowStart;
        startMinutes + duration <= windowEnd;
        startMinutes += 30
      ) {
        const endMinutes = startMinutes + duration;
        const time = formatTime(startMinutes);

        if (addedTimes.has(time)) {
          continue;
        }

        const start = makeISTDate(date, time);
        const end = new Date(
          start.getTime() + duration * 60000
        );

        if (start <= now) {
          continue;
        }

        const isBooked = existingSessions.some(
          (session) =>
            start < session.endTime &&
            end > session.startTime
        );

        const isBlocked = blockedTimes.some(
          (block) =>
            startMinutes < toMinutes(block.endTime) &&
            endMinutes > toMinutes(block.startTime)
        );

        if (!isBooked && !isBlocked) {
          addedTimes.add(time);

          slots.push({
            time,
            startTime: start,
            endTime: end,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      date,
      timezone: "Asia/Kolkata",
      duration,
      availability: slots,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PUBLIC: CREATE BOOKING
// ==========================================

const createPublicBooking = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const {
      name,
      email,
      phone,
      date,
      time,
      serviceId,
      sessionType,
      presentingConcern,
      consentAccepted,
    } = req.body;

    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim() ||
      !isValidBookingDate(date) ||
      !timePattern.test(time || "") ||
      !serviceId
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, valid date, time and service are required.",
      });
    }

    if (!["online", "in-person"].includes(sessionType)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid session type.",
      });
    }

    if (
      email &&
      (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const normalizedEmail = email
      ? email.trim().toLowerCase()
      : "";

    const therapist = await Therapist.findOne({ slug });

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found.",
      });
    }

    const service = therapist.services.id(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Selected service not found.",
      });
    }

    const duration = Number(service.duration);
    const fee = Number(service.price);

    if (
      !Number.isInteger(duration) ||
      duration <= 0 ||
      !Number.isFinite(fee) ||
      fee < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "The selected service has invalid booking details.",
      });
    }

    const start = makeISTDate(date, time);
    const end = new Date(start.getTime() + duration * 60000);

    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Please select a future time.",
      });
    }

    const [year, month, day] = date.split("-").map(Number);

    const dayOfWeek = new Date(
      Date.UTC(year, month - 1, day)
    ).getUTCDay();

    const startMinutes = toMinutes(time);
    const endMinutes = startMinutes + duration;

    const availability = await Availability.find({
      therapist: therapist._id,
      dayOfWeek,
      isAvailable: true,
      $or: [
        { availabilityType: "weekly" },
        { availabilityType: { $exists: false } },
      ],
    });

    const insideAvailability = availability.some(
      (window) =>
        startMinutes >= toMinutes(window.startTime) &&
        endMinutes <= toMinutes(window.endTime)
    );

    if (!insideAvailability) {
      return res.status(400).json({
        success: false,
        message: "The selected time is outside available hours.",
      });
    }

    const blockedTimes = await Availability.find({
      therapist: therapist._id,
      date,
      availabilityType: "date-specific",
      isAvailable: false,
    });

    const isBlocked = blockedTimes.some(
      (block) =>
        startMinutes < toMinutes(block.endTime) &&
        endMinutes > toMinutes(block.startTime)
    );

    if (isBlocked) {
      return res.status(409).json({
        success: false,
        message: "The selected time is blocked by the therapist.",
      });
    }

    const overlappingSession = await Session.findOne({
      therapist: therapist._id,
      status: "scheduled",
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (overlappingSession) {
      return res.status(409).json({
        success: false,
        message: "This time slot has already been booked.",
      });
    }

    // Find existing client first.
    let client = null;

    if (normalizedEmail) {
      client = await Client.findOne({
        therapist: therapist._id,
        email: normalizedEmail,
      });
    }

    // A first-time client must submit intake and consent.
    const existingIntake = client?.intake || {};

    const hasIntake = Boolean(
      existingIntake.presentingConcern &&
      existingIntake.completedAt
    );

    const hasConsent = Boolean(
      client?.consentRecords?.some(
        (record) => record.accepted === true
      )
    );

    if (!hasIntake || !hasConsent) {
      if (
        typeof presentingConcern !== "string" ||
        !presentingConcern.trim() ||
        consentAccepted !== true
      ) {
        return res.status(400).json({
          success: false,
          requiresIntake: true,
          message:
            "Please complete your intake form and accept consent before booking your first session.",
        });
      }
    }

    // Enforce client subscription limit before creating a client.
    if (!client) {
      const clientLimit = await checkResourceLimit(
        therapist._id,
        "clients"
      );

      if (!clientLimit.allowed) {
        return res.status(403).json({
          success: false,
          message: "This therapist has reached their client limit.",
          upgradeRequired: true,
          limit: clientLimit.limit,
          currentCount: clientLimit.currentCount,
          remaining: clientLimit.remaining,
        });
      }

      client = await Client.create({
        therapist: therapist._id,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : "",
      });
    }

    // Save intake and consent to the same Client document
    // used by the client portal and therapist CRM.
    if (!hasIntake || !hasConsent) {
      const submittedAt = new Date();

      const currentIntake = client.intake?.toObject?.()
        ? client.intake.toObject()
        : client.intake || {};

      client.intake = {
        ...currentIntake,
        presentingConcern: presentingConcern.trim(),
        completedAt: submittedAt,
      };

      client.consentRecords = client.consentRecords || [];

      client.consentRecords.push({
        consentVersion: "v1",
        accepted: true,
        acceptedAt: submittedAt,
      });

      await client.save();
    }

    // Check therapist subscription session limit.
    const limitCheck = await checkResourceLimit(
      therapist._id,
      "sessions"
    );

    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        message:
          "This therapist has reached their subscription session limit.",
        limit: limitCheck.limit,
        currentCount: limitCheck.currentCount,
        remaining: limitCheck.remaining,
      });
    }

    // Recheck availability immediately before creating the session.
    // This reduces the risk of two clients booking the same slot.
    const lastMomentOverlap = await Session.findOne({
      therapist: therapist._id,
      status: "scheduled",
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (lastMomentOverlap) {
      return res.status(409).json({
        success: false,
        message: "This time slot has just been booked. Please select another time.",
      });
    }

    const session = await Session.create({
      therapist: therapist._id,
      client: client._id,
      startTime: start,
      endTime: end,
      sessionType,
      fee,
    });

    await createBookingNotifications({
      therapistId: therapist._id,
      clientId: client._id,
      sessionId: session._id,
      title: "New booking received",
      message:
        "A new session has been booked through your public profile.",
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
     booking: {
  id: session._id,
  clientId: client._id,
  therapistId: therapist._id,
  date,
  time,
  duration,
  fee,
  sessionType,
  therapist: therapist.name,
  service: service.title,
},
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  createSession,
  getSessions,
  updateSession,
  cancelSession,
  setAvailability,
  blockAvailability,
  getAvailability,
  deleteAvailability,
  getPublicAvailability,
  createPublicBooking,
};
