require("dotenv").config();
const BotClient = require("./client/BotClient");

const client = new BotClient();
client.start(process.env.TOKEN);