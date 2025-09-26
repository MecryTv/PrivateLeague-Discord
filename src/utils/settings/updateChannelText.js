const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require("discord.js");
const ModalService = require("../../services/ModalService");
const ConfigService = require("../../services/ConfigService");
const generateChannelText = require("./generateChannelText");
const logger = require("../../utils/logger");

/**
 * Aktualisiert die Einstellungsnachricht und zeigt weiterhin das Channel-Menü an.
 * @param {import('discord.js').Interaction} interaction Die ursprüngliche Interaktion.
 */
async function updateChannelText(interaction) {
    try {
        const newDbSettings = await ModalService.findOne("settings");
        const settingsConfig = ConfigService.get("settings")[0];
        const channelConfig = settingsConfig.channel;

        const title = new TextDisplayBuilder().setContent("# Channel Einstellungen");
        const settingsContent = generateChannelText(newDbSettings, channelConfig);
        const text = new TextDisplayBuilder().setContent(settingsContent);
        const separator = new SeparatorBuilder();
        const spacer = new TextDisplayBuilder().setContent('\u200B');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(spacer)
            .addTextDisplayComponents(text);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("channel-select")
            .setPlaceholder("📁 | Wähle einen Kanal")
            .addOptions(
                channelConfig.map((channel) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(channel.name)
                        .setValue(channel.value)
                        .setDescription(channel.description)
                )
            );
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.message.edit({
            components: [container, actionRow]
        });

    } catch (error) {
        logger.error("Fehler beim Aktualisieren der Channel Nachricht:", error);
    }
}

module.exports = updateChannelText;