
const ClientIntake = require("../models/ClientIntake");
const Client = require("../models/Client");

// ==========================================
// CLIENT: SUBMIT INTAKE FORM
// ==========================================

const submitIntake = async (req, res) => {
  try {
    const {
      dateOfBirth,
      gender,
      occupation,
      presentingConcern,
      therapyHistory,
      medicalHistory,
      medications,
      emergencyContactName,
      emergencyContactPhone,
      consent,
    } = req.body;

    if (consent !== true) {
      return res.status(400).json({
        message: "Consent is required before submitting the intake form.",
      });
    }

    if (!req.client || !req.client._id) {
      return res.status(401).json({
        message: "Client authentication is required.",
      });
    }

    const intake = await ClientIntake.create({
      client_id: req.client._id,
      dateOfBirth: dateOfBirth || null,
      gender,
      occupation,
      presentingConcern,
      therapyHistory,
      medicalHistory,
      medications,
      emergencyContactName,
      emergencyContactPhone,
      consent: {
        accepted: true,
        acceptedAt: new Date(),
        version: "1.0",
      },
    });

    return res.status(201).json({
      message: "Intake form submitted successfully.",
      intake,
    });
  } catch (error) {
    console.error("Client intake error:", error);

    return res.status(500).json({
      message: "Unable to submit intake form.",
    });
  }
};

// ==========================================
// THERAPIST: VIEW CLIENT INTAKE FORM
// ==========================================

const getClientIntake = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.clientId,
      therapist: req.therapist.id,
    });

    if (!client) {
      return res.status(404).json({
        message: "Client not found.",
      });
    }

    const intake = await ClientIntake.findOne({
      client_id: client._id,
    }).sort({ createdAt: -1 });

    if (!intake) {
      return res.status(404).json({
        message: "No intake form found for this client.",
      });
    }

    return res.status(200).json({
      message: "Client intake retrieved successfully.",
      intake,
    });
  } catch (error) {
    console.error("Get client intake error:", error);

    return res.status(500).json({
      message: "Unable to retrieve client intake.",
    });
  }
};

module.exports = {
  submitIntake,
  getClientIntake,
};
