const mongoose = require("mongoose");

const Timeout = mongoose.model(
    "Timeout",
  new mongoose.Schema({
      guildId: { type: String, required: true },
      caseId: { type: String, required: true },
      userId: { type: String },
      moderatorId: { type: String },
      reason: { type: String },
      duration: { type: Number },
      expiresAt: { type: Date },
      createdAt: { type: Date, default: Date.now },
      active: { type: Boolean },
  })
);

module.exports = Timeout;