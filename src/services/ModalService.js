const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

class ModalService {
    constructor() {
        this.models = new Map();
        this._loadModels();
    }

    /**
     * Durchsucht rekursiv ein Verzeichnis und gibt alle Dateipfade zurück.
     * @param {string} dir - Das zu durchsuchende Verzeichnis.
     * @returns {string[]} Ein Array mit allen gefundenen Dateipfaden.
     * @private
     */
    _getAllFiles(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files = entries.flatMap(entry => {
            const res = path.resolve(dir, entry.name);
            // Wenn es ein Verzeichnis ist, rufe die Funktion erneut auf (rekursiv).
            // Ansonsten gib den Dateipfad zurück.
            return entry.isDirectory() ? this._getAllFiles(res) : res;
        });
        return files;
    }


    /**
     * Lädt automatisch alle Mongoose-Modelle aus dem /src/modals Verzeichnis und dessen Unterverzeichnissen.
     * @private
     */
    _loadModels() {
        const modalsPath = path.join(__dirname, "..", "modals");

        if (!fs.existsSync(modalsPath)) {
            logger.warn(`Das Verzeichnis für die Modals (${modalsPath}) existiert nicht. Es werden keine Modelle geladen.`);
            return;
        }

        // Nutze die neue rekursive Funktion, um alle JS-Dateien zu finden.
        const modalFiles = this._getAllFiles(modalsPath).filter(file => file.endsWith(".js"));

        for (const file of modalFiles) {
            const model = require(file);
            if (model && model.modelName) {
                this.models.set(model.modelName.toLowerCase(), model);
            }
        }
    }

    /**
     * Gibt die Anzahl der erfolgreich geladenen Modelle zurück.
     * @returns {number}
     */
    getModelCount() {
        return this.models.size;
    }

    /**
     * Ruft ein geladenes Mongoose-Modell ab.
     * @param {string} modelName - Der Name des Modells.
     * @returns {mongoose.Model}
     * @private
     */
    _getModel(modelName) {
        const model = this.models.get(modelName.toLowerCase());
        if (!model) {
            throw new Error(`Model "${modelName}" wurde nicht gefunden oder ist nicht geladen.`);
        }
        return model;
    }

    // --- Die CRUD-Methoden (create, findOne, etc.) bleiben unverändert ---

    async create(modelName, data) {
        const Model = this._getModel(modelName);
        const newDocument = new Model(data);
        return await newDocument.save();
    }

    async findOne(modelName, query = {}) {
        const Model = this._getModel(modelName);
        return await Model.findOne(query).exec();
    }

    async find(modelName, query = {}) {
        const Model = this._getModel(modelName);
        return await Model.find(query).exec();
    }

    async updateOne(modelName, query, updateData, options = {}) {
        const Model = this._getModel(modelName);
        return await Model.findOneAndUpdate(query, updateData, { new: true, ...options }).exec();
    }

    async deleteOne(modelName, query) {
        const Model = this._getModel(modelName);
        return await Model.deleteOne(query).exec();
    }

    async delete(modelName, query) {
        const Model = this._getModel(modelName);
        return await Model.deleteMany(query).exec();
    }

    async exists(modelName, query = {}) {
        const Model = this._getModel(modelName);
        const result = await Model.exists(query).exec();
        return result !== null;
    }
}

module.exports = new ModalService();