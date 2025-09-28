const fs = require('fs');
const path = require('path');
const Guardian = require('../services/Guardian');

class EmojiService {
    constructor() {
        this.emojis = new Map();
        this._loadEmojis();
    }

    _loadEmojis() {
        const emojisPath = path.join(__dirname, '..', 'config', 'emojis.json');
        if (!fs.existsSync(emojisPath)) {
            return Guardian.handleGeneric(`Die Emoji-Konfigurationsdatei (${emojisPath}) existiert nicht.`, 'EmojiService Init');
        }

        try {
            const fileContent = fs.readFileSync(emojisPath, 'utf-8');
            let emojiData = JSON.parse(fileContent);

            if (Array.isArray(emojiData) && emojiData.length > 0) {
                emojiData = emojiData[0];
            }

            this._flattenEmojis(emojiData);
        } catch (error) {
            Guardian.handleGeneric('Fehler beim Laden oder Parsen der Emoji-Datei.', 'EmojiService Load', error.stack);
        }
    }

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

    get(key) {
        const id = this.emojis.get(key);
        if (!id) {
            Guardian.handleGeneric(`Emoji mit dem Key '${key}' wurde nicht gefunden.`, 'EmojiService Get');
            return null;
        }

        const name = key.split('.').pop();
        const isAnimated = name.startsWith('a_');

        return {
            name,
            id,
            animated: isAnimated,
            toString: () => (isAnimated ? `<a:${name}:${id}>` : `<:${name}:${id}>`),
        };
    }

    getEmojiCount() {
        return this.emojis.size;
    }
}

module.exports = new EmojiService();