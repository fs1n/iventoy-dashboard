require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const checkDiskSpace = require('check-disk-space').default;

const app = express();
const ISO_DIR = process.env.ISO_DIR || path.join(__dirname, 'iventoy-1.0.21/iso');
const IVENTOY_API_URL = process.env.IVENTOY_API_URL || 'http://1.2.3.4:26000/iventoy/json';
const IVENTOY_WEB_PORT = process.env.IVENTOY_WEB_PORT || '16000';

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, ISO_DIR),
    filename: (req, file, cb) => cb(null, path.basename(file.originalname))
});
const upload = multer({storage: storage});

app.use(express.json());

// function to check free disk space, can be overridden in tests
app.set('diskCheck', async (dir) => {
    const { free } = await checkDiskSpace(dir);
    return free;
});

app.post('/upload-iso', upload.single('iso'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Fehler beim Upload.');
    }
    if (path.extname(req.file.originalname).toLowerCase() !== '.iso') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).send('Nur ISO-Dateien erlaubt!');
    }
    try {
        const free = await app.get('diskCheck')(ISO_DIR);
        if (free < req.file.size) {
            fs.unlink(req.file.path, () => {});
            return res.status(507).send('Nicht genug Speicherplatz.');
        }
    } catch (e) {
        fs.unlink(req.file.path, () => {});
        return res.status(500).send('Fehler beim Prüfen des Speicherplatzes.');
    }
    res.send('Upload erfolgreich!');
});

app.post('/api/post', async (req, res) => {
    try {
        const response = await axios.post(IVENTOY_API_URL, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    } catch (err) {
        const status = err.response?.status || 500;
        res.status(status).send(err.response?.data || 'Fehler');
    }
});

app.get('/config', (req, res) => {
    res.json({
        IVENTOY_WEB_PORT,
    });
});

app.use(express.static(path.join(__dirname, 'public')));


module.exports = app;
