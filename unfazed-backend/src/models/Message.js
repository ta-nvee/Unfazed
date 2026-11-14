
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
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

    roomId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    senderType: {
      type: String,
      enum: ["therapist", "client"],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, sentAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
