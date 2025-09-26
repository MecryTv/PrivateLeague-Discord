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
const MessageService = require("../../services/MessageService");

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
            return interaction.reply({content: MessageService.get("settings..error.configNotFound"), ephemeral: true});
        }
        const config = settingsConfig[0];

        await interaction.deferUpdate();

        if (interaction.customId === "settings-select") {
            const selectedOption = interaction.values[0];

            if (selectedOption === "channel") {
                const channelConfig = config.channel;
                const menuMessages = MessageService.get("settings.channelMenu");

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId("channel-select")
                    .setPlaceholder(menuMessages.menuPlaceholder)
                    .addOptions(
                        channelConfig.map((channel) =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(channel.name)
                                .setValue(channel.value)
                                .setDescription(channel.description)
                        )
                    );
                const actionRow = new ActionRowBuilder().addComponents(selectMenu);

                const settingsData = await ModalService.findOne("settings", { guildId: interaction.guild.id });
                const container = this.buildContainer(
                    menuMessages.title,
                    generateSettingsText(settingsData, channelConfig)
                )

                await interaction.editReply({
                    components: [container, actionRow]
                });
            }
        } else if (interaction.customId === "channel-select") {
            const selectedOption = interaction.values[0];

            if (selectedOption === "main") {
                const pages = config.pages;
                const menuMessages = MessageService.get("settings.mainMenu");

                const title = MessageService.get("settings.mainMenu.title");
                const text = MessageService.get("settings.mainMenu.text");

                if (!title || !text) {
                    return interaction.followUp({
                        content: "Fehler: Hauptmenü-Texte konnten nicht geladen werden.",
                        ephemeral: true
                    });
                }

                const mainMenu = new StringSelectMenuBuilder()
                    .setCustomId("settings-select")
                    .setPlaceholder(menuMessages.menuPlaceholder)
                    .addOptions(
                        pages.map(page =>
                            new StringSelectMenuOptionBuilder()
                                .setLabel(page.name)
                                .setValue(page.value)
                                .setDescription(page.description)
                        )
                    );
                const actionRow = new ActionRowBuilder().addComponents(mainMenu);

                const container = this.buildContainer(title, text);

                await interaction.editReply({
                    components: [container, actionRow]
                });
                return;
            }
            const channelDetails = config.channel.find(c => c.value === selectedOption);
            if (!channelDetails) {
                return interaction.followUp({content: "Kanal-Einstellung nicht gefunden.", ephemeral: true});
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
                replyContent: MessageService.get("settings.channelSelector.replyContent", {channelName: channelDetails.name}),
                successMessage: MessageService.get("settings.channelSelector.successMessage", {channelName: channelDetails.name}),
                errorMessage: MessageService.get("settings.channelSelector.errorMessage", {channelName: channelDetails.name}),
                dbKey: selectedOption
            });
        }
    }

    buildContainer(titleContent, textContent) {
        const title = new TextDisplayBuilder().setContent(titleContent);
        const text = new TextDisplayBuilder().setContent(textContent);
        const separator = new SeparatorBuilder();
        const spacer = new TextDisplayBuilder().setContent('\u200B');

        return new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(spacer)
            .addTextDisplayComponents(text);
    }

    async handleChannelSelection(interaction, {
        customId,
        placeholder,
        channelType,
        replyContent,
        successMessage,
        errorMessage,
        dbKey
    }) {
        const selectMenu = new ChannelSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addChannelTypes([channelType]);
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        const timeoutDuration = 60000;

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
                await ModalService.updateOne(
                    "settings",
                    { guildId: interaction.guild.id },
                    { $set: { [dbKey]: selectedChannelId, guildId: interaction.guild.id } },
                    { upsert: true }
                );

                await updateSettingsMessage(interaction);

                if (successMessage && typeof successMessage === 'string') {
                    await i.editReply({
                        content: successMessage.replace('{channelId}', selectedChannelId),
                        components: []
                    });
                } else {
                    await i.editReply({ content: "Einstellung erfolgreich gesetzt!", components: [] });
                }
            } catch (error) {
                logger.error(`Fehler beim Setzen der Einstellung für ${dbKey}:`, error);
                await i.editReply({content: errorMessage, components: []});
            }
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                await message.edit({ content: "Die Zeit für die Auswahl ist abgelaufen.", components: [] }).catch(() => {});
            }
        });
    }
}

module.exports = Settings;