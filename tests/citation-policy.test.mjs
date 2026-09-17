import assert from 'node:assert/strict';
import fs from 'node:fs';
const s=fs.readFileSync(new URL('../lib/legal.js',import.meta.url),'utf8');
assert.match(s,/const SILENCE_POINTS = new Set\(\[6, 12\]\)/);
assert.match(s,/exactQuoteExists\(mpText, quote\)/);
assert.match(s,/citação da MP não verificada no ponto/);
console.log('Citation policy regression: OK');
