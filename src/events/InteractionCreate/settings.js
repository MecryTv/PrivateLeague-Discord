const Event = require("../../structures/Events");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder
} = require("discord.js");
const ConfigService = require("../../services/ConfigService");
const ChannelTypes = require("../../enums/ChannelTypes");
const ModalService = require("../../services/ModalService");
const updateSettingsMessage = require("../../utils/settings/updateSettingsMessage");
const logger = require("../../utils/logger");

class Settings extends Event {
    constructor(client) {
        super(client, "interactionCreate", false);
    }

    async execute(interaction) {
        if (interaction.customId === "settings-select") {
            const selectedOption = interaction.values[0];

            const channelConfig = ConfigService.get("channels").find(c => c.value === selectedOption);
            if (!channelConfig) {
                return interaction.reply({
                    content: "Kanal-Einstellung nicht gefunden.",
                    ephemeral: true
                });
            }

            let channelType = ChannelTypes.Text;
            let placeholder = "Kanal auswählen";
            let replyContent = "Wähle den Willkommenskanal aus.";
            let successMessage = "Der Willkommenskanal wurde erfolgreich auf <#${selectedChannelId}> gesetzt.";
            let errorMessage = "Es gab einen Fehler beim Setzen des Willkommenskanals. Bitte versuche es erneut.";
            let customId = selectedOption;

            if (selectedOption === "ticketsChannelId") {
                channelType = ChannelTypes.Forum;
                placeholder = "Forum auswählen";
                replyContent = "Wähle das Ticket-Forum aus.";
                successMessage = "Das Ticket-Forum wurde erfolgreich auf <#${selectedChannelId}> gesetzt.";
                errorMessage = "Es gab einen Fehler beim Setzen des Ticket-Forums. Bitte versuche es erneut.";
            } else if (selectedOption === "logChannelId") {
                channelType = ChannelTypes.Forum;
                placeholder = "Forum auswählen";
                replyContent = "Wähle das Log-Forum aus.";
                successMessage = "Das Log-Forum wurde erfolgreich auf <#${selectedChannelId}> gesetzt.";
                errorMessage = "Es gab einen Fehler beim Setzen des Log-Forums. Bitte versuche es erneut.";
            } else if (selectedOption === "applicationChannelId") {
                channelType = ChannelTypes.Forum;
                placeholder = "Forum auswählen";
                replyContent = "Wähle das Bewerbungs-Forum aus.";
                successMessage = "Das Bewerbungs-Forum wurde erfolgreich auf <#${selectedChannelId}> gesetzt.";
                errorMessage = "Es gab einen Fehler beim Setzen des Bewerbungs-Forums. Bitte versuche es erneut.";
            } else if (selectedOption === "supportChannelId"){
                channelType = ChannelTypes.Text;
                placeholder = "Kanal auswählen";
                replyContent = "Wähle den Support-Kanal aus.";
                successMessage = "Der Support-Kanal wurde erfolgreich auf <#${selectedChannelId}> gesetzt.";
                errorMessage = "Es gab einen Fehler beim Setzen des Support-Kanals. Bitte versuche es erneut.";
            }

            customId = `${selectedOption}-select`;

            await this.handleChannelSelection(interaction, {
                customId,
                placeholder,
                channelType,
                replyContent,
                successMessage,
                errorMessage,
                dbKey: selectedOption
            });

            this.resetSelectMenu(interaction);
        }
    }

    /**
     * Allgemeine Methode zur Handhabung der Kanal-Auswahl und des Collectors.
     * @param {Interaction} interaction - Die Discord-Interaktion.
     * @param {object} options - Optionen für die Konfiguration.
     * @param {string} options.customId - Die benutzerdefinierte ID für das Auswahlmenü.
     * @param {string} options.placeholder - Der Platzhaltertext.
     * @param {number} options.channelType - Der Discord-Kanaltyp.
     * @param {string} options.replyContent - Der Antwortinhalt.
     * @param {string} options.successMessage - Die Erfolgsmeldung.
     * @param {string} options.errorMessage - Die Fehlermeldung.
     * @param {string} options.dbKey - Der Schlüssel für das Datenbankupdate.
     */
    async handleChannelSelection(interaction, { customId, placeholder, channelType, replyContent, successMessage, errorMessage, dbKey }) {
        const selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .setMinValues(1)
            .setMaxValues(1)
            .addChannelTypes([channelType]);

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        const timeoutDuration = 10000;
        const expiryTimestamp = Math.floor((Date.now() + timeoutDuration) / 1000);

        const message = await interaction.reply({
            content: `${replyContent} Die Auswahl schließt sich ${`<t:${expiryTimestamp}:R>`}`,
            components: [actionRow],
            ephemeral: true,
            fetchReply: true
        });

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: timeoutDuration
        });

        collector.on('collect', async i => {
            if (i.customId === customId) {
                try {
                    await i.deferUpdate();
                    const selectedChannelId = i.values[0];

                    await ModalService.updateOne("settings", {}, { $set: { [dbKey]: selectedChannelId } }, { upsert: true });
                    await updateSettingsMessage(interaction);

                    await i.editReply({
                        content: successMessage.replace('${selectedChannelId}', selectedChannelId),
                        components: []
                    });
                } catch (error) {
                    logger.error(`Fehler beim Setzen der Einstellung für ${dbKey}:`, error);
                    await i.editReply({
                        content: errorMessage,
                        components: []
                    });
                }
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const disabledSelect = new ChannelSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder("Zeit abgelaufen")
                    .setDisabled(true)
                    .addChannelTypes([channelType]);

                const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);
                interaction.editReply({
                    content: "Die Zeit für die Auswahl ist abgelaufen.",
                    components: [disabledRow]
                });
            }
        });
    }

    /**
     * Aktualisiert das Haupt-Select-Menü, um es zurückzusetzen.
     * @param {Interaction} interaction - Die Discord-Interaktion.
     */
    async resetSelectMenu(interaction) {
        const channelConfig = ConfigService.get("channels");

        if (channelConfig) {
            const resetSelectMenu = new StringSelectMenuBuilder()
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

            const actionRow = new ActionRowBuilder().addComponents(resetSelectMenu);
            const currentComponents = interaction.message.components;
            const updatedComponents = [...currentComponents];
            updatedComponents[updatedComponents.length - 1] = actionRow;

            await interaction.message.edit({
                components: updatedComponents
            });
        }
    }
}

module.exports = Settings;