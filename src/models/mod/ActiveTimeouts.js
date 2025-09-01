const mongoose = require("mongoose");

const AcitiveTimeouts = mongoose.model(
    "AcitiveTimeouts",
    new mongoose.Schema({
        userId: {type: String, required: true},
        modId: {type: String},
        reason: {type: String},
        caseId: {type: String},
        startTimestamp: {type: Date},
        endTimestamp: {type: Date},
    })
);

module.exports = AcitiveTimeouts;