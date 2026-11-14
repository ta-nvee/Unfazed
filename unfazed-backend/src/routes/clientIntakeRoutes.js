
const express = require("express");
const router = express.Router();

const { submitIntake } = require("../controllers/clientIntakeController");
const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");

router.post("/", clientAuthMiddleware, submitIntake);

module.exports = router;
