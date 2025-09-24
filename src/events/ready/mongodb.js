const Event = require("../../structures/Events");
const mongoose = require("mongoose");
const { MONGO_URL } = require("../../../config.json");
const logger = require("../../utils/logger");

class Mongodb extends Event {
    constructor(client) {
        super(client, "clientReady", true);
    }

    async execute() {
        if (!MONGO_URL) return logger.error("MongoDB URL is missing");

        try {
            await mongoose.connect(MONGO_URL);
            logger.info("✅  MongoDB Connected");
        } catch (error) {
            logger.error("MongoDB Connection Error: ", error);
        }
    }
}

module.exports = Mongodb;