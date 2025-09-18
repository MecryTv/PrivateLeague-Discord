const {Client, Collection, GatewayIntentBits, REST, Routes} = require("discord.js");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const { TOKEN, CLIENT_ID } = require('../../config.json');

class BotClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildIntegrations,
                GatewayIntentBits.GuildScheduledEvents,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.GuildScheduledEvents,
                GatewayIntentBits.DirectMessages,
            ],
        });

        this.commands = new Collection();
    }

    async loadAndRegisterCommands() {
        const commandsPath = path.join(__dirname, "../commands");
        const commandFiles = this.getAllFiles(commandsPath);

        const commandArray = [];
        let count = 0;

        for (const file of commandFiles) {
            const CommandClass = require(file);
            const command = new CommandClass();

            this.commands.set(command.name, command);

            if (command.data) {
                commandArray.push(command.data.toJSON());
            }
            count++;
        }

        if (!CLIENT_ID || !TOKEN) {
            throw new Error("CLIENT_ID oder TOKEN fehlt in der config.json Datei!");
        }

        const rest = new REST({version: "10"}).setToken(TOKEN);

        try {
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                {body: commandArray}
            );
            logger.info(`🚀  ${count} Commands geladen`);
        } catch (err) {
            logger.error("❌ Fehler beim Registrieren der Commands:", err);
        }
    }

    async loadEvents() {
        const eventsPath = path.join(__dirname, "../events");
        const eventFolders = fs.readdirSync(eventsPath);

        let count = 0;
        for (const folder of eventFolders) {
            const folderPath = path.join(eventsPath, folder);
            const eventFiles = this.getAllFiles(folderPath);

            for (const file of eventFiles) {
                const EventClass = require(file);
                const event = new EventClass(this);

                if (event.once) {
                    this.once(event.name, (...args) => event.execute(...args));
                } else {
                    this.on(event.name, (...args) => event.execute(...args));
                }
                count++;
            }
        }
        logger.info(`🚀  ${count} Events geladen`);
    }

    getAllFiles(dir) {
        const files = fs.readdirSync(dir, {withFileTypes: true});
        let allFiles = [];
        for (const file of files) {
            const filePath = path.join(dir, file.name);
            if (file.isDirectory()) {
                allFiles = [...allFiles, ...this.getAllFiles(filePath)];
            } else if (file.name.endsWith(".js")) {
                allFiles.push(filePath);
            }
        }
        return allFiles;
    }

    async start(token) {
        await this.loadAndRegisterCommands();
        await this.loadEvents();
        await this.login(token);
    }
}

module.exports = BotClient;
