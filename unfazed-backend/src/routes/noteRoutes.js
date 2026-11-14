
const express = require("express");
const router = express.Router();

const {
  createNote,
  getClientNotes,
  getSharedClientNotes,
  updateNote,
  deleteNote,
} = require("../controllers/noteController");

const authMiddleware = require("../middleware/authMiddleware");
const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");

// Client route: shared notes only
router.get(
  "/my-shared",
  clientAuthMiddleware,
  getSharedClientNotes
);

// Therapist routes
router.use(authMiddleware);

router.post("/", createNote);
router.get("/client/:clientId", getClientNotes);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;
