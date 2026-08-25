import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

assert.match(css, /html\[data-theme="light"\] \.history-content b/);
assert.match(css, /color:#171513 !important/);
assert.match(css, /scrollbar-color:#bba37f #f2eadf/);
assert.match(css, /\.history-item\.active/);
assert.match(js, /class="history-title"/);

console.log('v3.6.2 UI legibility: OK');
