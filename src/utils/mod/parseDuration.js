const ms = require('ms');

/**
 * @param {string} timeString - Der String, der überprüft werden soll (z.B. "7d").
 * @returns {number|null} Die Dauer in Millisekunden oder null, wenn das Format ungültig ist.
 */
function parseDuration(timeString) {
    try {
        const milliseconds = ms(timeString);

        if (typeof milliseconds !== 'number' || !/[a-zA-Z]/.test(timeString) || !/\d/.test(timeString)) {
            return null;
        }
        return milliseconds;
    } catch (error) {
        return null;
    }
}

module.exports = parseDuration;