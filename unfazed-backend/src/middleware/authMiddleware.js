
const jwt = require("jsonwebtoken");
const Therapist = require("../models/Therapist");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please provide a valid token.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const therapistId = decoded.id || decoded._id;

    if (!therapistId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const therapist = await Therapist.findById(therapistId).select(
      "-password_hash"
    );

    if (!therapist) {
      return res.status(401).json({
        success: false,
        message: "Therapist account not found.",
      });
    }

    req.therapist = therapist;

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error.message);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

module.exports = authMiddleware;
