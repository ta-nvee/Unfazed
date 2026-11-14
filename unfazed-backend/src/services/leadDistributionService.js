
const Lead = require("../models/Lead");
const Therapist = require("../models/Therapist");

async function assignLead(therapistId, leadData) {
  const therapist = await Therapist.findById(therapistId);

  if (!therapist) {
    throw new Error("Therapist not found.");
  }

  const lead = await Lead.create({
    therapist: therapistId,
    name: leadData.name,
    email: leadData.email || "",
    phone: leadData.phone || "",
    source: leadData.source || "other",
    notes: leadData.notes || "",
  });

  return lead;
}

module.exports = { assignLead };

