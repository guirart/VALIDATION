import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(js, /function historyClassificationClass/);
assert.match(js, /history-class-eligible/);
assert.match(js, /history-class-rejected/);
assert.match(js, /history-class-partial/);
assert.match(js, /history-class-uncertain/);

assert.match(css, /V3\.7\.2 — CORES DOS STATUS E CLASSIFICAÇÕES DO HISTÓRICO/);
assert.match(css, /background:#dff4dc/);
assert.match(css, /background:#fff1b8/);
assert.match(css, /background:#ffdede/);
assert.match(css, /history-class-eligible/);
assert.match(css, /history-class-rejected/);
assert.match(css, /history-class-partial/);
assert.match(css, /history-class-uncertain/);

console.log('v3.7.2 status colors + history classification: OK');
