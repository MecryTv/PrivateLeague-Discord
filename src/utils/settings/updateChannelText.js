const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder, MediaGalleryBuilder
} = require("discord.js");
const ModalService = require("../../services/ModalService");
const ConfigService = require("../../services/ConfigService");
const generateChannelText = require("./generateChannelText");
const logger = require("../../utils/logger");
const MediaService = require("../../services/MediaService");

/**
 * Aktualisiert die Einstellungsnachricht und zeigt weiterhin das Channel-Menü an.
 * @param {import('discord.js').Interaction} interaction Die ursprüngliche Interaktion.
 */
async function updateChannelText(interaction) {
    try {
        const newDbSettings = await ModalService.findOne("settings");
        const settingsConfig = ConfigService.get("settings")[0];
        const channelConfig = settingsConfig.channel;

        const channelAttachment = MediaService.getAttachment('ChannelEIN.png');
        const channelURL = MediaService.getAttachmentURL('ChannelEIN.png');

        const title = new TextDisplayBuilder().setContent("# Channel Einstellungen");
        const settingsContent = generateChannelText(newDbSettings, channelConfig);
        const text = new TextDisplayBuilder().setContent(settingsContent);
        const separator1 = new SeparatorBuilder();
        const separator2 = new SeparatorBuilder();
        const spacer = new TextDisplayBuilder().setContent('\u200B');
        const image = new MediaGalleryBuilder()
            .addItems([
                {
                    media: {
                        url: channelURL,
                    }
                }
            ]);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(spacer)
            .addTextDisplayComponents(text)
            .addSeparatorComponents(separator2)
            .addMediaGalleryComponents(image);

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
            components: [container, actionRow],
            files: [channelAttachment]
        });

    } catch (error) {
        logger.error("Fehler beim Aktualisieren der Channel Nachricht:", error);
    }
}

module.exports = updateChannelText;