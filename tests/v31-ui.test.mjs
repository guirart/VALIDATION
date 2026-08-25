import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(css, /\.history-sidebar\{[\s\S]*position:fixed !important/);
assert.match(css, /\.case-history\{[\s\S]*overflow-y:auto !important/);
assert.match(css, /\.workspace > \.page\{[\s\S]*margin-left:var\(--veredicta-sidebar-width\)/);
assert.match(css, /\.appbar\{[\s\S]*position:fixed !important/);
assert.match(css, /--gold:#d7a633/);
assert.match(html, /MP 1\.376\/2026/);

console.log('v3.1 dark UI + fixed history: OK');
