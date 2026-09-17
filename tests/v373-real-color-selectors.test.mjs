import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(js, /const classCss=historyClassificationClass\(classification\)/);
assert.match(js, /class="history-item \$\{classCss\}/);
assert.match(js, /<em class="\$\{classCss\}"/);

assert.match(css, /\.pill\.v-atinge/);
assert.match(css, /\.pill\.v-parcial/);
assert.match(css, /\.pill\.v-atencao/);

assert.match(css, /history-item\.history-class-eligible/);
assert.match(css, /history-item\.history-class-rejected/);
assert.match(css, /history-item\.history-class-partial/);
assert.match(css, /history-item\.history-class-uncertain/);

assert.match(css, /background:#dcfce7/);
assert.match(css, /background:#fef9c3/);
assert.match(css, /background:#fee2e2/);
assert.match(css, /background:#ede9fe/);

console.log('v3.7.3 real status/history color selectors: OK');
