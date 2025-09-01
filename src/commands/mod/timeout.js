const Command = require("../../structures/Command");
const {SlashCommandBuilder, PermissionsBitField} = require("discord.js");
const TimeoutService = require("../../services/TimeoutService");
const logger = require("../../utils/logger");
const ActiveTimeoutModel = require("../../models/mod/ActiveTimeouts");
const InactiveTimeoutModel = require("../../models/mod/InactiveTimeouts");


class Timeout extends Command {
    constructor() {
        super({
            name: "timeout",
            description: "Verwalte user Timeouts (e.g. add, remove, show)",
        });

        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand(subcommand => subcommand
                .setName("add")
                .setDescription("Setzt einen Benutzer in den Timeout")
                .addUserOption(user => user
                    .setName("user")
                    .setDescription("Wähle einen Benutzer aus")
                    .setRequired(true)
                )
                .addStringOption(reason => reason
                    .setName("grund")
                    .setDescription("Grund für den Timeout")
                    .setRequired(true)
                )
                .addStringOption(duration => duration
                    .setName("dauer")
                    .setDescription("Dauer des Timeouts (z.b. 10s, 5m, 1h, 1d)")
                    .setRequired(true)
                )
            )
            .addSubcommand(subcommand => subcommand
                .setName("remove")
                .setDescription("Entfernt den Timeout von einem Benutzer")
                .addUserOption(user => user
                    .setName("user")
                    .setDescription("Wähle einen Benutzer aus")
                    .setRequired(true)
                )
                .addStringOption(reason => reason
                    .setName("grund")
                    .setDescription("Grund für das Entfernen des Timeouts")
                    .setRequired(true)
                )
            );
    }

    static parseDurationToMS(str) {
        return require("../../services/TimeoutService").parseDurationToMS(str);
    }

