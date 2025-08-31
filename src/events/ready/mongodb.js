const mongoose = require("mongoose");
const mongoURL = process.env.MONGO_URL;
const logger = require("../../logger");

module.exports = async (client) => {
    if (!mongoURL) return logger.error("MongoDB URL is missing");

    try {
        await mongoose.connect(mongoURL);
        logger.info("MongoDB Connected");
    } catch (error) {
        logger.error("MongoDB Connection Error: ", error);
    }
};