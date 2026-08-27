import assert from 'node:assert/strict';import fs from 'node:fs';
const api=fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const login=fs.readFileSync(new URL('../login.html',import.meta.url),'utf8');
const loginjs=fs.readFileSync(new URL('../login.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
assert.match(api,/mode==='guest'/);assert.match(api,/synthetic=eq.true/);assert.match(api,/Para criar casos reais/);assert.match(api,/APP_VERSION = '3.9.1'/);
assert.match(login,/guest-access-btn/);assert.match(loginjs,/mode:'guest'/);assert.match(app,/guestMode=Boolean/);
console.log('v3.9.1 guest access: OK');