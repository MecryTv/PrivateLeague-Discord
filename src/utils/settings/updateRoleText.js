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
const MessageService = require("../../services/MessageService"); // Hinzufügen
const generateRoleText = require("./generateRoleText");
const logger = require("../../utils/logger");
const MediaService = require("../../services/MediaService");

/**
 * Aktualisiert die Einstellungsnachricht und zeigt weiterhin das Channel-Menü an.
 * @param {import('discord.js').Interaction} interaction Die ursprüngliche Interaktion.
 */
async function updateRoleText(interaction) {
    try {
        const newDBSettings = await ModalService.findOne("settings", { guildId: interaction.guild.id });
        const settingsConfig = ConfigService.get("settings")[0];
        const roleConfig = settingsConfig.roles;

        const roleAttachment = MediaService.getAttachment('RollenEIN.png');
        const roleURL = MediaService.getAttachmentURL('RollenEIN.png');

        const menuMessages = MessageService.get("settings.roleMenu");
        const title = new TextDisplayBuilder().setContent(menuMessages.title);
        const settingsContent = generateRoleText(newDBSettings, roleConfig);
        const text = new TextDisplayBuilder().setContent(settingsContent);
        const separator1 = new SeparatorBuilder();
        const separator2 = new SeparatorBuilder();
        const spacer = new TextDisplayBuilder().setContent('\u200B');
        const image = new MediaGalleryBuilder()
            .addItems([
                {
                    media: {
                        url: roleURL,
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
            .setCustomId("role-select")
            .setPlaceholder(menuMessages.menuPlaceholder)
            .addOptions(
                roleConfig.map((role) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(role.name)
                        .setValue(role.value)
                        .setDescription(role.description)
                )
            );
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.message.edit({
            components: [container, actionRow],
            files: [roleAttachment]
        });
    } catch (error) {
        logger.error("Fehler beim Aktualisieren der Role Nachricht:", error);
    }
}

module.exports = updateRoleText;