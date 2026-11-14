
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    recipientType: {
      type: String,
      enum: ["therapist", "client"],
      required: true,
    },

    type: {
      type: String,
      enum: ["new_message", "session_reminder", "booking_update"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({
  recipientType: 1,
  therapist: 1,
  client: 1,
  isRead: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);
