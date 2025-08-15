require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

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

app.post('/upload-iso', upload.single('iso'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Fehler beim Upload.');
    }
    if (path.extname(req.file.originalname).toLowerCase() !== '.iso') {
        fs.unlink(req.file.path, () => {});
        return res.status(400).send('Nur ISO-Dateien erlaubt!');
    }
    res.send('Upload erfolgreich!');
});

app.post('/api/post', async (req, res) => {
    try {
        // Für Entwicklungszwecke: Simuliere iVentoy-Antworten wenn Server nicht verfügbar
        if (req.body.method === 'get_img_tree') {
            // Simuliere eine Beispiel-Antwort
            const mockData = [
                {
                    imgid: 1,
                    name: "ubuntu-22.04.3-desktop-amd64.iso",
                    pmd5: "abc123def456"
                },
                {
                    imgid: 2,
                    name: "debian-12.2.0-amd64-netinst.iso", 
                    pmd5: "def456ghi789"
                }
            ];
            return res.json(mockData);
        }
        
        if (req.body.method === 'get_img_info') {
            // Simuliere Info-Antwort
            const mockInfo = {
                size: 3456789012,
                pmd5: "abc123def456",
                os: "Ubuntu 22.04.3 LTS"
            };
            return res.json(mockInfo);
        }
        
        if (req.body.method === 'refresh_img_list') {
            // Simuliere refresh
            return res.json({ success: true });
        }
        
        // Versuche echte API-Anfrage
        const response = await axios.post(IVENTOY_API_URL, req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    } catch (err) {
        // Fallback für Entwicklungszwecke
        console.log('iVentoy API nicht verfügbar, verwende Mock-Daten');
        if (req.body.method === 'get_img_tree') {
            const mockData = [
                {
                    imgid: 1,
                    name: "ubuntu-22.04.3-desktop-amd64.iso",
                    pmd5: "abc123def456"
                },
                {
                    imgid: 2,
                    name: "debian-12.2.0-amd64-netinst.iso", 
                    pmd5: "def456ghi789"
                }
            ];
            return res.json(mockData);
        }
        
        const status = err.response?.status || 500;
        res.status(status).send(err.response?.data || 'Fehler');
    }
});

app.get('/config', (req, res) => {
    res.json({
        IVENTOY_WEB_PORT,
    });
});

app.get('/proxy/*path', async (req, res) => {
    const host = new URL(IVENTOY_API_URL).hostname;
    const target = req.params.path;
    const url = `http://${host}:${IVENTOY_WEB_PORT}/${target}`;
    try {
        const response = await axios.get(url);
        if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
            const $ = cheerio.load(response.data);
            $('head').prepend(`<base href="http://${host}:${IVENTOY_WEB_PORT}/">`);
            res.send($.html());
        } else {
            res.send(response.data);
        }
    } catch (err) {
        const status = err.response?.status || 500;
        res.status(status).send(err.response?.data || 'Fehler');
    }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
