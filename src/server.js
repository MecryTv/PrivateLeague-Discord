require("dotenv").config();
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const logger = require("./logger");
logger.mtvBanner(logger.colors.green);

const app = express();
const port = 3000;

app.listen(port, () => {
    logger.success(`🌐 Server erfolgreich gestartet & läuft auf http://localhost:${port}`);
});