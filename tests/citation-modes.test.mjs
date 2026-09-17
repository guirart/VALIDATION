import assert from 'node:assert/strict';
import fs from 'node:fs';

const s = fs.readFileSync(new URL('../lib/legal.js', import.meta.url), 'utf8');

assert.match(s, /const SILENCE_POINTS = new Set\(\[6, 12\]\)/);
assert.match(s, /const literalOk = exactQuoteExists\(mpText, quote\)/);
assert.match(s, /mpVerificationMode = 'literal'/);
assert.match(s, /mpVerificationMode = 'silence'/);
assert.match(s, /use citação literal verificável da MP ou/);

console.log('Citation modes 6/12: OK');
