const Command = require("../../structures/Command");
const { SlashCommandBuilder } = require("discord.js");
const ModalService = require("../../services/ModalService");

class Report extends Command {
  constructor() {
    super({
      name: "report",
      description: "Reporte einen User",
    });

    this.data = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
        .addUserOption(option => option
            .setName("user")
            .setDescription("Der User den du reporten möchtest" )
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("grund")
            .setDescription("Der Grund für den Report")
            .setRequired(true)
        );
  }

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const grund = interaction.options.getString("grund");

    if (user.bot){
        return await interaction.reply({
            content: "Du kannst keinen Bot reporten",
            ephemeral: true,
        });
    }

    const settings = await ModalService.findOne("settings", {})

      if (settings && settings.supportChannelId) {
            const supportChannel = await interaction.guild.channels.fetch(settings.supportChannelId);

            await supportChannel.send("Ein neuer Report wurde erstellt");
      } else {
          return await interaction.reply({
                content: "Es ist ein Fehler aufgetreten. Bitte kontaktiere denn Support",
                ephemeral: true,
          });
      }
  }
}

module.exports = Report;