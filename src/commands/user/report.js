const Command = require("../../structures/Command");
const { SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ThumbnailBuilder,
    SectionBuilder,
    MessageFlags,
    MediaGalleryBuilder
} = require("discord.js");
const ModalService = require("../../services/ModalService");
const MediaService = require("../../services/MediaService");
const Guardian = require("../../services/Guardian");

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

            const reportAttachment = await MediaService.getAttachment("mod/Report.png");
            const reportURL = await MediaService.getAttachmentURL("mod/Report.png");

            if (!reportAttachment || !reportURL) {
                return await Guardian.handleCommand("Die Report-Bilddatei 'mod/Report.png' konnte im MediaService nicht gefunden werden.", interaction)
            }

            const thumbnail = new ThumbnailBuilder()
                .setURL(user.displayAvatarURL({ dynamic: true}));

            const title = new TextDisplayBuilder().setContent(
                `## Neuer Report von ${interaction.user}`
            );

            const separator1 = new SeparatorBuilder();
            const separator2 = new SeparatorBuilder();

            const text = new TextDisplayBuilder().setContent(
                `**Gemeldeter User:** ${user} (${user.id})\n` +
                `**Grund:** ${grund}\n` +
                `**Reporter:** ${interaction.user} (${interaction.user.id})`
            );

            const image = new MediaGalleryBuilder()
                .addItems([
                    {
                        media: {
                            url: reportURL,
                        }
                    }
                ])

            const section = new SectionBuilder()
                .setThumbnailAccessory(thumbnail)
                .addTextDisplayComponents(text);

          const container = new ContainerBuilder()
                .addTextDisplayComponents(title)
                .addSeparatorComponents(separator1)
                .addSectionComponents(section)
                .addSeparatorComponents(separator2)
                .addMediaGalleryComponents(image);

          await supportChannel.send({
              content: `${supportRole}`,
          });

          await supportChannel.send({
              flags: [MessageFlags.IsComponentsV2],
              components: [container],
              files: [reportAttachment],
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