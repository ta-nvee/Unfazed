
const jwt = require("jsonwebtoken");
const Client = require("../models/Client");

const clientAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Client authentication token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Client JWT verified:", {
      id: decoded.id,
      role: decoded.role,
    });

    if (decoded.role !== "client") {
      return res.status(403).json({
        message: "Access denied. Client account required.",
      });
    }

    const client = await Client.findOne({
      _id: decoded.id,
      status: "active",
      accountCreatedAt: { $ne: null },
    });

    if (!client) {
      return res.status(401).json({
        message: "Client account not found or inactive.",
      });
    }

    req.client = client;
    next();

  } catch (error) {
    console.error("CLIENT AUTH ERROR:", error);

    return res.status(401).json({
      message: "Invalid or expired authentication token.",
      error: error.message,
    });
  }
};

module.exports = clientAuthMiddleware;