    async execute(interaction) {
        const logThreadID = "1411803100574122084";
        const service = new TimeoutService(interaction.client, {logThreadId: logThreadID});
        const subcommand = interaction.options.getSubcommand();

        if (!interaction.guild) {
            return interaction.reply({content: "Dieser Command funktioniert nur auf einem Server.", ephemeral: true});
        }

        try {
            if (subcommand === "add") {
                const user = interaction.options.getUser("user");
                const reason = interaction.options.getString("grund");
                const duration = interaction.options.getString("dauer");
                const actor = interaction.user;

                const ms = Timeout.parseDurationToMS(duration);
                if (!ms) {
                    return interaction.reply({
                        content: "Bitte gib eine gültige Dauer an (z. B. 10s, 5m, 1h, 1d).",
                        ephemeral: true
                    });
                }

                const MAX_MS = 28 * 24 * 60 * 60 * 1000;
                if (ms > MAX_MS) {
                    return interaction.reply({content: "Die maximale Timeout-Dauer ist 28 Tage.", ephemeral: true});
                }

                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member) {
                    return interaction.reply({content: "Benutzer nicht auf dem Server gefunden.", ephemeral: true});
                }

                const requiredPerms = [PermissionsBitField.Flags.ModerateMembers];
                const invokerHas = interaction.memberPermissions?.has(requiredPerms);
                if (!invokerHas) {
                    return interaction.reply({
                        content: "Du brauchst die Berechtigung: `Moderate Members`.",
                        ephemeral: true
                    });
                }

                const invoker = interaction.member;
                const botMember = interaction.guild.members.me || await interaction.guild.members.fetch(interaction.client.user.id).catch(() => null);

                if (invoker.roles?.highest && member.roles?.highest && invoker.roles.highest.position <= member.roles.highest.position && interaction.guild.ownerId !== invoker.id) {
                    return interaction.reply({
                        content: "Du kannst keinen Benutzer mit gleicher/höherer Rolle bearbeiten.",
                        ephemeral: true
                    });
                }
                if (botMember && botMember.roles?.highest && member.roles?.highest && botMember.roles.highest.position <= member.roles.highest.position) {
                    return interaction.reply({
                        content: "Ich kann diesen Benutzer aufgrund der Rollen-Hierarchie nicht timeouten.",
                        ephemeral: true
                    });
                }

                if (!botMember) {
                    return interaction.reply({content: "Konnte Bot-GuildMember nicht ermitteln.", ephemeral: true});
                }
                if (!botMember.permissions?.has(requiredPerms)) {
                    return interaction.reply({
                        content: "Ich brauche die Berechtigung: `Moderate Members` (oder sie fehlt mir).",
                        ephemeral: true
                    });
                }

                const {
                    startTimestampSec,
                    endTimestampSec,
                    caseId
                } = await service.applyTimeout(member, actor, ms, reason);

                const data = await ActiveTimeoutModel.create({userId: user.id})
                data.modId = actor.id;
                data.reason = reason;
                data.caseId = caseId;
                data.startTimestamp = startTimestampSec;
                data.endTimestamp = endTimestampSec;

                data.save();

                return interaction.reply({
                    content: `${user.tag} wurde für \`${duration}\` in den Timeout gesetzt.\nStart: <t:${startTimestampSec}:F>\nEnde: <t:${endTimestampSec}:F>\nCase ID: ${caseId}`,
                    ephemeral: true
                });
            } else if (subcommand === "remove") {
                const user = interaction.options.getUser("user");
                const reason = interaction.options.getString("grund");
                const actor = interaction.user;

                const activeTimeoutData = await ActiveTimeoutModel.findOne({userId: user.id});

                if (!activeTimeoutData) {
                    return interaction.reply({content: "Dieser Benutzer ist nicht im Timeout", ephemeral: true});
                }

                const activeReasonData = activeTimeoutData.reason;
                const activeModData = activeTimeoutData.modId;
                const activeCaseId = activeTimeoutData.caseId;
                const activeStartTimestamp = activeTimeoutData.startTimestamp;
                const activeEndTimestamp = activeTimeoutData.endTimestamp;

                const inactiveTimeoutData = await InactiveTimeoutModel.create({userId: user.id});
                inactiveTimeoutData.reason = activeReasonData;
                inactiveTimeoutData.modId = activeModData;
                inactiveTimeoutData.caseId = activeCaseId;
                inactiveTimeoutData.startTimestamp = activeStartTimestamp;
                inactiveTimeoutData.endTimestamp = activeEndTimestamp;

                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member) {
                    return interaction.reply({content: "Benutzer nicht auf dem Server gefunden.", ephemeral: true});
                }

                const requiredPerms = [PermissionsBitField.Flags.ModerateMembers];
                const invokerHas = interaction.memberPermissions?.has(requiredPerms);
                if (!invokerHas) {
                    return interaction.reply({
                        content: "Du brauchst die Berechtigung: `Moderate Members`.",
                        ephemeral: true
                    });
                }

                const invoker = interaction.member;
                const botMember = interaction.guild.members.me || await interaction.guild.members.fetch(interaction.client.user.id).catch(() => null);

                if (invoker.roles?.highest && member.roles?.highest && invoker.roles.highest.position <= member.roles.highest.position && interaction.guild.ownerId !== invoker.id) {
                    return interaction.reply({
                        content: "Du kannst keinen Benutzer mit gleicher/höherer Rolle bearbeiten.",
                        ephemeral: true
                    });
                }
                if (botMember && botMember.roles?.highest && member.roles?.highest && botMember.roles.highest.position <= member.roles.highest.position) {
                    return interaction.reply({
                        content: "Ich kann diesen Benutzer aufgrund der Rollen-Hierarchie nicht ent-timeouten.",
                        ephemeral: true
                    });
                }

                if (!botMember) {
                    return interaction.reply({content: "Konnte Bot-GuildMember nicht ermitteln.", ephemeral: true});
                }
                if (!botMember.permissions?.has(requiredPerms)) {
                    return interaction.reply({
                        content: "Ich brauche die Berechtigung: `Moderate Members` (oder sie fehlt mir).",
                        ephemeral: true
                    });
                }

                const {userId} = await service.removeTimeout(member, actor, reason, activeCaseId);

                inactiveTimeoutData.save();
                await ActiveTimeoutModel.deleteOne({userId: user.id});

                return interaction.reply({
                    content: `Der User ${user} | ${userId} wurde aus dem Timeout entfernt`,
                    ephemeral: true
                });
            }

        } catch (err) {
            logger.error("Fehler im Timeout-Command:", err);
            return interaction.reply({content: "Fehler beim Ausführen des Commands.", ephemeral: true});
        }
    }
}

module.exports = Timeout;