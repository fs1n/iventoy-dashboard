const assert = require('assert');
const { JSDOM } = require('jsdom');

describe('ISO list rendering', () => {
  it('escapes HTML in ISO names', async () => {
    const isoName = '<img src=x onerror=alert(1)>';

    const dom = new JSDOM('<div id="iso-list"></div>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.dashboardConfig = {};
    global.fetch = async () => ({
      json: async () => [{ name: isoName, imgid: 1, pmd5: 'abc' }]
    });

    const { loadIsoList } = require('../public/assets/js/loader.js');

    await loadIsoList();

    const nameCell = document.querySelector('#iso-list tbody tr td:nth-child(2)');
    assert.strictEqual(nameCell.textContent, isoName);
    assert.ok(!nameCell.innerHTML.includes('<img'));
  });
});

