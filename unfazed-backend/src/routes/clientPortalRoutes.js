const express = require("express");
const router = express.Router();

const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");

const {
  getMyTherapist,
  getBookableTherapists,
  getMyIntake,
  submitMyIntake,
  createMyBooking,
  getMySessions,
  getMyNotes,
  getMyPayments,
  downloadMyInvoice,
} = require("../controllers/clientPortalController");

// All routes require client authentication
router.use(clientAuthMiddleware);

// Therapist details
router.get("/therapist", getMyTherapist);

// All therapists available for booking
router.get("/therapists", getBookableTherapists);

// Client intake and consent
router.get("/intake", getMyIntake);
router.put("/intake", submitMyIntake);

// Appointment booking
router.post("/bookings", createMyBooking);

// Client portal data
router.get("/sessions", getMySessions);
router.get("/notes", getMyNotes);
router.get("/payments", getMyPayments);
router.get("/payments/:paymentId/invoice", downloadMyInvoice);

module.exports = router;