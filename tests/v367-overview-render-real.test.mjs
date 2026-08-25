import assert from 'node:assert/strict';
import fs from 'node:fs';

const js=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');

assert.match(js,/function resultHeroHtml/);
assert.match(js,/function overview15Html/);
assert.match(js,/function caseRailHtml/);
assert.match(js,/function dossierDocuments/);
assert.match(js,/resultHeroHtml\(a\)/);
assert.match(js,/overview15Html\(a\)/);
assert.match(js,/caseRailHtml\(c,a\)/);
assert.match(js,/data-point="\$\{item\.point\}"/);
assert.doesNotMatch(js,/window\.currentCase/);
assert.doesNotMatch(js,/CASE_OVERVIEW_UI_V366/);

assert.doesNotMatch(html,/case-info-rail-fallback/);
assert.match(css,/OVERVIEW RENDER REAL FIX 3\.6\.7/);

console.log('v3.6.7 overview integrated into renderCase: OK');
