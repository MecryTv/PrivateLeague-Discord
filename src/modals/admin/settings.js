const mongoose = require("mongoose");

const Settings = mongoose.model(
    "Settings",
  new mongoose.Schema({
      guildId: { type: String, required: true, unique: true },
      welcomeChannelId: { type: String },
      ticketsChannelId: { type: String },
      logChannelId: { type: String },
      applicationChannelId: { type: String },
      supportChannelId: { type: String },
  })
);

module.exports = Settings;