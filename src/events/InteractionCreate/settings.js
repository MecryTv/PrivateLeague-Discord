const Event = require("../../structures/Events");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require("discord.js");
const logger = require("../../utils/logger");
const MessageService = require("../../services/MessageService");
const ConfigService = require("../../services/ConfigService");
const ChannelTypes = require("../../enums/ChannelTypes");
const ModalService = require("../../services/ModalService");
const generateChannelText = require("../../utils/settings/generateChannelText");
const generateRoleText = require("../../utils/settings/generateRoleText");
const { handleChannelSelection, handleRoleSelection } = require("../../utils/settings/handleSelections");

class Settings extends Event {
    constructor(client) {
        super(client, "interactionCreate", false);
    }

    async execute(interaction) {
        if (!interaction.isStringSelectMenu() || !["settings-select", "channel-select", "role-select"].includes(interaction.customId)) {
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
                    generateChannelText(settingsData, channelConfig)
                )

                await interaction.editReply({
                    components: [container, actionRow]
                });
            } else if (selectedOption === "role") {
                const roleConfig = config.roles;
                const menuMessages = MessageService.get("settings.roleMenu");

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

                const settingsData = await ModalService.findOne("settings", { guildId: interaction.guild.id });
                const container = this.buildContainer(
                    menuMessages.title,
                    generateRoleText(settingsData, roleConfig)
                );

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
            let placeholder = config.channel.channelMenu.menuPlaceholder;
            if (["ticketsChannelId", "logChannelId", "applicationChannelId"].includes(selectedOption)) {
                channelType = ChannelTypes.Forum;
                placeholder = "Forum auswählen";
            }

            await handleChannelSelection(interaction, {
                customId: `${selectedOption}-select`,
                placeholder,
                channelType,
                replyContent: MessageService.get("settings.channelSelector.replyContent", {channelName: channelDetails.name}),
                successMessage: MessageService.get("settings.channelSelector.successMessage", {channelName: channelDetails.name}),
                errorMessage: MessageService.get("settings.channelSelector.errorMessage", {channelName: channelDetails.name}),
                dbKey: selectedOption
            });
        } else if (interaction.customId === "role-select") {
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
            const roleDetails = config.roles.find(r => r.value === selectedOption);
            if (!roleDetails) {
                return interaction.followUp({content: "Rollen-Einstellung nicht gefunden.", ephemeral: true});
            }

            const menuMessages = MessageService.get("settings.roleMenu");

            await handleRoleSelection(interaction, {
                customId: `${selectedOption}-select`,
                placeholder: menuMessages.menuPlaceholder,
                replyContent: MessageService.get("settings.roleSelector.replyContent", {roleName: roleDetails.name}),
                successMessage: MessageService.get("settings.roleSelector.successMessage", {roleName: roleDetails.name}),
                errorMessage: MessageService.get("settings.roleSelector.errorMessage", {roleName: roleDetails.name}),
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
}

module.exports = Settings;