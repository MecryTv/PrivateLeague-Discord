const Command = require("../../structures/Command");
const { SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ThumbnailBuilder,
    SectionBuilder,
    MessageFlags
} = require("discord.js");
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

    const settings = await ModalService.findOne("settings", {guildId: interaction.guild.id})

      if (settings && settings.supportChannelId && settings.supportPingRoleId) {
            const supportChannel = await interaction.guild.channels.fetch(settings.supportChannelId);
            const supportRole = await interaction.guild.roles.fetch(settings.supportPingRoleId);

            const thumbnail = new ThumbnailBuilder()
                .setURL(user.displayAvatarURL({ dynamic: true}));

            const title = new TextDisplayBuilder().setContent(
                `## Neuer Report von ${interaction.user}`
            );

            const separator = new SeparatorBuilder();

            const text = new TextDisplayBuilder().setContent(
                `**Gemeldeter User:** ${user} (${user.id})\n` +
                `**Grund:** ${grund}\n` +
                `**Reporter:** ${interaction.user} (${interaction.user.id})`
            );

            const section = new SectionBuilder()
                .setThumbnailAccessory(thumbnail)
                .addTextDisplayComponents(text);

          const container = new ContainerBuilder()
                .addTextDisplayComponents(title)
                .addSeparatorComponents(separator)
                .addSectionComponents(section);

          await supportChannel.send({
              content: `${supportRole}`,
          });

          await supportChannel.send({
              flags: [MessageFlags.IsComponentsV2],
              components: [container],
          });

            return await interaction.reply({
                content: `Du hast erfolgreich ${user} reportet`,
                ephemeral: true,
            });
      } else {
          return await interaction.reply({
                content: "Es ist ein Fehler aufgetreten. Bitte kontaktiere denn Support",
                ephemeral: true,
          });
      }
  }
}

module.exports = Report;