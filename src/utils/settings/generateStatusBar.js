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

module.exports = generateStatusBar;