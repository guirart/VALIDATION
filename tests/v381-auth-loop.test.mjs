import fs from 'node:fs';
import assert from 'node:assert/strict';

const app=fs.readFileSync(new URL('../app.js', import.meta.url),'utf8');
const http=fs.readFileSync(new URL('../lib/http.js', import.meta.url),'utf8');

assert.match(app,/async function confirmSession\(force=false\)/,'confirmSession deve existir');
assert.match(app,/if\(url==='\/api\/auth'\)throw new Error/,'login 401 deve preservar erro real');
assert.match(app,/const authenticated=await confirmSession\(true\)/,'401 deve confirmar sessão antes de mostrar login');
assert.doesNotMatch(app,/if\(res\.status===401\)\{showLogin\(\);throw new Error\('Sessão encerrada'\)\}/,'não deve derrubar UI imediatamente em qualquer 401');
assert.match(app,/credentials:'include'/,'fetches de auth/api devem enviar cookie explicitamente');
assert.match(http,/SameSite=Lax/,'cookie deve usar SameSite=Lax');
assert.doesNotMatch(http,/SameSite=Strict/,'cookie antigo Strict não deve permanecer');

console.log('v3.8.1 auth-loop regression: OK');
