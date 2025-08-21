const { ActivityType } = require("discord.js");
const logger = require('../../logger.js');

module.exports = (client) => {
    logger.info(`✅ Logged in as ${client.user.username}`);

    let status = [
        {
            name: "Private League Games",
            type: ActivityType.Watching,
        },
        {
            name: "Use /help",
            type: ActivityType.Listening,
        },
        {
            name: "Developed by MecryTv",
            type: ActivityType.Custom,
        },
    ];

    setInterval(() => {
        let randomStatus = Math.floor(Math.random() * status.length);
        client.user.setActivity(status[randomStatus]);
    }, 10000);
}