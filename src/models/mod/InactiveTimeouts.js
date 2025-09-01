const mongoose = require("mongoose");

const InativeTimeouts = mongoose.model(
    "InativeTimeouts",
    new mongoose.Schema({
        userId: {type: String, required: true},
        modId: {type: String},
        reason: {type: String},
        caseId: {type: String},
        startTimestamp: {type: Date},
        endTimestamp: {type: Date},
    })
);

module.exports = InativeTimeouts;