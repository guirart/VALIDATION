import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(css, /html\[data-theme="light"\] \.case-head\{/);
assert.match(css, /background:#ffffff !important/);
assert.match(css, /html\[data-theme="light"\] \.case-head h3/);
assert.match(css, /html\[data-theme="light"\] \.final-class/);

console.log('v3.2.1 light contrast: OK');
