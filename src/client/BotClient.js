const {Client, Collection, GatewayIntentBits, REST, Routes} = require("discord.js");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const { TOKEN, CLIENT_ID } = require('../../config.json');
const ModalService = require("../services/ModalService");
const ConfigService = require("../services/ConfigService");
const MessageService = require("../services/MessageService");
const MediaService = require("../services/MediaService");
const EmojiService = require("../services/EmojiService");
const Guardian = require("../services/Guardian");

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
            try {
                const CommandClass = require(file);
                const command = new CommandClass();
                this.commands.set(command.name, command);
                if (command.data) {
                    commandArray.push(command.data.toJSON());
                }
                count++;
            } catch (error) {
                Guardian.handleGeneric(`Fehler beim Laden des Befehls in Datei: ${path.basename(file)}`, 'Command Loading', error.stack);
            }
        }

        if (!CLIENT_ID || !TOKEN) {
            await Guardian.handleGeneric("CLIENT_ID oder TOKEN fehlt in der config.json. Der Bot kann nicht starten.", "Bot Initialization");
            process.exit(1);
        }

        const rest = new REST({version: "10"}).setToken(TOKEN);

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandArray })
            .then(() => logger.info(`🚀  ${count} Commands geladen und registriert.`))
            .catch(err => {
                Guardian.handleGeneric(`Fehler beim Registrieren der Slash Commands bei Discord. Grund`, "Discord API Error", err.stack);
            });
    }

    async loadEvents() {
        const eventsPath = path.join(__dirname, "../events");
        const eventFolders = fs.readdirSync(eventsPath);
        let count = 0;

        for (const folder of eventFolders) {
            const folderPath = path.join(eventsPath, folder);
            const eventFiles = this.getAllFiles(folderPath);

            for (const file of eventFiles) {
                try {
                    const EventClass = require(file);
                    const event = new EventClass(this);
                    if (event.once) {
                        this.once(event.name, (...args) => event.execute(...args));
                    } else {
                        this.on(event.name, (...args) => event.execute(...args));
                    }
                    count++;
                } catch (error) {
                    Guardian.handleGeneric(`Fehler beim Laden des Events in Datei: ${path.basename(file)}`, 'Event Loading', error.stack);
                }
            }
        }
        logger.info(`🚀  ${count} Events geladen.`);
    }

    getAllFiles(dir) {
        try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
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
        } catch (error) {
            Guardian.handleGeneric(`Fehler beim Lesen des Verzeichnisses: ${dir}`, "File System Error", error.stack);
            return [];
        }
    }

    async start(token) {
        logger.mtvBanner();
        Guardian.initialize(this);

        try {
            await this.loadAndRegisterCommands();
            await this.loadEvents();

            logger.info(`💾  ${ModalService.getModelCount()} Modals geladen`);
            logger.info(`⚙️  ${ConfigService.getConfigCount()} Konfigurationen geladen`);
            logger.info(`💬  ${MessageService.getMessageCount()} Nachrichtendateien geladen`);
            logger.info(`🖼️ ${MediaService.getMediaCount()} Mediendateien geladen`);
            logger.info(`😃  ${EmojiService.getEmojiCount()} Emojis geladen`);

            await this.login(token);

        } catch (error) {
            await Guardian.handleGeneric(`Ein kritischer Fehler ist während des Bot-Starts aufgetreten: ${error.message}`, "Critical Startup Error");
        }
    }
}

module.exports = BotClient;