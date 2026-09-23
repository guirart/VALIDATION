import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.doesNotMatch(app, /function identityWarning\(/, 'A interface não deve validar identidade pelo nome');
assert.doesNotMatch(app, /\[c\.title,c\.client_name,c\.status/, 'A busca não deve depender do nome do cliente');
assert.match(app, /UUID \$\{esc\(c\.id\)\}/, 'O UUID deve ser exibido como identificador técnico');
assert.match(app, /Busque exclusivamente pelo UUID \$\{c\.id\}/, 'O comando ao GPT deve vincular o caso pelo UUID');
assert.match(html, /identificado e recuperado exclusivamente pelo UUID/, 'A regra precisa estar clara para o usuário');
assert.match(html, /data-scroll-target="case-points"/, 'A navegação simplificada deve oferecer acesso aos 15 pontos');

console.log('v3.15 UUID-only identity + simplified navigation: OK');
