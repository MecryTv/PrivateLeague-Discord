const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class EmojiService {
    constructor() {
        this.emojis = new Map();
        this._loadEmojis();
    }

    /**
     * Lädt und verarbeitet die emojis.json rekursiv.
     * Ignoriert das äußere Array und den "panigation"-Key.
     * @private
     */
    _loadEmojis() {
        const emojisPath = path.join(__dirname, '..', 'config', 'emojis.json');
        if (!fs.existsSync(emojisPath)) {
            logger.warn(`Die Emoji-Konfigurationsdatei (${emojisPath}) existiert nicht. Es werden keine Emojis geladen.`);
            return;
        }

        try {
            const fileContent = fs.readFileSync(emojisPath, 'utf-8');
            let emojiData = JSON.parse(fileContent);

            if (Array.isArray(emojiData) && emojiData.length > 0) {
                emojiData = emojiData[0];
            }

            this._flattenEmojis(emojiData);
        } catch (error) {
            logger.error(`❌ Fehler beim Laden der Emoji-Datei:`, error);
        }
    }

    /**
     * Eine rekursive Hilfsfunktion, um verschachtelte Emoji-Objekte in eine flache Map umzuwandeln.
     * @param {object} obj - Das Emoji-Objekt zum Verarbeiten.
     * @param {string} prefix - Der bisherige Pfad für den Key.
     * @private
     */
    _flattenEmojis(obj, prefix = '') {
        for (const key in obj) {
            if (obj.hasOwnProperty(key) && key !== 'panigation') {
                const newPrefix = prefix ? `${prefix}.${key}` : key;
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    this._flattenEmojis(obj[key], newPrefix);
                } else {
                    this.emojis.set(newPrefix, obj[key]);
                }
            }
        }
    }

    /**
     * Ruft ein Emoji anhand seines Keys ab.
     * @param {string} key - Der Key des Emojis (z.B. 'success' oder 'status.online').
     * @returns {{name: string, id: string, animated: boolean, toString: () => string} | null}
     */
    get(key) {
        const id = this.emojis.get(key);
        if (!id) {
            logger.warn(`Emoji mit dem Key '${key}' wurde nicht gefunden.`);
            return null;
        }

        const name = key.split('.').pop();
        const isAnimated = name.startsWith('a_');

        return {
            name,
            id,
            animated: isAnimated,
            /**
             * Gibt das Emoji als String formatiert für Discord zurück.
             * @returns {string}
             */
            toString: () => (isAnimated ? `<a:${name}:${id}>` : `<:${name}:${id}>`),
        };
    }

    /**
     * Gibt die Anzahl der geladenen Emojis zurück.
     * @returns {number}
     */
    getEmojiCount() {
        return this.emojis.size;
    }
}

module.exports = new EmojiService();