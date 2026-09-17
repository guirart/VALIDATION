import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../api/index.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(api, /stageLog\('AUTH_OK'/);
assert.match(api, /stageLog\('HASH_MATCH'/);
assert.match(api, /stageLog\('ANALYST_VALIDATED'/);
assert.match(api, /stageLog\('AUDIT_VALIDATED'/);
assert.match(api, /stageLog\('QUALITY_GATE_EVALUATED'/);
assert.match(api, /failed_points/);

assert.match(css, /position:fixed !important/);
assert.match(css, /overflow-y:auto !important/);
assert.match(css, /--veredicta-sidebar-width/);

console.log('v3.0 diagnostics + fixed sidebar: OK');
