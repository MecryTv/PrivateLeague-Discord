const ConfigService = require("../../services/ConfigService");

/**
 * Erzeugt den formatierten Anzeigetext für die Bot-Einstellungen.
 * @param {object | null} settings - Das Einstellungs-Dokument aus der Datenbank.
 * @returns {string} Der formatierte String für die Anzeige in Discord.
 */
function generateSettingsText(settings) {
    const currentSettings = settings || {};
    const channelConfig = ConfigService.get("channels") || [];

    const channelMappings = {
        welcomeChannelId: { icon: "🎉", label: "Willkommens" },
        ticketsChannelId: { icon: "🎫", label: "Tickets" },
        logChannelId: { icon: "📋", label: "Log" },
        applicationChannelId: { icon: "📄", label: "Bewerbungs" },
        supportChannelId: { icon: "💬", label: "Support" }
    };

    const settingsLines = channelConfig.map(channel => {
        const channelId = currentSettings[channel.value];
        const mapping = channelMappings[channel.value];

        if (!mapping) return null;

        const isSet = channelId && channelId !== "Nicht gesetzt";
        const statusIcon = isSet ? "✅" : "❌";
        const channelDisplay = isSet ? `<#${channelId}>` : "`Nicht konfiguriert`";

        return `${statusIcon} ${mapping.icon} **${mapping.label} Channel:** ${channelDisplay}`;
    }).filter(Boolean);

    const separator = "───────────────────────────────";

    const configuredCount = settingsLines.filter(line => line.includes("✅")).length;
    const totalCount = settingsLines.length;
    const completionPercentage = totalCount > 0 ? Math.round((configuredCount / totalCount) * 100) : 0;

    const statusBar = generateStatusBar(completionPercentage);
    const statusText = `\n**Konfiguration:** ${configuredCount}/${totalCount} (${completionPercentage}%)`;

    return `${settingsLines.join('\n')}\n\n${separator}${statusText}\n${statusBar}`;
}

/**
 * Generiert eine visuelle Fortschrittsleiste
 * @param {number} percentage - Der Prozentsatz (0-100)
 * @returns {string} Die formatierte Fortschrittsleiste
 */
function generateStatusBar(percentage) {
    const barLength = 10;
    const filledLength = Math.round((percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;

    const filledBar = "█".repeat(filledLength);
    const emptyBar = "░".repeat(emptyLength);

    let color = "🔴";
    if (percentage >= 34 && percentage <= 66) color = "🟡";
    if (percentage >= 67) color = "🟢";

    return `${color} \`${filledBar}${emptyBar}\` ${percentage}%`;
}

module.exports = generateSettingsText;