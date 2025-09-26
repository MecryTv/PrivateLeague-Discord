const Event = require("../../structures/Events");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require("discord.js");
const ConfigService = require("../../services/ConfigService");
const ChannelTypes = require("../../enums/ChannelTypes");
const ModalService = require("../../services/ModalService");
const updateSettingsMessage = require("../../utils/settings/updateSettingsMessage");
const generateSettingsText = require("../../utils/settings/generateSettingsText");
const logger = require("../../utils/logger");

class Settings extends Event {
    constructor(client) {
        super(client, "interactionCreate", false);
    }

    async execute(interaction) {
        if (!interaction.isStringSelectMenu() || !["settings-select", "channel-select"].includes(interaction.customId)) {
            return;
        }

        const settingsConfig = ConfigService.get("settings");
        if (!settingsConfig || !settingsConfig[0]) {
            return interaction.reply({ content: "Konfigurationsdatei 'settings.json' nicht gefunden.", ephemeral: true });
        }
        const config = settingsConfig[0];

        // Bestätige die Interaktion sofort, um "Interaction has failed" zu verhindern.
        await interaction.deferUpdate();

        if (interaction.customId === "settings-select") {
            const selectedOption = interaction.values[0];

            if (selectedOption === "channel") {
                const channelConfig = config.channel;

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId("channel-select")
                    .setPlaceholder("📁 | Wähle eine Kanaleinstellung zum Ändern")
                    .addOptions(
                        channelConfig.map((channel) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(channel.name)
                                .setValue(channel.value)
                                .setDescription(channel.description)
                        )
                    );
                const actionRow = new ActionRowBuilder().addComponents(selectMenu);

                const title = new TextDisplayBuilder().setContent("# Channel Einstellungen");
                const settingsData = await ModalService.findOne("settings");
                const settingsContent = generateSettingsText(settingsData, channelConfig);
                const text = new TextDisplayBuilder().setContent(settingsContent);
                const separator = new SeparatorBuilder();
                const spacer = new TextDisplayBuilder().setContent('\u200B');

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(title)
                    .addSeparatorComponents(separator)
                    .addTextDisplayComponents(spacer)
                    .addTextDisplayComponents(text);

                await interaction.editReply({
                    components: [container, actionRow]
                });
            }
        } else if (interaction.customId === "channel-select") {
            const selectedOption = interaction.values[0];

            if (selectedOption === "main") {
                const pages = config.pages;

                const mainMenu = new StringSelectMenuBuilder()
                    .setCustomId("settings-select")
                    .setPlaceholder("📜 | Wähle eine Kategorie")
                    .addOptions(
                        pages.map(page =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(page.name)
                                .setValue(page.value)
                                .setDescription(page.description)
                        )
                    );
                const actionRow = new ActionRowBuilder().addComponents(mainMenu);

                // --- KORREKTUR HIER ---
                // Setze den Titel und den Text auf den Standardwert des Hauptmenüs zurück.
                const title = new TextDisplayBuilder().setContent("# Bot Einstellungen");
                const text = new TextDisplayBuilder().setContent("Wähle eine Kategorie aus, um die entsprechenden Einstellungen anzuzeigen und zu bearbeiten.");
                // --- ENDE DER KORREKTUR ---

                const separator = new SeparatorBuilder();
                const spacer = new TextDisplayBuilder().setContent('\u200B');

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(title)
                    .addSeparatorComponents(separator)
                    .addTextDisplayComponents(spacer)
                    .addTextDisplayComponents(text);

                await interaction.editReply({
                    components: [container, actionRow]
                });
                return;
            }
            const channelDetails = config.channel.find(c => c.value === selectedOption);
            if (!channelDetails) {
                return interaction.followUp({ content: "Kanal-Einstellung nicht gefunden.", ephemeral: true });
            }

            let channelType = ChannelTypes.Text;
            let placeholder = "Kanal auswählen";
            if (["ticketsChannelId", "logChannelId", "applicationChannelId"].includes(selectedOption)) {
                channelType = ChannelTypes.Forum;
                placeholder = "Forum auswählen";
            }

            await this.handleChannelSelection(interaction, {
                customId: `${selectedOption}-select`,
                placeholder,
                channelType,
                replyContent: `Wähle den Kanal für **${channelDetails.name}**.`,
                successMessage: `Der Kanal für **${channelDetails.name}** wurde auf <#\${selectedChannelId}> gesetzt.`,
                errorMessage: `Fehler beim Setzen des Kanals für **${channelDetails.name}**.`,
                dbKey: selectedOption
            });
        }
    }

    async handleChannelSelection(interaction, { customId, placeholder, channelType, replyContent, successMessage, errorMessage, dbKey }) {
        const selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addChannelTypes([channelType]);
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        const timeoutDuration = 60000;

        // Nutze followUp, um eine neue, unsichtbare Nachricht zu senden.
        // Das ist der korrekte Weg, nachdem die Hauptinteraktion bereits bestätigt wurde.
        const message = await interaction.followUp({
            content: replyContent,
            components: [actionRow],
            ephemeral: true,
        });

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: timeoutDuration
        });

        collector.on('collect', async i => {
            try {
                await i.deferUpdate();
                const selectedChannelId = i.values[0];
                await ModalService.updateOne("settings", {}, { $set: { [dbKey]: selectedChannelId } }, { upsert: true });

                // Übergib die ursprüngliche Interaktion, deren Nachricht wir bearbeiten wollen
                await updateSettingsMessage(interaction);

                // Bearbeite die followUp-Nachricht, um dem User Feedback zu geben
                await i.editReply({
                    content: successMessage.replace('\${selectedChannelId}', selectedChannelId),
                    components: []
                });
            } catch (error) {
                logger.error(`Fehler beim Setzen der Einstellung für ${dbKey}:`, error);
                await i.editReply({ content: errorMessage, components: [] });
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                // Bearbeite die followUp-Nachricht, um sie zu deaktivieren
                await interaction.editReply({ content: "Die Zeit für die Auswahl ist abgelaufen.", components: [] }).catch(() => {});
            }
        });
    }
}

module.exports = Settings;