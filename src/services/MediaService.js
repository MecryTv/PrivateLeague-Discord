const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const logger = require('../utils/logger');

class MediaService {
    constructor() {
        this.media = new Map();
        this._loadMedia();
    }

    /**
     * Durchsucht rekursiv das Medienverzeichnis und lädt alle gefundenen Dateien.
     * @param {string} dirPath - Der Pfad zum Verzeichnis, das durchsucht werden soll.
     * @private
     */
    _loadMediaRecursive(dirPath) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        const mediaPath = path.join(__dirname, '..', 'images');

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                this._loadMediaRecursive(fullPath);
            } else {
                try {
                    const key = path.relative(mediaPath, fullPath).replace(/\\/g, '/');
                    this.media.set(key, fullPath);
                } catch (error) {
                    logger.error(`❌ Fehler beim Laden der Mediendatei ${entry.name}:`, error);
                }
            }
        }
    }

    /**
     * Startet den Ladevorgang für alle Medien.
     * @private
     */
    _loadMedia() {
        const mediaPath = path.join(__dirname, '..', 'images');
        if (!fs.existsSync(mediaPath)) {
            logger.warn(`Das Medienverzeichnis (${mediaPath}) existiert nicht. Es werden keine Medien geladen.`);
            return;
        }
        this._loadMediaRecursive(mediaPath);
    }

    /**
     * Ruft den vollständigen Pfad zu einer Mediendatei ab.
     * @param {string} key - Der Key der Datei (z.B. 'PLLogo.png' oder 'banner/PLBanner.png').
     * @returns {string | null} Den vollständigen Dateipfad oder null, wenn nicht gefunden.
     */
    get(key) {
        if (!this.media.has(key)) {
            logger.warn(`Die Mediendatei mit dem Key '${key}' wurde nicht gefunden.`);
            return null;
        }
        return this.media.get(key);
    }

    /**
     * Erstellt einen AttachmentBuilder für eine Mediendatei.
     * @param {string} key - Der Key der Datei (z.B. 'unterordner/bild.png').
     * @param {object} options - Zusätzliche Optionen für den AttachmentBuilder.
     * @returns {AttachmentBuilder | null}
     */
    getAttachment(key, options = {}) {
        const filePath = this.get(key);
        if (!filePath) {
            return null;
        }
        return new AttachmentBuilder(filePath, { name: path.basename(key), ...options });
    }

    /**
     * Gibt den formatierten String für die Verwendung in .setURL() zurück.
     * @param {string} key - Der Key der Datei (z.B. 'unterordner/bild.png').
     * @returns {string | null} Den String 'attachment://<Dateiname>' oder null, wenn nicht gefunden.
     */
    getAttachmentURL(key) {
        if (!this.media.has(key)) {
            logger.warn(`Die Mediendatei mit dem Key '${key}' für die URL konnte nicht gefunden werden.`);
            return null;
        }
        const fileName = path.basename(key);
        return `attachment://${fileName}`;
    }

    getMediaCount() {
        return this.media.size;
    }
}

module.exports = new MediaService();