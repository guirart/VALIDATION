import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(html, /Arquivo de casos/, 'A lateral deve ser apresentada como arquivo');
assert.match(app, /function archiveGroupForCase/, 'Os casos devem ser classificados em pastas');
assert.match(app, /Em andamento/);
assert.match(app, /Aguardando revisão/);
assert.match(app, /Concluídos/);
assert.match(css, /\.archive-folder/);

console.log('v3.15.3 case archive: OK');
