import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../app.js', import.meta.url),'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url),'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');

assert.match(js,/CASE_OVERVIEW_UI_V366/);
assert.match(js,/classificationMeta/);
assert.match(js,/extractPrimaryIssue/);
assert.match(js,/findDocuments/);
assert.match(js,/data-jump-point/);

assert.match(css,/\.case-result-hero/);
assert.match(css,/\.points-overview-grid/);
assert.match(css,/\.case-info-rail/);
assert.match(css,/\.result-uncertain/);
assert.match(css,/\.result-rejected/);

assert.match(html,/id="documents-list"/);
assert.match(html,/id="case-information-list"/);

console.log('v3.6.6 case overview UI: OK');
