
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createClient,
  getClients,
  getClientById,
  getClientIntake,
  updateClient,
  updateClientTags,
  getClientSessionHistory,
  deleteClient,
} = require("../controllers/clientController");

// =====================================
// THERAPIST CLIENT MANAGEMENT
// =====================================

// Protect all client routes
router.use(authMiddleware);

// =====================================
// CREATE AND FETCH CLIENTS
// =====================================

// Create client (subscription limit checked in controller)
router.post("/", createClient);

// Get all clients
router.get("/", getClients);

// =====================================
// INDIVIDUAL CLIENT INFORMATION
// =====================================

// Get client intake and consent information
router.get("/:id/intake", getClientIntake);

// Get client session history
router.get("/:id/sessions", getClientSessionHistory);

// Get complete client profile
router.get("/:id", getClientById);

// =====================================
// UPDATE CLIENT INFORMATION
// =====================================

// Update client tags
router.put("/:id/tags", updateClientTags);

// Update client details
router.put("/:id", updateClient);

// =====================================
// DELETE CLIENT
// =====================================

router.delete("/:id", deleteClient);

module.exports = router;
