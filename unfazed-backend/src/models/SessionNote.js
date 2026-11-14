
const mongoose = require("mongoose");

const sessionNoteSchema = new mongoose.Schema(
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

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    noteType: {
      type: String,
      enum: ["session", "progress", "general", "soap", "dap"],
      default: "session",
    },

    visibility: {
      type: String,
      enum: ["private", "shared"],
      default: "private",
      index: true,
    },
  },
  { timestamps: true }
);

sessionNoteSchema.index({ therapist: 1, client: 1, createdAt: -1 });
sessionNoteSchema.index({ client: 1, visibility: 1, createdAt: -1 });

module.exports = mongoose.model("SessionNote", sessionNoteSchema);
