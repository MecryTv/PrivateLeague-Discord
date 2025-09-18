const { TOKEN } = require('../config.json');
const BotClient = require("./client/BotClient");

const client = new BotClient();
client.start(TOKEN);