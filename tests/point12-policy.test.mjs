import assert from 'node:assert/strict';
import fs from 'node:fs';

const s = fs.readFileSync(new URL('../lib/legal.js', import.meta.url), 'utf8');

assert.match(s, /function validateMpEvidenceForPoint/);
assert.match(s, /if \(quote && exactQuoteExists\(mpText, quote\)\)/);
assert.match(s, /if \(number === 6 \|\| number === 12\)/);
assert.match(s, /refSilence && reasoningSilence && quoteSilence/);
assert.match(s, /nos demais pontos/i);

console.log('Point 12 validation policy: OK');
