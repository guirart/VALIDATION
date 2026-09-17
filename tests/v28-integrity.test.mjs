import assert from 'node:assert/strict';
import fs from 'node:fs';

const legal = fs.readFileSync(new URL('../lib/legal.js', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../api/index.js', import.meta.url), 'utf8');

assert.match(legal, /sem previsão expressa/);
assert.match(legal, /validation_debug/);
assert.match(legal, /quote_silence/);

assert.match(api, /source_contract_sha256/);
assert.match(api, /analysis_rejected_contract_hash_mismatch/);
assert.match(api, /contract_sha256/);
assert.match(api, /app_version/);
assert.match(api, /validator_version/);

console.log('v2.8 integrity + diagnostic regression: OK');
