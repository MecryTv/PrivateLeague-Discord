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
const MessageService = require("../../services/MessageService"); // Hinzufügen
const generateRoleText = require("./generateRoleText");
const logger = require("../../utils/logger");

async function updateRoleText(interaction) {
    try {
        const newDBSettings = await ModalService.findOne("settings", { guildId: interaction.guild.id });
        const settingsConfig = ConfigService.get("settings")[0];
        const roleConfig = settingsConfig.roles;

        const menuMessages = MessageService.get("settings.roleMenu");
        const title = new TextDisplayBuilder().setContent(menuMessages.title);
        const settingsContent = generateRoleText(newDBSettings, roleConfig);
        const text = new TextDisplayBuilder().setContent(settingsContent);
        const separator = new SeparatorBuilder();
        const spacer = new TextDisplayBuilder().setContent('\u200B');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(spacer)
            .addTextDisplayComponents(text);

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
            components: [container, actionRow]
        });
    } catch (error) {
        logger.error("Fehler beim Aktualisieren der Role Nachricht:", error);
    }
}

module.exports = updateRoleText;