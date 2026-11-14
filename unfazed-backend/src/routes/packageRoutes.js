
const express = require("express");
const router = express.Router();

const {
  createPackage,
  getPackages,
  updatePackage,
  deletePackage,
} = require("../controllers/packageController");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/", createPackage);
router.get("/", getPackages);
router.put("/:id", updatePackage);
router.delete("/:id", deletePackage);

module.exports = router;
