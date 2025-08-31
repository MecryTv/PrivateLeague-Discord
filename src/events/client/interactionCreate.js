const Event = require('../../structures/Events.js');

module.exports = class InteractionCreate extends Event {
    constructor(client) {
        super(client, 'interactionCreate', false);
    }

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = this.client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'Es gab einen Fehler beim Ausführen dieses Commands!',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'Es gab einen Fehler beim Ausführen dieses Commands!',
                    ephemeral: true
                });
            }
        }
    }
};
