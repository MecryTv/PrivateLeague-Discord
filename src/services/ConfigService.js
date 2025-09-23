const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ConfigService {
    constructor() {
        this.configs = new Map();
        this._loadConfigs();
    }

    /**
     * Lädt alle .json Konfigurationsdateien aus dem root /config Verzeichnis.
     * @private
     */
    _loadConfigs() {
        const configPath = path.join(__dirname, '..', 'config');

        if (!fs.existsSync(configPath)) {
            logger.warn(`Das Konfigurationsverzeichnis (${configPath}) existiert nicht. Es werden keine Konfigurationen geladen.`);
            return;
        }

        const configFiles = fs.readdirSync(configPath).filter(file => file.endsWith('.json'));

        for (const file of configFiles) {
            try {
                const filePath = path.join(configPath, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const configData = JSON.parse(fileContent);

                const configName = path.basename(file, '.json');

                this.configs.set(configName, configData);
            } catch (error) {
                logger.error(`❌ Fehler beim Laden der Konfigurationsdatei ${file}:`, error);
            }
        }
    }

    /**
     * Ruft eine geladene Konfiguration ab.
     * @param {string} key - Der Name der Konfiguration (z.B. 'channels').
     * @returns {any | null} Die Konfigurationsdaten oder null, wenn nicht gefunden.
     */
    get(key) {
        if (!this.configs.has(key)) {
            logger.warn(`Die Konfiguration mit dem Key '${key}' wurde nicht gefunden.`);
            return null;
        }
        return this.configs.get(key);
    }

    /**
     * Gibt die Anzahl der geladenen Konfigurationsdateien zurück.
     * @returns {number}
     */
    getConfigCount() {
        return this.configs.size;
    }
}

module.exports = new ConfigService();