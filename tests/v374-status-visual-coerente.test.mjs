import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(js,/function visualVerdictClass/);
assert.match(js,/display==='atencao'/);
assert.match(js,/display==='atinge'/);
assert.match(js,/display==='parcial'/);
assert.match(js,/c\[visualVerdictClass\(p\)\]\+\+/);
assert.match(js,/const v=p\?visualVerdictClass\(p\):'ausente'/);

assert.match(css,/V3\.7\.4 — STATUS VISUAL COERENTE/);
assert.match(css,/\.pill\.v-atinge/);
assert.match(css,/\.pill\.v-parcial/);
assert.match(css,/\.pill\.v-atencao/);
assert.match(css,/border:1\.5px solid #22c55e/);
assert.match(css,/border:1\.5px solid #eab308/);
assert.match(css,/border:1\.5px solid #ef4444/);

console.log('v3.7.4 visible label/status color coherence: OK');
