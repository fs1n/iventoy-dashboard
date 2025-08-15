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

// API-Endpunkt zum Scrapen der ISO-Inhalte
app.get('/api/iso/:id/browse', async (req, res) => {
    const host = new URL(IVENTOY_API_URL).hostname;
    const id = req.params.id;
    const path = req.query.path || '';
    const url = `http://${host}:${IVENTOY_WEB_PORT}/eiso/id/${id}/${path}`;
    
    try {
        const response = await axios.get(url);
        
        if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
            const $ = cheerio.load(response.data);
            
            // Extrahiere Datei- und Ordnerinformationen aus der Tabelle
            const items = [];
            
            // Finde die Tabelle mit Dateien/Ordnern
            $('table tr').each((i, element) => {
                if (i === 0) return; // Skip header row
                
                const $row = $(element);
                const $cells = $row.find('td');
                
                if ($cells.length >= 3) {
                    const $nameCell = $cells.eq(1);
                    const $sizeCell = $cells.eq(2);
                    const $modifiedCell = $cells.eq(3);
                    
                    const $link = $nameCell.find('a');
                    if ($link.length > 0) {
                        const href = $link.attr('href');
                        const name = $link.text().trim();
                        
                        // Skip parent directory links und andere unwichtige Links
                        if (name && href && name !== 'Name' && !name.startsWith('[') && name !== '../') {
                            const isDirectory = href.endsWith('/');
                            const size = $sizeCell.text().trim();
                            const modified = $modifiedCell.text().trim();
                            
                            items.push({
                                name: name,
                                href: href,
                                isDirectory: isDirectory,
                                size: isDirectory ? '' : size,
                                modified: modified
                            });
                        }
                    }
                }
            });
            
            // Füge Parent-Directory-Link hinzu wenn wir nicht im Root sind
            if (path && path !== '/') {
                items.unshift({
                    name: '..',
                    href: '../',
                    isDirectory: true,
                    size: '',
                    modified: ''
                });
            }
            
            res.json({
                currentPath: path,
                items: items
            });
        } else {
            res.status(400).json({ error: 'Invalid response format' });
        }
    } catch (err) {
        console.error('Error browsing ISO:', err.message);
        res.status(500).json({ error: 'Failed to browse ISO contents: ' + err.message });
    }
});

// API-Endpunkt zum Proxy von Dateien (für Downloads)
app.get('/api/iso/:id/download', async (req, res) => {
    const host = new URL(IVENTOY_API_URL).hostname;
    const id = req.params.id;
    const filePath = req.query.path || '';
    const url = `http://${host}:${IVENTOY_WEB_PORT}/eiso/id/${id}/${filePath}`;
    
    try {
        const response = await axios.get(url, { 
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        // Setze passende Headers für Download
        const filename = filePath.split('/').pop();
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }
        
        response.data.pipe(res);
    } catch (err) {
        console.error('Error downloading file:', err.message);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

app.get(/^\/proxy\/(.*)/, async (req, res) => {
    const host = new URL(IVENTOY_API_URL).hostname;
    const target = req.params[0];
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
