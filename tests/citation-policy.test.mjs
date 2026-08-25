import assert from 'node:assert/strict';
import fs from 'node:fs';
const s=fs.readFileSync(new URL('../lib/legal.js',import.meta.url),'utf8');
assert.match(s,/const SILENCE_POINTS = new Set\(\[6, 12\]\)/);
assert.match(s,/exactQuoteExists\(mpText, p\.mp_quote\)/);
assert.match(s,/não deve conter falsa citação literal da MP/);
console.log('Citation policy regression: OK');
