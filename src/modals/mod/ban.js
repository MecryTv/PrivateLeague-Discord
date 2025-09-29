const mongoose = require("mongoose");

const Ban = mongoose.model(
    "Ban",
    new mongoose.Schema({
        guildId: {type: String, required: true},
        caseId: {type: String, required: true},
        banType: {type: String, enum: ['temp', 'perma']},
        userId: {type: String},
        moderatorId: {type: String},
        reason: {type: String},
        duration: {type: Number},
        expiresAt: {type: Date},
        createdAt: {type: Date, default: Date.now},
        active: {type: Boolean}
    })
);

module.exports = Ban;