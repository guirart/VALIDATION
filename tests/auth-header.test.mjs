import assert from 'node:assert/strict';
import fs from 'node:fs';
const s = fs.readFileSync(new URL('../lib/actionAuth.js', import.meta.url), 'utf8');
assert.match(s, /x-veredicta-key/);
assert.match(s, /authorization/);
assert.match(s, /auth_debug/);
console.log('Auth header regression: OK');
