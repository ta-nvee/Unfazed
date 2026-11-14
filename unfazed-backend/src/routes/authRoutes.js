

const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const clientAuthController = require("../controllers/clientAuthController");

// Therapist authentication
router.post("/register", authController.register);
router.post("/login", authController.login);

// Client authentication
router.post("/client/register", clientAuthController.registerClient);
router.post("/client/login", clientAuthController.loginClient);

module.exports = router;
