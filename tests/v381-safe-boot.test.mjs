import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('app.js','utf8');

assert.match(html, /<div id="login" class="login-screen">/, 'login deve ser visível por padrão como fallback');
assert.match(html, /id="boot-error"/, 'deve existir área visível para erro de boot');
assert.match(html, /<noscript>/, 'deve existir fallback sem JavaScript');
assert.match(js, /function renderBootFailure\(/, 'app.js deve possuir tratamento de falha de boot');
assert.match(js, /boot\(\)\.catch\(renderBootFailure\)/, 'falha do boot deve cair no fallback visível');
assert.match(js, /window\.addEventListener\('unhandledrejection'/, 'rejeições não tratadas no boot devem ser visíveis');

console.log('v3.8.1 safe boot: OK');
