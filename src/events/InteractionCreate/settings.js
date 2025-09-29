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
const MessageService = require("../../services/MessageService");
const ConfigService = require("../../services/ConfigService");
const ChannelTypes = require("../../enums/ChannelTypes");
const ModalService = require("../../services/ModalService");
const MediaService = require("../../services/MediaService");
const generateChannelText = require("../../utils/settings/generateChannelText");
const generateRoleText = require("../../utils/settings/generateRoleText");
const { handleChannelSelection, handleRoleSelection } = require("../../utils/settings/handleSelections");
const Guardian = require("../../services/Guardian");

class Settings extends Event {
    constructor(client) {
        super(client, "interactionCreate", false);
    }

    async execute(interaction) {
        if (!interaction.isStringSelectMenu() || !["settings-select", "channel-select", "role-select"].includes(interaction.customId)) {
            return;
        }

        try {
            const settingsConfig = ConfigService.get("settings");
            if (!settingsConfig || !settingsConfig[0]) {
                return Guardian.handle("Die Konfigurationsdatei 'settings.json' konnte nicht gefunden oder geladen werden.", interaction);
            }
            const config = settingsConfig[0];

            await interaction.deferUpdate();

            if (interaction.customId === "settings-select") {
                const selectedOption = interaction.values[0];

                if (selectedOption === "channel") {
                    await this.showChannelMenu(interaction, config);
                } else if (selectedOption === "role") {
                    await this.showRoleMenu(interaction, config);
                }
            }
            else if (interaction.customId === "channel-select") {
                const selectedOption = interaction.values[0];
                if (selectedOption === "main") {
                    await this.showMainMenu(interaction, config);
                } else {
                    await this.handleChannelSubmenu(interaction, config, selectedOption);
                }
            }
            else if (interaction.customId === "role-select") {
                const selectedOption = interaction.values[0];
                if (selectedOption === "main") {
                    await this.showMainMenu(interaction, config);
                } else {
                    await this.handleRoleSubmenu(interaction, config, selectedOption);
                }
            }
        } catch (error) {
            await Guardian.report(error, interaction, 'Settings Component Interaction');
        }
    }

    async showMainMenu(interaction, config) {
        const pages = config.pages;
        const menuMessages = MessageService.get("settings.mainMenu");
        const settingsAttachment = MediaService.getAttachment('Einstellung.png');
        const settingsURL = MediaService.getAttachmentURL('Einstellung.png');

        if (!menuMessages.title || !menuMessages.text || !settingsAttachment) {
            return Guardian.handle("Medien oder Texte für das Hauptmenü konnten nicht geladen werden.", interaction);
        }

        const mainMenu = new StringSelectMenuBuilder()
            .setCustomId("settings-select")
            .setPlaceholder(menuMessages.menuPlaceholder)
            .addOptions(pages.map(page =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(page.name)
                    .setValue(page.value)
                    .setDescription(page.description)
            ));
        const actionRow = new ActionRowBuilder().addComponents(mainMenu);

        const textContent = Array.isArray(menuMessages.text) ? menuMessages.text.join('\n') : menuMessages.text;
        const container = this.buildContainer(menuMessages.title, textContent, settingsURL);

        await interaction.editReply({ components: [container, actionRow], files: [settingsAttachment] });
    }

    async showChannelMenu(interaction, config) {
        const channelConfig = config.channel;
        const menuMessages = MessageService.get("settings.channelMenu");
        const channelAttachment = MediaService.getAttachment('ChannelEIN.png');
        const channelURL = MediaService.getAttachmentURL('ChannelEIN.png');

        if (!channelConfig || !menuMessages || !channelAttachment) {
            return Guardian.handle("Medien oder Texte für das Channel-Menü konnten nicht geladen werden.", interaction);
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("channel-select")
            .setPlaceholder(menuMessages.menuPlaceholder)
            .addOptions(channelConfig.map(channel => new StringSelectMenuOptionBuilder().setLabel(channel.name).setValue(channel.value).setDescription(channel.description)));
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        const settingsData = await ModalService.findOne("settings", { guildId: interaction.guild.id });
        const container = this.buildContainer(menuMessages.title, generateChannelText(settingsData, channelConfig), channelURL);

        await interaction.editReply({ components: [container, actionRow], files: [channelAttachment] });
    }

    async showRoleMenu(interaction, config) {
        const roleConfig = config.roles;
        const menuMessages = MessageService.get("settings.roleMenu");
        const roleAttachment = MediaService.getAttachment('RollenEIN.png');
        const roleURL = MediaService.getAttachmentURL('RollenEIN.png');

        if (!roleConfig || !menuMessages || !roleAttachment) {
            return Guardian.handle("Medien oder Texte für das Rollen-Menü konnten nicht geladen werden.", interaction);
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("role-select")
            .setPlaceholder(menuMessages.menuPlaceholder)
            .addOptions(roleConfig.map(role => new StringSelectMenuOptionBuilder().setLabel(role.name).setValue(role.value).setDescription(role.description)));
        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
        const settingsData = await ModalService.findOne("settings", { guildId: interaction.guild.id });
        const container = this.buildContainer(menuMessages.title, generateRoleText(settingsData, roleConfig), roleURL);

        await interaction.editReply({ components: [container, actionRow], files: [roleAttachment] });
    }

    async handleChannelSubmenu(interaction, config, selectedOption) {
        const channelDetails = config.channel.find(c => c.value === selectedOption);
        if (!channelDetails) {
            return Guardian.handle(`Die Channel-Einstellung '${selectedOption}' wurde in der Konfiguration nicht gefunden.`, interaction);
        }

        let channelType = ChannelTypes.Text;
        if (["ticketsChannelId", "logChannelId", "applicationChannelId"].includes(selectedOption)) {
            channelType = ChannelTypes.Forum;
        }

        await handleChannelSelection(interaction, {
            customId: `${selectedOption}-select`,
            placeholder: "Kanal auswählen...",
            channelType,
            replyContent: MessageService.get("settings.channelSelector.replyContent", { channelName: channelDetails.name }),
            successMessage: MessageService.get("settings.channelSelector.successMessage", { channelName: channelDetails.name }),
            errorMessage: MessageService.get("settings.channelSelector.errorMessage", { channelName: channelDetails.name }),
            dbKey: selectedOption
        });
    }

    async handleRoleSubmenu(interaction, config, selectedOption) {
        const roleDetails = config.roles.find(r => r.value === selectedOption);
        if (!roleDetails) {
            return Guardian.handle(`Die Rollen-Einstellung '${selectedOption}' wurde in der Konfiguration nicht gefunden.`, interaction);
        }

        await handleRoleSelection(interaction, {
            customId: `${selectedOption}-select`,
            placeholder: "Rolle auswählen...",
            replyContent: MessageService.get("settings.roleSelector.replyContent", { roleName: roleDetails.name }),
            successMessage: MessageService.get("settings.roleSelector.successMessage", { roleName: roleDetails.name }),
            errorMessage: MessageService.get("settings.roleSelector.errorMessage", { roleName: roleDetails.name }),
            dbKey: selectedOption
        });
    }

    buildContainer(titleContent, textContent, imageURL) {
        const title = new TextDisplayBuilder().setContent(titleContent);
        const text = new TextDisplayBuilder().setContent(textContent);
        const separator1 = new SeparatorBuilder();
        const separator2 = new SeparatorBuilder();
        const spacer = new TextDisplayBuilder().setContent('\u200B');
        const image = new MediaGalleryBuilder().addItems([{ media: { url: imageURL } }]);

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