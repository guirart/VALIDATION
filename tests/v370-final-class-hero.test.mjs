import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(js,/function classificationHeroHtml/);
assert.match(js,/html\+=classificationHeroHtml\(a\)/);
assert.match(js,/countVerdicts\(a\)/);

assert.match(css,/V3\.7\.0 — CLASSIFICAÇÃO HERO NO TEMPLATE ORIGINAL/);
assert.match(css,/\.final-class-hero/);
assert.match(css,/\.final-class-uncertain/);
assert.match(css,/\.final-class-eligible/);
assert.match(css,/\.final-class-partial/);
assert.match(css,/\.final-class-rejected/);

console.log('v3.7.0 final classification hero: OK');
