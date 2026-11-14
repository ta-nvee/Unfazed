
const express = require("express");
const router = express.Router();

const {
  registerClient,
  registerClientWithTherapist,
  loginClient,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  selectTherapist,
} = require("../controllers/clientAuthController");

const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");

// ==========================================
// PUBLIC ROUTES
// ==========================================

router.post("/register", registerClient);

router.post(
  "/register/select-therapist",
  registerClientWithTherapist
);

router.post("/login", loginClient);

// ==========================================
// PROTECTED PROFILE ROUTES
// ==========================================

router.get("/me", clientAuthMiddleware, getMyProfile);

router.put("/me", clientAuthMiddleware, updateMyProfile);

// ==========================================
// PROTECTED THERAPIST SELECTION ROUTE
// ==========================================

router.post(
  "/select-therapist",
  clientAuthMiddleware,
  selectTherapist
);

// ==========================================
// PASSWORD ROUTE
// ==========================================

router.put(
  "/change-password",
  clientAuthMiddleware,
  changeMyPassword
);

module.exports = router;
