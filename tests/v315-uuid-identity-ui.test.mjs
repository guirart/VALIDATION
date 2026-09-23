import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.doesNotMatch(app, /function identityWarning\(/, 'A interface não deve validar identidade pelo nome');
assert.doesNotMatch(app, /\[c\.title,c\.client_name,c\.status/, 'A busca não deve depender do nome do cliente');
assert.match(app, /UUID \$\{esc\(c\.id\)\}/, 'O UUID deve ser exibido como identificador técnico');
assert.match(app, /Busque exclusivamente pelo UUID \$\{c\.id\}/, 'O comando ao GPT deve vincular o caso pelo UUID');
assert.doesNotMatch(html, /class="info-box compact-info"/, 'A faixa informativa branca não deve ocupar espaço na análise');
assert.match(html, /data-case-view="points"/, 'A navegação simplificada deve oferecer uma página independente para os 15 pontos');
assert.doesNotMatch(app, /case-context-card/, 'O quadro de identificação técnica deve ter sido removido');
assert.match(app, /const authenticated=await confirmSession\(true\)/, 'O boot deve restaurar a sessão existente');

console.log('v3.15 UUID-only identity + simplified navigation: OK');
