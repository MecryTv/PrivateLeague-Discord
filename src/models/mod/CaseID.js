const mongoose = require("mongoose");

const CaseID = mongoose.model(
    "CaseID",
    new mongoose.Schema({
        caseID: {type: String, unique: true}
    })
);

module.exports = CaseID;