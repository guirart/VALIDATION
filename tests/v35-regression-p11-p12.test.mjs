import assert from 'node:assert/strict';
import fs from 'node:fs';

const s = fs.readFileSync(new URL('../lib/legal.js', import.meta.url), 'utf8');

assert.match(s, /não contém previsão expressa/);
assert.match(s, /DOCUMENTARY_SILENCE_POINTS = new Set\(\[11\]\)/);
assert.match(s, /mode:'documentary_silence'/);
assert.match(s, /normQuoteText/);
assert.match(s, /validation_debug: points\.map\(p => p\.mp_validation_debug\)/);
assert.doesNotMatch(s, /function\s+(?:levenshtein|fuzzyMatch|similarityScore)\b/i);

console.log('v3.5 P11/P12 regression policy: OK');
