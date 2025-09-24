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

class Settings extends Event {
    constructor(client) {
        super(client, "interactionCreate", false);
    }

    async execute(interaction) {
        if (interaction.customId === "settings-select") {
            const selectedOption = interaction.values[0];

            if (selectedOption === "welcomeChannelId") {
                const welcomeChannelSelect = new ChannelSelectMenuBuilder()
                    .setCustomId("welcomeChannel-select")
                    .setPlaceholder("Kanal auswählen")
                    .setMinValues(1)
                    .setMaxValues(1)
                    .addChannelTypes([ChannelTypes.Text]);

                const welcomeRow = new ActionRowBuilder().addComponents(welcomeChannelSelect);

                const timeoutDuration = 10000;
                const expiryTimestamp = Math.floor((Date.now() + timeoutDuration) / 1000);

                const message = await interaction.reply({
                    content: `Wähle den Willkommenskanal aus. Die Auswahl schließt sich ${`<t:${expiryTimestamp}:R>`}`,
                    components: [welcomeRow],
                    ephemeral: true,
                    fetchReply: true
                });

                const collector = message.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: timeoutDuration
                });

                collector.on('collect', async i => {
                    if (i.customId === 'welcomeChannel-select') {
                        try {
                            await i.deferUpdate();

                            const selectedChannelId = i.values[0];

                            await ModalService.updateOne("settings", {}, {$set: {welcomeChannelId: selectedChannelId}}, {upsert: true});

                            await updateSettingsMessage(interaction);

                            await i.editReply({
                                content: `Der Willkommenskanal wurde erfolgreich auf <#${selectedChannelId}> gesetzt.`,
                                components: []
                            });
                        } catch (error) {
                            console.error("Fehler beim Setzen des Willkommenskanals:", error);
                            await i.editReply({
                                content: "Es gab einen Fehler beim Setzen des Willkommenskanals. Bitte versuche es erneut.",
                                components: []
                            });
                        }
                    }
                });

                collector.on('end', collected => {
                    if (collected.size === 0) {
                        const disabledSelect = new ChannelSelectMenuBuilder()
                            .setCustomId("welcomeChannel-select")
                            .setPlaceholder("Zeit abgelaufen")
                            .setDisabled(true)
                            .addChannelTypes([ChannelTypes.Text]);

                        const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);

                        interaction.editReply({
                            content: "Die Zeit für die Auswahl ist abgelaufen.",
                            components: [disabledRow]
                        });
                    }
                });

            } else if (selectedOption === "ticketsChannelId") {

            } else if (selectedOption === "logChannelId") {

            } else if (selectedOption === "applicationChannelId") {

            }

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
}

module.exports = Settings;