import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const instructions=fs.readFileSync(new URL('../GPT_INSTRUCTIONS.md',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../plugins/veredicta/skills/analisar-credito-rural/references/workflow-veredicta.md',import.meta.url),'utf8');
const mcp=fs.readFileSync(new URL('../lib/mcp.js',import.meta.url),'utf8');

assert.match(api,/const APP_VERSION = '3\.14\.5'/);
assert.doesNotMatch(api,/cases\?title=eq\.\$\{encodeURIComponent\(item\.title\)\}/);
assert.doesNotMatch(api,/adopted_existing_title/);
assert.doesNotMatch(api,/synthetic_case_adopted_by_test_import/);
assert.match(api,/cases\?external_test_id=eq\.\$\{encodeURIComponent\(item\.external_test_id\)\}&owner_id=eq\./);
assert.match(api,/select=id,external_test_id,synthetic,environment,title,client_name,status/);
assert.match(api,/select=id,external_test_id,synthetic,environment,title,client_name,contract_text,status/);

for(const text of [instructions,workflow]){
  assert.match(text,/identidade canônica do caso é exclusivamente `case\.id` \(UUID\)/i);
  assert.match(text,/nunca associe, deduplique ou reutilize análise por `title`, `client_name`/i);
  assert.match(text,/idempotente exclusivamente por `external_test_id`/i);
}
assert.match(mcp,/identidade canônica de cada caso é somente case\.id \(UUID\)/i);

console.log('v3.14.5 UUID-only case identity: OK');
