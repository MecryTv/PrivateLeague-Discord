const mongoose = require("mongoose");

const Warn = mongoose.model(
    "Warn",
  new mongoose.Schema({
      guildId: { type: String, required: true },
      caseId: { type: String, required: true },
      userId: { type: String },
      moderatorId: { type: String },
      reason: { type: String },
      createdAt: { type: Date, default: Date.now },
  })
);

module.exports = Warn;