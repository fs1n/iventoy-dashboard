const request = require('supertest');
const fs = require('fs');
const path = require('path');
const http = require('http');

describe('Server endpoints', () => {
  let app;
  const tmpDir = path.join(__dirname, 'tmp');
  let proxyServer;

  before(done => {
    fs.mkdirSync(tmpDir, { recursive: true });
    // start a simple http server to act as the iVentoy web server
    proxyServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><head></head><body>proxy</body></html>');
    }).listen(4321, () => {
      process.env.ISO_DIR = tmpDir;
      process.env.IVENTOY_API_URL = 'http://localhost:9999/iventoy/json';
      process.env.IVENTOY_WEB_PORT = '4321';
      app = require('../app');
      done();
    });
  });

  after(done => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    proxyServer.close(done);
  });

  it('GET /config should return configured port', async () => {
    await request(app)
      .get('/config')
      .expect(200)
      .then(res => {
        if (res.body.IVENTOY_WEB_PORT !== '4321') {
          throw new Error('Incorrect config response');
        }
      });
  });

  it('POST /upload-iso without file should fail', async () => {
    await request(app)
      .post('/upload-iso')
      .expect(400);
  });

  it('POST /upload-iso with iso file should succeed', async () => {
    const fakeIso = path.join(tmpDir, 'test.iso');
    fs.writeFileSync(fakeIso, 'dummy');

    await request(app)
      .post('/upload-iso')
      .attach('iso', fakeIso)
      .expect(200);

    fs.unlinkSync(fakeIso);
  });

  it('GET /proxy/test should inject base tag', async () => {
    await request(app)
      .get('/proxy/test')
      .expect(200)
      .then(res => {
        if (!res.text.includes('<base href="http://localhost:4321/">')) {
          throw new Error('Base tag not injected');
        }
      });
  });
});
