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
const generateSettingsText = require("./generateSettingsText");

/**
 * Aktualisiert die Einstellungsnachricht und zeigt weiterhin das Channel-Menü an.
 * @param {import('discord.js').Interaction} interaction Die ursprüngliche Interaktion.
 */
async function updateSettingsMessage(interaction) {
    try {
        // 1. Lade die neuesten Daten aus der DB und der Konfiguration
        const newDbSettings = await ModalService.findOne("settings");
        const settingsConfig = ConfigService.get("settings")[0];
        const channelConfig = settingsConfig.channel;

        // 2. Erstelle den Anzeigebereich mit den aktualisierten Informationen
        const title = new TextDisplayBuilder().setContent("# Channel Einstellungen");
        const settingsContent = generateSettingsText(newDbSettings, channelConfig);
        const text = new TextDisplayBuilder().setContent(settingsContent);
        const separator = new SeparatorBuilder();
        const spacer = new TextDisplayBuilder().setContent('\u200B');

        const container = new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(spacer)
            .addTextDisplayComponents(text);

        // 3. KORREKTUR: Erstelle das Channel-Auswahlmenü erneut
        // Anstatt zum Hauptmenü zurückzukehren, bleiben wir auf der Channel-Ebene.
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("channel-select") // Die ID des Channel-Menüs
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

        // 4. Bearbeite die ursprüngliche Nachricht mit dem aktualisierten Inhalt und dem Menü
        await interaction.message.edit({
            components: [container, actionRow]
        });

    } catch (error) {
        console.error("Fehler beim Aktualisieren der Settings-Nachricht:", error);
    }
}

module.exports = updateSettingsMessage;