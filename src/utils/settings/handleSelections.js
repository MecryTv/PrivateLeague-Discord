const {ChannelSelectMenuBuilder, ActionRowBuilder, RoleSelectMenuBuilder} = require("discord.js");
const ModalService = require("../../services/ModalService");
const updateChannelText = require("./updateChannelText");
const logger = require("../logger");
const updateRoleText = require("./updateRoleText");

async function handleChannelSelection(interaction, {
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
                {guildId: interaction.guild.id},
                {$set: {[dbKey]: selectedChannelId, guildId: interaction.guild.id}},
                {upsert: true}
            );

            await updateChannelText(interaction);

            if (successMessage && typeof successMessage === 'string') {
                await i.editReply({
                    content: successMessage.replace('{channelId}', selectedChannelId),
                    components: []
                });
            } else {
                await i.editReply({content: "Einstellung erfolgreich gesetzt!", components: []});
            }
        } catch (error) {
            logger.error(`Fehler beim Setzen der Einstellung für ${dbKey}:`, error);
            await i.editReply({content: errorMessage, components: []});
        }
    });

    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            await message.edit({content: "Die Zeit für die Auswahl ist abgelaufen.", components: []}).catch(() => {
            });
        }
    });
}

async function handleRoleSelection(interaction, {
    customId,
    placeholder,
    replyContent,
    successMessage,
    errorMessage,
    dbKey
}) {
    const selectMenu = new RoleSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder);
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
            const selectedRoleId = i.values[0];
            await ModalService.updateOne("settings", {guildId: interaction.guild.id}, {
                $set: {
                    [dbKey]: selectedRoleId,
                    guildId: interaction.guild.id
                }
            }, {upsert: true});
            await updateRoleText(interaction);

            if (successMessage && typeof successMessage === 'string') {
                // KORREKTUR: Ersetze {roleId} statt {channelId}
                await i.editReply({
                    content: successMessage.replace('{roleId}', selectedRoleId),
                    components: []
                });
            } else {
                await i.editReply({content: "Einstellung erfolgreich gesetzt!", components: []});
            }
        } catch (error) {
            logger.error(`Fehler beim Setzen der Einstellung für ${dbKey}:`, error);
            await i.editReply({content: errorMessage, components: []});
        }
    });

    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            await message.edit({content: "Die Zeit für die Auswahl ist abgelaufen.", components: []}).catch(() => {
            });
        }
    });
}

module.exports = {
    handleChannelSelection,
    handleRoleSelection
};