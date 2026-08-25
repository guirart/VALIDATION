import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

assert.doesNotMatch(html, /id="sidebar-narrow"/);
assert.doesNotMatch(html, /id="sidebar-wide"/);
assert.match(html, /id="sidebar-collapse"/);
assert.match(html, /id="sidebar-resizer"/);

assert.match(js, /SIDEBAR_RESIZE_V364/);
assert.match(js, /event\.pointerType === 'mouse' && event\.button !== 0/);
assert.match(js, /pointerdown/);
assert.match(js, /pointermove/);
assert.match(js, /pointerup/);

assert.match(css, /html\.sidebar-collapsed \.history-sidebar\{/);
assert.match(css, /width:0 !important/);
assert.match(css, /flex:1 1 0 !important/);
assert.match(css, /cursor:col-resize !important/);

console.log('v3.6.4 sidebar drag/collapse fix: OK');
