const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class MessageService {
    constructor() {
        this.messages = new Map();
        this._loadMessages();
    }

    _loadMessages() {
        const messagesPath = path.join(__dirname, '..', 'messages');
        if (!fs.existsSync(messagesPath)) {
            logger.warn(`Das Nachrichtenverzeichnis (${messagesPath}) existiert nicht.`);
            return;
        }
        const messageFiles = fs.readdirSync(messagesPath).filter(file => file.endsWith('.json'));
        for (const file of messageFiles) {
            try {
                const filePath = path.join(messagesPath, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const messageData = JSON.parse(fileContent);
                const messageName = path.basename(file, '.json');
                this.messages.set(messageName, messageData);
            } catch (error) {
                logger.error(`❌ Fehler beim Laden der Nachrichtendatei ${file}:`, error);
            }
        }
    }

    get(key, replacements = {}) {
        const [fileName, ...path] = key.split('.');
        let message = this.messages.get(fileName);

        if (!message) {
            logger.warn(`Nachrichtendatei mit dem Key '${fileName}' wurde nicht gefunden.`);
            return null;
        }

        for (const part of path) {
            if (message && typeof message === 'object' && part in message) {
                message = message[part];
            } else {
                logger.warn(`Nachrichtenschlüssel '${key}' wurde nicht gefunden.`);
                return null;
            }
        }

        if (Array.isArray(message)) {
            message = message.join('\n');
        }

        if (typeof message === 'string') {
            for (const placeholder in replacements) {
                message = message.replace(`{${placeholder}}`, replacements[placeholder]);
            }
        }

        return message;
    }

    getMessageCount() {
        return this.messages.size;
    }
}

module.exports = new MessageService();