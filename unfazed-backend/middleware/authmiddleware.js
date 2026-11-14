const jwt = require("jsonwebtoken");
const Therapist = require("../models/Therapist");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const therapist = await Therapist.findById(decoded.id);

    if (!therapist) {
      return res.status(401).json({
        message: "Therapist account not found",
      });
    }

    req.therapist = therapist;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};