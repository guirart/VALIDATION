import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

assert.match(html, /id="sidebar-collapse"/);
assert.match(html, /id="sidebar-resizer"/);
assert.match(html, /role="separator"/);
assert.match(js, /SIDEBAR_RESIZE_V363/);
assert.match(js, /pointerdown/);
assert.match(js, /veredicta-sidebar-width/);
assert.match(js, /veredicta-sidebar-collapsed/);
assert.match(css, /--sidebar-width:342px/);
assert.match(css, /html\.sidebar-collapsed \.history-sidebar/);
assert.match(css, /cursor:col-resize/);

console.log('v3.6.3 resizable/collapsible sidebar: OK');
