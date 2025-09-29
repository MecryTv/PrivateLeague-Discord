const Guardian = require('./Guardian');
const ModalService = require('./ModalService');
const logger = require('../utils/logger');
const logToForum = require('../utils/mod/logToForum');
const ChannelTypes = require('../enums/ChannelTypes');
const formatDuration = require('../utils/mod/formatDuration');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    ThumbnailBuilder,
    SectionBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags
} = require("discord.js");
const formatTimestamp = require('../utils/formatTimestamp');
const MediaService = require('./MediaService');

class ModerationService {
    constructor(client) {
        this.client = client;
        this._startTempBanCheck();
    }

    _startTempBanCheck() {
        setInterval(async () => {
            const bans = await ModalService.find("ban", {
                banType: 'temp',
                active: true,
                expiresAt: {$lte: new Date()}
            });

            for (const ban of bans) {
                try {
                    const guild = await this.client.guilds.fetch(ban.guildId);
                    if (!guild) {
                        await ModalService.deleteOne("ban", {_id: ban._id});
                        continue;
                    }

                    await guild.bans.remove(ban.userId, `Temporärer Bann abgelaufen | Fall-ID: #${ban.caseId}`);
                    logger.info(`[ModerationService] User ${ban.userId} von Server ${guild.name} wurde automatisch entbannt`);

                    const settings = await ModalService.findOne("settings", {guildId: ban.guildId});
                    if (settings && settings.logChannelId) {
                        const modLogChannel = await guild.channels.fetch(settings.logChannelId).catch(() => null);
                        if (modLogChannel && modLogChannel.type === ChannelTypes.Forum) {
                            const user = await this.client.users.fetch(ban.userId).catch(() => null);
                            if (!user) {
                                await Guardian.handleGeneric(`User mit der ID ${ban.userId} konnte nicht gefunden werden.`, 'TempBanCheck');
                                return;
                            }

                            const unbanAttachment = MediaService.getAttachment('mod/Unban.png');
                            const unbanImageURL = MediaService.getAttachmentURL('mod/Unban.png');

                            if (!unbanAttachment || !unbanImageURL) {
                                await Guardian.handleGeneric('Medien für den Unban-Log konnten nicht geladen werden.', 'TempBanCheck');
                                return;
                            }

                            const timestamp = formatTimestamp();
                            const title = `## [${timestamp}] | ACTION: AUTO-UNBAN`;
                            const contentLines = [
                                `**User:** <@${ban.userId}> | \`${ban.userId}\``,
                                `**Grund:** Temporärer Bann ist abgelaufen`,
                                `**Ursprünglicher Grund:** ${ban.reason}`,
                                `**Fall-ID:** \`#${ban.caseId}\``
                            ];
                            const content = contentLines.join('\n');

                            const userAvatarUrl = user.displayAvatarURL();
                            const container = this.buildContainer(title, content, unbanImageURL, userAvatarUrl);

                            await logToForum(modLogChannel, container, unbanAttachment);
                        }
                    }

                } catch (error) {
                    if (error.code !== 10026) {
                        await Guardian.handleGeneric(`Fehler beim Aufheben des Banns für User ${ban.userId}.`, 'TempBanCheck', error.stack);
                    }
                } finally {
                    await ModalService.updateOne("ban", {_id: ban._id}, {active: false});
                }
            }
        }, 60000);
    }

    async generateCaseId() {
        let caseId;
        let isUnique = false;

        const generatePart = () => Math.random().toString(36).substring(2, 8).toUpperCase();

        while (!isUnique) {
            const part1 = generatePart();
            const part2 = generatePart();

            caseId = `PL-${part1}-${part2}`;

            const [banExists, timeoutExists, warnExists] = await Promise.all([ModalService.exists("ban", {caseId: caseId}), ModalService.exists("timeout", {caseId: caseId}), ModalService.exists("warn", {caseId: caseId})]);

            if (!banExists && !timeoutExists && !warnExists) {
                isUnique = true;
            }
        }
        return caseId;
    }

    async _handleBan(interaction, banData) {
        const { userId, moderatorId, reason, banType, duration = null } = banData;

        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) {
            await interaction.reply({ content: `Fehler: Mitglied mit der ID \`${userId}\` wurde nicht gefunden.`, ephemeral: true });
            return null;
        }
        if (!member.bannable) {
            await interaction.reply({ content: `Fehler: Ich habe nicht die nötigen Rechte, um ${member.user.tag} zu bannen.`, ephemeral: true });
            return null;
        }

        const caseId = await this.generateCaseId();
        const banReason = `${banType === 'temp' ? 'Temporärer' : 'Permanenter'} Bann | Grund: ${reason} | Fall-ID: #${caseId}`;

