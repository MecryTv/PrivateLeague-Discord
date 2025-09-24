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
const generateSettingsText = require("../../utils/settings/generateSettingsText");

/**
 * Holt die neuesten Einstellungen und aktualisiert die ursprüngliche Settings-Nachricht.
 * @param {import('discord.js').Interaction} interaction Die ursprüngliche Interaktion vom 'settings-select' Menü.
 */
async function updateSettingsMessage(interaction) {
    try {
        const newSettings = await ModalService.findOne("settings");
        const channelConfig = ConfigService.get("channels");

        const title = new TextDisplayBuilder().setContent("# Bot Einstellungen");

        const settingsContent = generateSettingsText(newSettings);
        const text = new TextDisplayBuilder().setContent(settingsContent);

        const separator = new SeparatorBuilder();

        const spacer = new TextDisplayBuilder().setContent('\u200B');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(spacer)
            .addTextDisplayComponents(text);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("settings-select")
            .setPlaceholder("📜 | Einstellung")
            .setMinValues(1)
            .setMaxValues(1)
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
        console.error("Fehler beim Aktualisieren der Settings-Nachricht:", error);
        await interaction.followUp({ content: "Die Einstellungs-Nachricht konnte nicht aktualisiert werden.", ephemeral: true }).catch(() => {});
    }
}

module.exports = updateSettingsMessage;