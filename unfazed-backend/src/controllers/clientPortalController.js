
const mongoose = require("mongoose");
const { generateInvoicePDF } = require("../services/invoiceService");
const Session = require("../models/Session");
const SessionNote = require("../models/SessionNote");
const Payment = require("../models/Payment");
const Therapist = require("../models/Therapist");
const Availability = require("../models/Availability");
const Client = require("../models/Client");

// ==========================================
// BOOKING HELPERS (IST)
// ==========================================

const makeISTDate = (date, time) =>
  new Date(`${date}T${time}:00+05:30`);

const isValidBookingDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

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

// ==========================================
// GET ASSIGNED THERAPIST
// ==========================================

exports.getMyTherapist = async (req, res, next) => {
  try {
    const therapist = await Therapist.findById(
      req.client.therapist
    ).select("name slug bio specializations languages services");

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Your assigned therapist was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      therapist,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET ALL THERAPISTS AVAILABLE FOR BOOKING
// ==========================================

exports.getBookableTherapists = async (req, res, next) => {
  try {
    const therapists = await Therapist.find({
      services: { $exists: true, $ne: [] },
    }).select("name slug bio specializations languages services");

    return res.status(200).json({
      success: true,
      count: therapists.length,
      therapists,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SAVED CLIENT INTAKE AND CONSENT
// ==========================================

exports.getMyIntake = async (req, res, next) => {
  try {
    const client = await Client.findById(req.client._id).select(
      "intake consentRecords"
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client account not found.",
      });
    }

    const consentRecords = client.consentRecords || [];
    const latestConsent =
      consentRecords.length > 0
        ? consentRecords[consentRecords.length - 1]
        : null;

    return res.status(200).json({
      success: true,
      intake: client.intake || {},
      consentAccepted: latestConsent?.accepted === true,
      consentAcceptedAt: latestConsent?.acceptedAt || null,
      consentVersion: latestConsent?.consentVersion || null,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SUBMIT CLIENT INTAKE AND CONSENT
// ==========================================

exports.submitMyIntake = async (req, res, next) => {
  try {
    const {
      dateOfBirth,
      gender,
      occupation,
      emergencyContact,
      presentingConcern,
      relevantHistory,
      consentAccepted,
    } = req.body;

    if (consentAccepted !== true) {
      return res.status(400).json({
        success: false,
        message: "You must accept the consent form before submitting.",
      });
    }

    if (!presentingConcern || !presentingConcern.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your presenting concern.",
      });
    }

    let parsedDateOfBirth = null;

    if (dateOfBirth) {
      parsedDateOfBirth = new Date(dateOfBirth);

      if (Number.isNaN(parsedDateOfBirth.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid date of birth.",
        });
      }
    }

    const client = await Client.findById(req.client._id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client account not found.",
      });
    }

    const submittedAt = new Date();

    client.intake = {
      dateOfBirth: parsedDateOfBirth,
      gender: gender || "",
      occupation: occupation || "",
      emergencyContact: {
        name: emergencyContact?.name || "",
        phone: emergencyContact?.phone || "",
        relationship: emergencyContact?.relationship || "",
      },
      presentingConcern: presentingConcern.trim(),
      relevantHistory: relevantHistory || "",
      completedAt: submittedAt,
    };

    client.consentRecords.push({
      consentVersion: "v1",
      accepted: true,
      acceptedAt: submittedAt,
    });

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Your intake form and consent have been submitted successfully.",
      intakeCompletedAt: client.intake.completedAt,
      consentAcceptedAt: submittedAt,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// BOOK APPOINTMENT FOR LOGGED-IN CLIENT
// ==========================================

exports.createMyBooking = async (req, res, next) => {
  try {
    const client = await Client.findById(req.client._id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client account not found.",
      });
    }

    // Require completed intake and consent.
    const consentRecords = client.consentRecords || [];
    const latestConsent = consentRecords[consentRecords.length - 1];

    if (!client.intake?.completedAt || !latestConsent?.accepted) {
      return res.status(403).json({
        success: false,
        message:
          "Please complete your intake form and accept the consent form before booking a session.",
        intakeRequired: true,
      });
    }

    const {
      therapistId,
      date,
      time,
      serviceId,
      sessionType,
    } = req.body;

    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (
      !mongoose.Types.ObjectId.isValid(therapistId || "") ||
      !isValidBookingDate(date) ||
      !timePattern.test(time || "") ||
      !mongoose.Types.ObjectId.isValid(serviceId || "")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a valid therapist, service, date and time.",
      });
    }

    if (!["online", "in-person"].includes(sessionType)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid session type.",
      });
    }

    // Find the therapist selected by the client.
    const therapist = await Therapist.findById(therapistId);

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Selected therapist was not found.",
      });
    }

    const service = therapist.services.id(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Selected service was not found for this therapist.",
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

    // Check selected therapist's weekly availability.
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
        message:
          "This time is outside the selected therapist's available hours.",
      });
    }

    // Check date-specific blocked times.
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
        message: "This time has been blocked by the therapist.",
      });
    }

    // Check existing appointments for the selected therapist.
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

    // Create appointment for the logged-in client.
    const session = await Session.create({
      therapist: therapist._id,
      client: req.client._id,
      startTime: start,
      endTime: end,
      sessionType,
      fee,
    });

    return res.status(201).json({
      success: true,
      message: "Your appointment has been booked successfully.",
      session,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SESSIONS BELONGING TO LOGGED-IN CLIENT
// ==========================================

exports.getMySessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({
      client: req.client._id,
    })
      .populate("therapist", "name email")
      .sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SHARED NOTES ONLY — LOGGED-IN CLIENT
// ==========================================

exports.getMyNotes = async (req, res, next) => {
  try {
    const notes = await SessionNote.find({
      client: req.client._id,
      visibility: "shared",
    })
      .select("content noteType visibility session createdAt updatedAt")
      .populate("session", "startTime endTime")
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
// GET PAYMENT HISTORY BELONGING TO CLIENT
// ==========================================

exports.getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({
      client: req.client._id,
    })
      .select("amount currency status razorpayOrderId paidAt createdAt session")
      .populate("session", "startTime endTime")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DOWNLOAD INVOICE — LOGGED-IN CLIENT
// ==========================================

exports.downloadMyInvoice = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      client: req.client._id,
      status: "paid",
    })
      .populate("therapist", "name email")
      .populate("client", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Paid payment not found.",
      });
    }

    if (!payment.invoiceNumber) {
      const date = new Date(payment.paidAt || Date.now());

      const datePart = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("");

      const paymentPart = payment._id
        .toString()
        .slice(-8)
        .toUpperCase();

      payment.invoiceNumber = `UNF-${datePart}-${paymentPart}`;
    }

    const pdfBuffer = await generateInvoicePDF(
      payment,
      payment.invoiceNumber
    );

    if (!payment.invoiceGeneratedAt) {
      payment.invoiceGeneratedAt = new Date();
    }

    await payment.save();

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${payment.invoiceNumber}.pdf"`
    );

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