        await member.ban({ reason: banReason });

        const createdAt = new Date();
        const expiresAt = duration ? new Date(createdAt.getTime() + duration) : null;

        await ModalService.create("ban", {
            guildId: interaction.guild.id,
            caseId,
            banType,
            userId,
            moderatorId,
            reason,
            duration,
            expiresAt,
            createdAt,
            active: true
        });

        const settings = await ModalService.findOne("settings", { guildId: interaction.guild.id });
        if (settings && settings.logChannelId) {
            const modLogChannel = await interaction.guild.channels.fetch(settings.logChannelId).catch(() => null);
            if (modLogChannel && modLogChannel.type === ChannelTypes.Forum) {
                const banAttachment = MediaService.getAttachment('mod/Ban.png');
                const banImageURL = MediaService.getAttachmentURL('mod/Ban.png');

                if (banAttachment && banImageURL) {
                    const timestamp = formatTimestamp();
                    const title = `## [${timestamp}] | ACTION: ${banType.toUpperCase()}-BAN`;
                    const durationText = duration ? formatDuration(duration) : 'Permanent';

                    const contentLines = [
                        `**User:** <@${userId}> | \`${userId}\``,
                        `**Moderator:** <@${moderatorId}> | \`${moderatorId}\``,
                        `**Dauer:** ${durationText}`,
                    ];
                    if (expiresAt) {
                        contentLines.push(`**Ablauf:** <t:${Math.floor(expiresAt.getTime() / 1000)}:f> (<t:${Math.floor(expiresAt.getTime() / 1000)}:R>)`);
                    }
                    contentLines.push(`**Grund:** ${reason}`, `**Fall-ID:** \`#${caseId}\``);

                    const content = contentLines.join('\n');
                    const userAvatarUrl = member.user.displayAvatarURL();
                    const container = this.buildContainer(title, content, banImageURL, userAvatarUrl);
                    await logToForum(modLogChannel, container, banAttachment);
                }
            }
        }
        return { member, caseId };
    }

    async tempBan(interaction, banData) {
        if (!banData.duration) {
            await Guardian.handleGeneric('Unvollständige banData bei tempBan.', 'tempBan', `Daten: ${JSON.stringify(banData)}`);
            return interaction.reply({ content: 'Ein interner Fehler ist aufgetreten (Fehlende Daten).', ephemeral: true });
        }

        try {
            const result = await this._handleBan(interaction, banData);
            if (result) {
                await interaction.reply({ content: `${result.member.user.tag} wurde erfolgreich gebannt. Fall-ID: \`#${result.caseId}\``, ephemeral: true });
            }
        } catch (error) {
            await Guardian.handleCommand(`Ein Fehler ist beim Bannen von User ${banData.userId} aufgetreten.`, interaction, 'tempBan');
        }
    }

    async permaBan(interaction, banData) {
        try {
            const result = await this._handleBan(interaction, banData);
            if (result) {
                await interaction.reply({ content: `${result.member.user.tag} wurde erfolgreich permanent gebannt. Fall-ID: \`#${result.caseId}\``, ephemeral: true });
            }
        } catch (error) {
            await Guardian.handleCommand(`Ein Fehler ist beim permanenten Bannen von User ${banData.userId} aufgetreten.`, interaction, 'permaBan');
        }
    }

    async unban(interaction, unbanData) {
        const { caseId, moderatorId, reason } = unbanData;

        try {
            const banRecord = await ModalService.findOne("ban", {
                caseId: caseId,
                guildId: interaction.guild.id,
                active: true
            });

            if (!banRecord) {
                return interaction.reply({ content: `Fehler: Es wurde kein aktiver Bann mit der Fall-ID \`#${caseId}\` gefunden.`, ephemeral: true });
            }

            const { userId } = banRecord;

            const userToUnban = await this.client.users.fetch(userId).catch(() => null);
            if (!userToUnban) {
                return interaction.reply({ content: `Fehler: Der zu entbannende User mit der ID \`${userId}\` konnte nicht gefunden werden.`, ephemeral: true });
            }

            await interaction.guild.bans.remove(userId, reason);

            await ModalService.updateOne("ban", { _id: banRecord._id }, { active: false });

            const settings = await ModalService.findOne("settings", { guildId: interaction.guild.id });
            if (settings && settings.logChannelId) {
                const modLogChannel = await interaction.guild.channels.fetch(settings.logChannelId).catch(() => null);
                if (modLogChannel && modLogChannel.type === ChannelTypes.Forum) {
                    const unbanAttachment = MediaService.getAttachment('mod/Unban.png');
                    const unbanImageURL = MediaService.getAttachmentURL('mod/Unban.png');

                    if (unbanAttachment && unbanImageURL) {
                        const timestamp = formatTimestamp();
                        const title = `## [${timestamp}] | ACTION: UNBAN`;
                        const contentLines = [
                            `**User:** <@${userId}> | \`${userId}\``,
                            `**Moderator:** <@${moderatorId}> | \`${moderatorId}\``,
                            `**Grund:** ${reason}`,
                            `**Zugehörige Fall-ID:** \`#${caseId}\``
                        ];
                        const content = contentLines.join('\n');
                        const userAvatarUrl = userToUnban.displayAvatarURL();
                        const container = this.buildContainer(title, content, unbanImageURL, userAvatarUrl);
                        await logToForum(modLogChannel, container, unbanAttachment);
                    }
                }
            }

            return interaction.reply({ content: `${userToUnban.tag} wurde erfolgreich entbannt.`, ephemeral: true });

        } catch (error) {
            if (error.code === 10026) {
                return interaction.reply({ content: `Info: Der User zu Fall-ID \`#${caseId}\` war bereits entbannt. Der Fall wurde als inaktiv markiert.`, ephemeral: true });
            }
            await Guardian.handleCommand(`Ein Fehler ist beim Entbannen (Fall-ID #${caseId}) aufgetreten.`, interaction, 'unban');
        }
    }

    async showBans(interaction) {
        try {
            const allBans = await ModalService.find("ban", { guildId: interaction.guild.id });

            if (!allBans || allBans.length === 0) {
                return interaction.reply({ content: "Es gibt in der Datenbank keine Einträge über gebannte User für diesen Server.", ephemeral: true });
            }

            const uniqueUsers = new Map();
            for (const ban of allBans) {
                if (!uniqueUsers.has(ban.userId)) {
                    uniqueUsers.set(ban.userId, { id: ban.userId, count: 0 });
                }
                uniqueUsers.get(ban.userId).count++;
            }

            const userOptions = [];
            for (const [userId, data] of uniqueUsers.entries()) {
                const user = await this.client.users.fetch(userId).catch(() => null);
                const userName = user ? user.tag : `Unbekannter User (${userId})`;

                userOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(userName)
                        .setValue(userId)
                        .setDescription(`Hat insgesamt ${data.count} Ban-Einträge.`)
                );
            }

            if (userOptions.length === 0) {
                return interaction.reply({ content: "Es konnten keine User für die Ban-Liste gefunden werden.", ephemeral: true });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ban_history_select')
                .setPlaceholder('Wähle einen User, um dessen Ban-Verlauf zu sehen')
                .addOptions(userOptions.slice(0, 25));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const banLisAttachment = MediaService.getAttachment('mod/BanVerlauf.png');
            const banListImageURL = MediaService.getAttachmentURL('mod/BanVerlauf.png');

            if (!banLisAttachment || !banListImageURL) {
                await Guardian.handleGeneric('Medien für die Ban-Verlauf Anzeige konnten nicht geladen werden.', 'showBans');
                return interaction.reply({ content: 'Ein interner Fehler ist aufgetreten (fehlende Medien).', ephemeral: true });
            }

            const separator1 = new SeparatorBuilder();
            const separator2 = new SeparatorBuilder();

            const title = "## 🛡️ Ban-Verlauf";
            const content = "Bitte wähle einen Benutzer aus dem Menü unten aus, um alle seine vergangenen und aktuellen Banns anzuzeigen.";
            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
                .addSeparatorComponents(separator1)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
                .addSeparatorComponents(separator2)
                .addMediaGalleryComponents(new MediaGalleryBuilder().addItems([{media: {url: banListImageURL}}]));

            await interaction.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container, row],
                files: [banLisAttachment],
                ephemeral: true
            });

        } catch (error) {
            await Guardian.handleCommand("Ein Fehler ist beim Anzeigen des Ban-Verlaufs aufgetreten.", interaction, 'showBans');
        }
    }

    buildContainer(titleContent, textContent, imageURL, userAvatarURL) {
        const title = new TextDisplayBuilder().setContent(titleContent);
        const text = new TextDisplayBuilder().setContent(textContent);
        const separator1 = new SeparatorBuilder();
        const separator2 = new SeparatorBuilder();
        const image = new MediaGalleryBuilder().addItems([{media: {url: imageURL}}]);
        const thumbnail = new ThumbnailBuilder().setURL(userAvatarURL)
        const section = new SectionBuilder()
            .setThumbnailAccessory(thumbnail)
            .addTextDisplayComponents(text);

        return new ContainerBuilder()
            .addTextDisplayComponents(title)
            .addSeparatorComponents(separator1)
            .addSectionComponents(section)
            .addSeparatorComponents(separator2)
            .addMediaGalleryComponents(image);
    }
}

module.exports = ModerationService;