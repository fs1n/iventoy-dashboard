const request = require('supertest');
const fs = require('fs');
const path = require('path');

describe('Server endpoints', () => {
  let app;
  const tmpDir = path.join(__dirname, 'tmp');

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env.ISO_DIR = tmpDir;
    process.env.IVENTOY_WEB_PORT = '12345';
    app = require('../app');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GET /config should return configured port', async () => {
    await request(app)
      .get('/config')
      .expect(200)
      .then(res => {
        if (res.body.IVENTOY_WEB_PORT !== '12345') {
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
});
