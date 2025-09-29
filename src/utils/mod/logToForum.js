const ChannelTypes = require('../../enums/ChannelTypes');
const Guardian = require('../../services/Guardian');
const { MessageFlags } = require('discord.js');

async function logToForum(forumChannel, container, imageFile = null) {
    if (forumChannel.type !== ChannelTypes.Forum) {
        await Guardian.handleGeneric(
            `Der angegebene Kanal (${forumChannel.id}) ist kein Forum-Kanal.`,
            'logToForum'
        );
        return;
    }

    const threadName = "Moderation - Server Log";
    let logThread = null;

    try {
        const threads = await forumChannel.threads.fetch();
        logThread = threads.threads.find(t => t.name === threadName);

        if (!logThread) {
            logThread = await forumChannel.threads.create({
                name: threadName,
                message: {
                    content: `Dieser Thread dient als zentrales Log für alle Moderations-Aktionen.`,
                },
            });
        }

        const messageOptions = {
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        };

        if (imageFile) {
            messageOptions.files = [imageFile];
        }

        await logThread.send(messageOptions);

    } catch (error) {
        await Guardian.handleGeneric(
            `Fehler beim Senden der Log-Nachricht in den Thread im Forum-Kanal (${forumChannel.id}).`,
            'logToForum',
            error.stack
        );
    }
}

module.exports = logToForum;