import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
const js = fs.readFileSync(new URL('../app.js', import.meta.url),'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url),'utf8');

assert.match(html,/id="sidebar-collapse"/);
assert.match(html,/id="sidebar-resizer"/);
assert.match(html,/sidebar-head-actions/);

assert.match(js,/SIDEBAR_RESIZE_V365/);
assert.match(js,/--veredicta-sidebar-width/);
assert.match(js,/--veredicta-active-sidebar-width/);
assert.match(js,/event\.pointerType === 'mouse' && event\.button !== 0/);
assert.match(js,/pointermove/);

assert.match(css,/\.workspace > \.page\{/);
assert.match(css,/margin-left:var\(--veredicta-active-sidebar-width\)/);
assert.match(css,/left:calc\(var\(--veredicta-active-sidebar-width\) - 5px\)/);
assert.match(css,/--veredicta-sidebar-collapsed-width:52px/);
assert.match(css,/html\.sidebar-collapsed \.history-sidebar/);

console.log('v3.6.5 real fixed-layout sidebar: OK');
