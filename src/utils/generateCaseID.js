const crypto = require("crypto");
const caseIDModel = require("../models/mod/CaseID");

async function generateCaseID() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 6; i++) {
        const idx = crypto.randomInt(0, chars.length);
        id += chars.charAt(idx);
    }

    const existing = await caseIDModel.findOne({caseID: id});
    if (existing) {
        return generateCaseID();
    }

    const newCaseID = new caseIDModel({caseID: id});
    await newCaseID.save();

    return id;
}

module.exports = generateCaseID;
