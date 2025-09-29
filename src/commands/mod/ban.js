const Command = require("../../structures/Command");
const {SlashCommandBuilder} = require("discord.js");
const Permissions = require("../../enums/Permissions");
const parseDuration = require("../../utils/mod/parseDuration");
const ModerationService = require("../../services/ModerationService");

class Ban extends Command {
    constructor() {
        super({
            name: "ban",
            description: "Infos zu denn Ban befehlen",
        });

        this.data = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setDefaultMemberPermissions(Permissions.BanMembers)
            .addSubcommand(subcommand => subcommand
                .setName("add")
                .setDescription("Einen Benutzer bannen")
                .addUserOption(option => option
                    .setName("user")
                    .setDescription("Der Benutzer, der gebannt werden soll")
                    .setRequired(true))
                .addStringOption(option => option
                    .setName("reason")
                    .setDescription("Der Grund für den Bann")
                    .setRequired(true))
                .addStringOption(option => option
                    .setName("type")
                    .setDescription("Der Typ des Banns (temp oder perma)")
                    .setRequired(true)
                    .addChoices(
                        {name: "Temporär", value: "temp"},
                        {name: "Permanent", value: "perma"}
                    ))
                .addStringOption(option => option
                    .setName("duration")
                    .setDescription("Die Dauer eines temporären Banns (z.B. 10s, 20m, 30h, 40d, 50M, 60y)")
                    .setRequired(false)
                )
            )
            .addSubcommand(subcommand => subcommand
                .setName("remove")
                .setDescription("Einen Benutzer entbannen")
                .addStringOption(option => option
                    .setName("caseid")
                    .setDescription("Die Fall-ID des Banns (Zu finden unter /ban list)")
                    .setRequired(true)
                )
                .addStringOption(option => option
                    .setName("reason")
                    .setDescription("Der Grund für die Entbannung")
                    .setRequired(true)
                )
            )
            .addSubcommand(subcommand => subcommand
                .setName("list")
                .setDescription("Eine Liste aller Bans anzeigen")
            );
    }

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const moderationService = interaction.client.moderationService;

        if (subcommand === "add") {
            const user = interaction.options.getUser("user");
            const reason = interaction.options.getString("reason");
            const type = interaction.options.getString("type");
            const durationInput = interaction.options.getString("duration");

            if (type === 'temp') {
                if (!durationInput) {
                    return interaction.reply({
                        content: "❌ **Fehler:** Für einen temporären Bann muss eine Dauer angegeben werden.",
                        ephemeral: true
                    });
                }

                const durationMS = parseDuration(durationInput);
                if (durationMS === null) {
                    return interaction.reply({
                        content: "❌ **Fehler:** Ungültiges Zeitformat. Bitte benutze ein Format wie `30s`, `10m`, `2h`, `7d`.",
                        ephemeral: true,
                    });
                }

                const banData = {
                    banType: 'temp',
                    userId: user.id,
                    moderatorId: interaction.user.id,
                    reason: reason,
                    duration: durationMS,
                };

                return moderationService.tempBan(interaction, banData);
            } else if (type === 'perma') {
                if (durationInput) {
                    return interaction.reply({
                        content: "❌ **Fehler:** Für einen permanenten Bann darf keine Dauer angegeben werden.",
                        ephemeral: true
                    });
                }

                const banData = {
                    banType: 'perma',
                    userId: user.id,
                    moderatorId: interaction.user.id,
                    reason: reason,
                };

                return moderationService.permaBan(interaction, banData);
            }
        } else if (subcommand === "remove") {
            const caseId = interaction.options.getString("caseid");
            const reason = interaction.options.getString("reason");

            const unbanData = {
                caseId: caseId,
                moderatorId: interaction.user.id,
                reason: reason,
            };

            return moderationService.unban(interaction, unbanData);
        } else if (subcommand === "list") {
            return moderationService.showBans(interaction);
        }
    }
}

module.exports = Ban;