const Event = require("../../structures/Events");
const mongoose = require("mongoose");
const { MONGO_URL } = require("../../../config.json");
const logger = require("../../utils/logger");
const Guardian = require("../../services/Guardian");

class Mongodb extends Event {
    constructor(client) {
        super(client, "clientReady", true);
    }

    async execute() {
        if (!MONGO_URL) {
            return Guardian.handleEvent(
                "Die MongoDB URL fehlt in der config.json.",
                { eventName: this.name }
            );
        }

        await mongoose.connect(MONGO_URL).catch(error => {
            Guardian.handleEvent(
                `Verbindung zur MongoDB fehlgeschlagen. Grund: ${error.message}`,
                { eventName: this.name }
            );
        });

        logger.info("✅  MongoDB Connected");
    }
}

module.exports = Mongodb;