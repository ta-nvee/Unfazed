
const express = require("express");
const router = express.Router();

const {
  getDashboardAnalytics,
  getAdvancedAnalytics,
} = require("../controllers/analyticsController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/dashboard", getDashboardAnalytics);
router.get("/advanced", getAdvancedAnalytics);

module.exports = router;
