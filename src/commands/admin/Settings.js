const Command = require("../../structures/Command");
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ContainerBuilder,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder
} = require("discord.js");
const Permissions = require("../../enums/Permissions");
const ConfigService = require("../../services/ConfigService");

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
        await interaction.deferReply({ ephemeral: true });

        const bot = interaction.guild.members.me;

        if (!bot.permissions.has(Permissions.Administrator)) {
            return interaction.editReply({
                content: "Ich benötige Administrator Rechte, um diesen Befehl auszuführen",
                ephemeral: true,
            });
        }

        const settingsConfig = await ConfigService.get("settings");

        if (!settingsConfig || !settingsConfig[0] || !settingsConfig[0].pages) {
            return interaction.editReply({
                content: "Die Konfiguration für die Channels wurde nicht gefunden. Bitte setze die Konfiguration zuerst.",
                ephemeral: true,
            });
        }

        const pages = settingsConfig[0].pages;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("settings-select")
            .setPlaceholder("📜 | Wähle eine Kategorie")
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
                pages.map((page) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(page.name)
                        .setValue(page.value)
                        .setDescription(page.description)
                )
            );

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        const title = new TextDisplayBuilder().setContent(
            "# Bot Einstellungen"
        );

        const settingsContent = "test";
        const text = new TextDisplayBuilder().setContent(settingsContent);

        const separator = new SeparatorBuilder();

        const spacer = new TextDisplayBuilder().setContent('\u200B');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(spacer)
            .addTextDisplayComponents(text);


        await interaction.channel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [container, actionRow],
        });

        return interaction.editReply({
            content: "Einstellungen wurden gesendet",
            ephemeral: true,
        });
    }
}

module.exports = Settings;