const Command = require("../../structures/Command");
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    MediaGalleryBuilder
} = require("discord.js");
const Permissions = require("../../enums/Permissions");
const ConfigService = require("../../services/ConfigService");
const MessageService = require("../../services/MessageService");
const MediaService = require("../../services/MediaService");

class Settings extends Command {
    constructor() {
        super({
            name: "settings",
            description: "Einstellungen für den Bot anzeigen",
        });

        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setDefaultMemberPermissions(Permissions.Administrator);
    }

    async execute(interaction) {
        await interaction.deferReply({});

        const einstellungAttachment = MediaService.getAttachment('Einstellung.png');
        const einstellungUrl = MediaService.getAttachmentURL('Einstellung.png');

        const bot = interaction.guild.members.me;
        if (!bot.permissions.has(Permissions.Administrator)) {
            return interaction.editReply({
                content: "Ich benötige Administrator Rechte, um diesen Befehl auszuführen."
            });
        }

        const settingsConfig = ConfigService.get("settings");
        if (!settingsConfig || !settingsConfig[0] || !settingsConfig[0].pages) {
            return interaction.editReply({
                content: "Die Konfiguration für die Seiten wurde nicht gefunden."
            });
        }

        const pages = settingsConfig[0].pages;
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("settings-select")
            .setPlaceholder("📜 | Wähle eine Kategorie")
            .addOptions(
                pages.map((page) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(page.name)
                        .setValue(page.value)
                        .setDescription(page.description)
                )
            );
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        const title = MessageService.get("settings.mainMenu.title");
        const text = MessageService.get("settings.mainMenu.text");

        if (!title || !text) {
            return interaction.editReply({ content: "Fehler: Die Nachrichtendatei 'settings.json' oder deren Inhalt konnte nicht geladen werden." });
        }

        const container = this.buildContainer(title, text, einstellungUrl);

        await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container, actionRow],
            files: [einstellungAttachment]
        });
    }

    buildContainer(titleContent, textContent, einstellungUrl) {
        const title = new TextDisplayBuilder().setContent(titleContent);
        const text = new TextDisplayBuilder().setContent(textContent);
        const separator1 = new SeparatorBuilder();
        const separator2 = new SeparatorBuilder();
        const spacer = new TextDisplayBuilder().setContent('\u200B');
        const image = new MediaGalleryBuilder()
            .addItems([
                {
                    media: {
                        url: einstellungUrl,
                    }
                }
            ]);

        return new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(spacer)
            .addTextDisplayComponents(text)
            .addSeparatorComponents(separator2)
            .addMediaGalleryComponents(image);
    }
}

module.exports = Settings;