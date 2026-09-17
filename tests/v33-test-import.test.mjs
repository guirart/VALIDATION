import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const schema=fs.readFileSync(new URL('../GPT_ACTION_SCHEMA_V3.3.yaml',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migration_v3_3_test_import.sql',import.meta.url),'utf8');

assert.match(api,/async function testImport\(/);
assert.match(api,/TEST_IMPORT_ENABLED/);
assert.match(api,/environment:'test'/);
assert.match(api,/external_test_id/);
assert.match(api,/gabarito não pode ser importado/);
assert.match(schema,/\/api\/gpt\/test-import:/);
assert.match(schema,/importarCasosSinteticosVeredicta/);
assert.match(migration,/synthetic boolean/);
assert.match(migration,/external_test_id/);

console.log('v3.3 synthetic test import: OK');
