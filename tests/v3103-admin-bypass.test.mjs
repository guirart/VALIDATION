import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const action=fs.readFileSync(new URL('../lib/actionAuth.js',import.meta.url),'utf8');

assert.match(api,/APP_VERSION = '3\.(?:10\.3|11\.[0-9]+)'/);
assert.match(api,/VEREDICTA_ADMIN_EMAIL/);
assert.match(api,/subscription_status:'admin_exempt'/);
assert.match(api,/if\(!isAdmin && !paid\.has\(subscriptionStatus\)\)/);
assert.match(api,/billing_exempt:true/);
assert.match(action,/const isAdmin=u\.role==='admin'/);
assert.match(action,/if\(!isAdmin && !\['active','trialing'\]/);

console.log('v3.10.3 admin billing bypass: OK');
