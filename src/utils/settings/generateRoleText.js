/**
 * Erzeugt den formatierten Anzeigetext für die Bot-Einstellungen.
 * @param {object | null} dbSettings - Das Einstellungs-Dokument aus der Datenbank.
 * @param {Array<object>} roleConfig - Das spezifische Konfigurationsarray für die Channels aus der JSON.
 * @returns {string} Der formatierte String für die Anzeige in Discord.
 */
function generateRoleText(dbSettings, roleConfig) {
    const currentSettings = dbSettings || {};

    if (!roleConfig || roleConfig.length === 0) {
        return "Keine Rollen in der Konfiguration gefunden.";
    }

    const displayableRoles = roleConfig.filter(role => role.value !== "main");

    const roleMappings = {
        supportPingRoleId: { icon: "💬", label: "Support Ping" },
    }

    const settingsLines = displayableRoles.map(role => {
        const roleId = currentSettings[role.value];
        const mapping = roleMappings[role.value];

        if (!mapping) return null;

        const isSet = roleId && roleId !== "Nicht gesetzt";
        const statusIcon = isSet ? "✅" : "❌";
        const roleDisplay = isSet ? `<@&${roleId}>` : "`Nicht konfiguriert`";

        return `${statusIcon} ${mapping.icon} **${mapping.label} Rolle:** ${roleDisplay}`;
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
    if (percentage >= 25 ) color = "🟠";
    if (percentage >= 50) color = "🟡";
    if (percentage >= 75) color = "🟢";

    return `${color} \`${filledBar}${emptyBar}\` ${percentage}%`;
}

module.exports = generateRoleText;