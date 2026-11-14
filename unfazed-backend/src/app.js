
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

// Razorpay webhook must receive raw body BEFORE express.json().
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" })
);

// Parse JSON for all other API routes.
app.use(express.json());

// Root API
app.get("/", (req, res) => {
  res.json({
    message: "Unfazed API is running successfully!",
  });
});

// Authentication
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/client-auth", require("./routes/clientAuthRoutes"));

// Therapist and client management
app.use("/api/therapists", require("./routes/therapistRoutes"));
app.use("/api/clients", require("./routes/clientRoutes"));

// Client portal
app.use("/api/client-portal", require("./routes/clientPortalRoutes"));

// Scheduling
app.use("/api/scheduling", require("./routes/schedulingRoutes"));

// CRM and communication
app.use("/api/leads", require("./routes/leadRoutes"));

// Payments
app.use("/api/payments", require("./routes/paymentRoutes"));

// Notes
app.use("/api/notes", require("./routes/noteRoutes"));

// Notifications
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Analytics
app.use("/api/analytics", require("./routes/analyticsRoutes"));

// Therapist packages and subscriptions
app.use("/api/packages", require("./routes/packageRoutes"));
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));

// Client package purchases
app.use(
  "/api/client-packages",
  require("./routes/clientPackageRoutes")
);

// Client intake
app.use(
  "/api/client-portal/intake",
  require("./routes/clientIntakeRoutes")
);

// Error handling (must remain last)
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

module.exports = app;
