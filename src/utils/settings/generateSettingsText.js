/**
 * Erzeugt den formatierten Anzeigetext für die Bot-Einstellungen.
 * @param {object | null} settings - Das Einstellungs-Dokument aus der Datenbank.
 * @returns {string} Der formatierte String für die Anzeige in Discord.
 */
function generateSettingsText(settings) {
    const currentSettings = settings || {};

    const welcomeChannelId = currentSettings.welcomeChannelId || "Nicht gesetzt";
    const ticketsChannelId = currentSettings.ticketsChannelId || "Nicht gesetzt";
    const logChannelId = currentSettings.logChannelId || "Nicht gesetzt";
    const applicationChannelId = currentSettings.applicationChannelId || "Nicht gesetzt";

    return (
        `${welcomeChannelId === "Nicht gesetzt" ? "❌" : "✅"} Willkommens Channel: <#${welcomeChannelId}>\n` +
        `${ticketsChannelId === "Nicht gesetzt" ? "❌" : "✅"} Tickets Channel: <#${ticketsChannelId}>\n` +
        `${logChannelId === "Nicht gesetzt" ? "❌" : "✅"} Log Channel: <#${logChannelId}>\n` +
        `${applicationChannelId === "Nicht gesetzt" ? "❌" : "✅"} Bewerbungs Channel: <#${applicationChannelId}>\n`
    );
}

module.exports = generateSettingsText;