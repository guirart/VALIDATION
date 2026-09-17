import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const nc = fs.readFileSync(new URL('../new-case.js', import.meta.url), 'utf8');

assert.match(css, /html\[data-theme="light"\]/);
assert.match(css, /html\[data-theme="dark"\]/);
assert.match(css, /\.theme-toggle/);
assert.match(app, /localStorage\.setItem\('veredicta-theme'/);
assert.match(nc, /localStorage\.setItem\('veredicta-theme'/);

console.log('v3.2 theme toggle: OK');
