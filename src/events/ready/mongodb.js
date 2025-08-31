const Event = require("../../structures/Events");
const mongoose = require("mongoose");
const mongoURL = process.env.MONGO_URL;
const logger = require("../../utils/logger");

class Mongodb extends Event {
    constructor(client) {
        super(client, "ready", false);
    }

    async execute() {
        if (!mongoURL) return logger.error("MongoDB URL is missing");

        try {
            await mongoose.connect(mongoURL);
            logger.info("MongoDB Connected");
        } catch (error) {
            logger.error("MongoDB Connection Error: ", error);
        }
    }
}

module.exports = Mongodb;