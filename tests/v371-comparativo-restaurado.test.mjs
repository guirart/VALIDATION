import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

const start = js.indexOf('function renderCase(){');
const end = js.indexOf('function renderEmptyCase(){', start);
const render = js.slice(start, end);

assert.match(render, /classificationHeroHtml\(a\)/);
assert.match(render, /summary-box/);
assert.match(render, /\$\{gridHtml\(a\)\}/);
assert.match(render, /\$\{filterBarHtml\(a\)\}/);
assert.match(render, /\$\{pointCardsHtml\(a\)\}/);
assert.match(render, /report-foot/);

assert.match(js, /NA MP/);
assert.match(js, /NO CONTRATO \/ LAUDO/);
assert.match(js, /quadro comparativo abaixo/);

console.log('v3.7.1 comparativo e verificações restaurados: OK');
