const Event = require("../../structures/Events");
const ModalService = require('../../services/ModalService');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    ThumbnailBuilder,
    SectionBuilder
} = require('discord.js');
const formatDuration = require('../../utils/mod/formatDuration');
const MediaService = require('../../services/MediaService');
const Guardian = require("../../services/Guardian");

class showBans extends Event {
  constructor(client) {
    super(client, "interactionCreate", false);
  }

  async execute(interaction) {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'ban_history_select') {
            return;
        }

        const selectedUserId = interaction.values[0];

        try {
            const userBans = await ModalService.find("ban", {
                guildId: interaction.guild.id,
                userId: selectedUserId
            });

            const user = await this.client.users.fetch(selectedUserId);

            const title = `## 📜 Ban-Verlauf für ${user.tag}`;
            let content = '';

            if (userBans.length === 0) {
                content = "Für diesen User wurden keine Einträge gefunden.";
            } else {
                for (const ban of userBans) {
                    const moderator = await this.client.users.fetch(ban.moderatorId).catch(() => ({ tag: 'Unbekannt' }));
                    const durationText = ban.duration ? formatDuration(ban.duration) : 'Permanent';
                    const status = ban.active ? '🔴 Aktiv' : '🟢 Inaktiv';

                    content += `**Fall-ID:** \`#${ban.caseId}\`\n`;
                    content += `**Typ:** ${ban.banType}\n`;
                    content += `**Moderator:** ${moderator.tag}\n`;
                    content += `**Dauer:** ${durationText}\n`;
                    content += `**Datum:** <t:${Math.floor(ban.createdAt.getTime() / 1000)}:f>\n`;
                    content += `**Status:** ${status}\n`;
                    content += `**Grund:** ${ban.reason}\n`;
                    content += '────────────────────────\n';
                }
            }

            const separator1 = new SeparatorBuilder();
            const separator2 = new SeparatorBuilder();

            const banLisAttachment = MediaService.getAttachment('mod/BanVerlauf.png');
            const banListImageURL = MediaService.getAttachmentURL('mod/BanVerlauf.png');

            if (!banLisAttachment || !banListImageURL) {
                await Guardian.handleGeneric('Medien für die Ban-Verlauf Anzeige konnten nicht geladen werden.', 'showBans');
                return interaction.reply({ content: 'Ein interner Fehler ist aufgetreten (fehlende Medien).', ephemeral: true });
            }

            const thumbnail = new ThumbnailBuilder()
                .setURL(user.displayAvatarURL({ extension: 'png', size: 256 }));

            const section = new SectionBuilder()
                .setThumbnailAccessory(thumbnail)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
                .addSeparatorComponents(separator1)
                .addSectionComponents(section)
                .addSeparatorComponents(separator2)
                .addMediaGalleryComponents(new MediaGalleryBuilder().addItems([{media: {url: banListImageURL}}]));

            await interaction.update({
                components: [container],
                files: [banLisAttachment],
            });


        } catch (error) {
            console.error(error);
            await interaction.update({ content: 'Ein Fehler ist beim Abrufen des Ban-Verlaufs aufgetreten.', components: [] });
        }
    }
}

module.exports = showBans;