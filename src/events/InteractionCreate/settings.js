const Event = require("../../structures/Events");
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder
} = require("discord.js");
const logger = require("../../utils/logger");
const MessageService = require("../../services/MessageService");
const ConfigService = require("../../services/ConfigService");
const ChannelTypes = require("../../enums/ChannelTypes");
const ModalService = require("../../services/ModalService");
const MediaService = require("../../services/MediaService");
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

                const channelAttachment = MediaService.getAttachment('ChannelEIN.png');
                const channelURL = MediaService.getAttachmentURL('ChannelEIN.png');

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
                    generateChannelText(settingsData, channelConfig),
                    channelURL
                )

                await interaction.editReply({
                    components: [container, actionRow],
                    files: [channelAttachment],
                });
            } else if (selectedOption === "role") {
                const roleConfig = config.roles;
                const menuMessages = MessageService.get("settings.roleMenu");

                const roleAttachment = MediaService.getAttachment('RollenEIN.png');
                const roleURL = MediaService.getAttachmentURL('RollenEIN.png');

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
                    generateRoleText(settingsData, roleConfig),
                    roleURL
                );

                await interaction.editReply({
                    components: [container, actionRow],
                    files: [roleAttachment],
                });
            }
        } else if (interaction.customId === "channel-select") {
            const selectedOption = interaction.values[0];

            if (selectedOption === "main") {
                const pages = config.pages;
                const menuMessages = MessageService.get("settings.mainMenu");

                const title = MessageService.get("settings.mainMenu.title");
                const text = MessageService.get("settings.mainMenu.text");
                
                const settingsAttachment = MediaService.getAttachment('Einstellung.png');
                const settingsURL = MediaService.getAttachmentURL('Einstellung.png');

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

                const container = this.buildContainer(title, text, settingsURL);

                await interaction.editReply({
                    components: [container, actionRow],
                    files: [settingsAttachment]
                });
                return;
            }
            const channelDetails = config.channel.find(c => c.value === selectedOption);
            if (!channelDetails) {
                return interaction.followUp({content: "Kanal-Einstellung nicht gefunden.", ephemeral: true});
            }

            let channelType = ChannelTypes.Text;
            let placeholder = MessageService.get("settings.channelMenu.menuPlaceholder");
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

                const settingsAttachment = MediaService.getAttachment('Einstellung.png');
                const settingsURL = MediaService.getAttachmentURL('Einstellung.png');

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

                const container = this.buildContainer(title, text, settingsURL);

                await interaction.editReply({
                    components: [container, actionRow],
                    files: [settingsAttachment]
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

    buildContainer(titleContent, textContent, imageURL) {
        const title = new TextDisplayBuilder().setContent(titleContent);
        const text = new TextDisplayBuilder().setContent(textContent);
        const separator1 = new SeparatorBuilder();
        const separator2 = new SeparatorBuilder();
        const spacer = new TextDisplayBuilder().setContent('\u200B');
        const image = new MediaGalleryBuilder()
            .addItems([
                {
                    media: {
                        url: imageURL,
                    }
                }
            ]);

        return new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(spacer)
            .addTextDisplayComponents(text)
            .addSeparatorComponents(separator2)
            .addMediaGalleryComponents(image);
    }
}

module.exports = Settings;