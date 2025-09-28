const generateStatusBar = require('./generateStatusBar');

/**
 * Erzeugt den formatierten Anzeigetext für die Bot-Einstellungen.
 * @param {object | null} dbSettings - Das Einstellungs-Dokument aus der Datenbank.
 * @param {Array<object>} channelConfig - Das spezifische Konfigurationsarray für die Channels aus der JSON.
 * @returns {string} Der formatierte String für die Anzeige in Discord.
 */
function generateChannelText(dbSettings, channelConfig) {
    const currentSettings = dbSettings || {};

    if (!channelConfig || channelConfig.length === 0) {
        return "Keine Kanäle in der Konfiguration gefunden.";
    }

    const displayableChannels = channelConfig.filter(channel => channel.value !== "main");

    const channelMappings = {
        welcomeChannelId: { icon: "🎉", label: "Willkommens" },
        ticketsChannelId: { icon: "🎫", label: "Tickets" },
        logChannelId: { icon: "📋", label: "Log" },
        applicationChannelId: { icon: "📄", label: "Bewerbungs" },
        supportChannelId: { icon: "💬", label: "Support" },
        errorLogChannelId: { icon: "⚠️", label: "Fehler-Log" },
    };

    const settingsLines = displayableChannels.map(channel => {
        const channelId = currentSettings[channel.value];
        const mapping = channelMappings[channel.value];

        if (!mapping) return null;

        const isSet = channelId && channelId !== "Nicht gesetzt";
        const statusIcon = isSet ? "✅" : "❌";
        const channelDisplay = isSet ? `<#${channelId}>` : "`Nicht konfiguriert`";

        return `${statusIcon} ${mapping.icon} **${mapping.label} Channel:** ${channelDisplay}`;
    }).filter(Boolean);

    if (settingsLines.length === 0) {
        return "Keine gültigen Kanäle zum Anzeigen gefunden.";
    }

    const separator = "───────────────────────────────";
    const configuredCount = settingsLines.filter(line => line.includes("✅")).length;
    const totalCount = settingsLines.length;
    const completionPercentage = totalCount > 0 ? Math.round((configuredCount / totalCount) * 100) : 0;
    const statusBar = generateStatusBar(completionPercentage);
    const statusText = `\n**Konfiguration:** ${configuredCount}/${totalCount} (${completionPercentage}%)`;

    return `${settingsLines.join('\n')}\n\n${separator}${statusText}\n${statusBar}`;
}

module.exports = generateChannelText;