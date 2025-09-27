const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const logger = require('../utils/logger');

class MediaService {
    constructor() {
        this.media = new Map();
        this._loadMedia();
    }

    _loadMedia() {
        const mediaPath = path.join(__dirname, '..', 'images');
        if (!fs.existsSync(mediaPath)) {
            logger.warn(`Das Medienverzeichnis (${mediaPath}) existiert nicht. Es werden keine Medien geladen.`);
            return;
        }
        const mediaFiles = fs.readdirSync(mediaPath);
        for (const file of mediaFiles) {
            try {
                const filePath = path.join(mediaPath, file);
                const fileName = path.basename(file);
                this.media.set(fileName, filePath);
            } catch (error) {
                logger.error(`❌ Fehler beim Laden der Mediendatei ${file}:`, error);
            }
        }
    }

    get(key) {
        if (!this.media.has(key)) {
            logger.warn(`Die Mediendatei mit dem Key '${key}' wurde nicht gefunden.`);
            return null;
        }
        return this.media.get(key);
    }

    getAttachment(key, options = {}) {
        const filePath = this.get(key);
        if (!filePath) {
            return null;
        }
        return new AttachmentBuilder(filePath, options);
    }

    /**
     * Gibt den formatierten String für die Verwendung in .setURL() zurück.
     * @param {string} key - Der Dateiname (z.B. 'PLLogo.png').
     * @returns {string | null} Den String 'attachment://<key>' oder null, wenn nicht gefunden.
     */
    getAttachmentURL(key) {
        if (!this.media.has(key)) {
            logger.warn(`Die Mediendatei mit dem Key '${key}' für die URL konnte nicht gefunden werden.`);
            return null;
        }
        return `attachment://${key}`;
    }

    getMediaCount() {
        return this.media.size;
    }
}

module.exports = new MediaService();