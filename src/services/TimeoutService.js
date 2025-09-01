const {
    ThumbnailBuilder,
    ContainerBuilder,
    MessageFlags,
    TextDisplayBuilder,
    SectionBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder
} = require("discord.js");
const logger = require("../utils/logger");
const generateCaseId = require("../utils/generateCaseId");

class TimeoutService {
    /**
     * @param {import("discord.js").Client} client
     * @param {Object} options
     * @param {string} [options.logThreadId] - optional: Channel/Thread ID to log actions
     */
    constructor(client, options = {}) {
        this.client = client;
        this.logThreadId = options.logThreadId || null;
    }

    /**
     * Parst strings wie "10s", "5m", "1h", "1d" zu Millisekunden.
     * @param {string} str
     * @returns {number|null} ms oder null wenn ungültig
     */
    static parseDurationToMS(str) {
        if (!str || typeof str !== "string") return null;
        const re = /^(\d+)\s*(s|m|h|d)$/i;
        const m = str.trim().match(re);
        if (!m) return null;
        const value = Number(m[1]);
        const unit = m[2].toLowerCase();
        switch (unit) {
            case "s":
                return value * 1000;
            case "m":
                return value * 60 * 1000;
            case "h":
                return value * 60 * 60 * 1000;
            case "d":
                return value * 24 * 60 * 60 * 1000;
            default:
                return null;
        }
    }

    async logTimeout({user, actor, durationMs, reason, caseId}) {
        if (!this.logThreadId) return;

        try {
            const now = new Date();
            const startTimestampMs = Date.now();
            const endTimestampMs = startTimestampMs + (durationMs || 0);

            const endTimestampSec = Math.floor(endTimestampMs / 1000);

            const day = String(now.getDate()).padStart(2, "0");
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const year = now.getFullYear();

            const hour = String(now.getHours()).padStart(2, "0");
            const minute = String(now.getMinutes()).padStart(2, "0");
            const second = String(now.getSeconds()).padStart(2, "0");

            const formatted = `${day}.${month}.${year} ${hour}:${minute}:${second}`;

            const header = new TextDisplayBuilder()
                .setContent(`## __[${formatted}] | ACTION: TIMEOUT__`);

            const thumbnail = new ThumbnailBuilder()
                .setURL(user.displayAvatarURL ? user.displayAvatarURL() : "");

            const separator = new SeparatorBuilder();

            const mainText = new TextDisplayBuilder()
                .setContent(
                    `**User:** ${user} | ${user.id}\n` +
                    `**Actor:** ${actor} | ${actor.id}\n` +
                    `**Dauer:** <t:${endTimestampSec}:R>\n` +
                    `**Grund:** ${reason}\n` +
                    `**Case ID:** ${caseId}`
                );

            const section = new SectionBuilder()
                .addTextDisplayComponents(mainText)
                .setThumbnailAccessory(thumbnail);

            const image = new MediaGalleryBuilder()
                .addItems({
                    media: {
                        url: "https://media.discordapp.net/attachments/1411803100574122084/1411813950605230151/welcome.png"
                    }
                });

            const container = new ContainerBuilder()
                .addTextDisplayComponents(header)
                .addSeparatorComponents(separator)
                .addSectionComponents(section)
                .addMediaGalleryComponents(image);

            const thread = await this.client.channels.fetch(this.logThreadId).catch(() => null);
            if (!thread) {
                logger.warn("Log-Thread nicht gefunden, Nachricht wurde nicht geloggt.");
                return;
            }

            if (typeof thread.archived !== "undefined" && thread.archived) {
                await thread.setArchived(false).catch(() => null);
            }

            await thread.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            }).catch(err => {
                logger.error("Fehler beim Senden in den Log-Thread:", err);
            });
        } catch (err) {
            logger.error("Fehler in logTimeout:", err);
        }
    }

    /**
     * Setzt den Timeout für ein GuildMember.
     * @param {import("discord.js").GuildMember} member
     * @param {import("discord.js").User} actor
     * @param {number} ms
     * @param {string} reason
     * @returns {Promise<{startTimestampSec:number,endTimestampSec:number,caseId:string}>}
     */
    async applyTimeout(member, actor, ms, reason) {
        if (!member || typeof member.timeout !== "function") {
            throw new Error("Ungültiges GuildMember Objekt.");
        }

        const caseId = `CASE#${await generateCaseId()}`;
        await member.timeout(ms, reason);

        this.logTimeout({
            user: member.user,
            actor: actor,
            durationMs: ms,
            reason,
            caseId
        }).catch(() => null);

        const startTimestampSec = Math.floor(Date.now() / 1000);
        const endTimestampSec = Math.floor((Date.now() + ms) / 1000);

        return {startTimestampSec, endTimestampSec, caseId};
    }

    /**
     * Entfernt den Timeout (setzt ihn auf null).
     * @param {import("discord.js").GuildMember} member
     * @param {string} reason
     * @returns {Promise<{caseId:string}>}
     */
    async removeTimeout(member, reason) {
        if (!member || typeof member.timeout !== "function") {
            throw new Error("Ungültiges GuildMember Objekt.");
        }

        const caseId = `CASE#${Date.now()}`;
        await member.timeout(null, reason);

        this.logTimeout({
            user: member.user,
            actor: member.client ? member.client.user : {id: "unknown", tag: "unknown"},
            durationMs: null,
            reason,
            caseId
        }).catch(() => null);

        return {caseId};
    }
}

module.exports = TimeoutService;
