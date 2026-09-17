import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const mcp=fs.readFileSync(new URL('../lib/mcp.js',import.meta.url),'utf8');
const vercel=fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8');

assert.match(api,/const APP_VERSION = '(?:3\.14\.6|3\.15\.0)'/);
assert.match(api,/async function gptAnalysisStart/);
assert.match(api,/async function gptAnalysisPoint/);
assert.match(api,/async function gptAnalysisFinalize/);
assert.match(api,/analysis_draft_started/);
assert.match(api,/analysis_draft_point/);
assert.match(api,/req\.body=assembled/);
assert.match(mcp,/iniciar_envio_analise_veredicta/);
assert.match(mcp,/enviar_ponto_analise_veredicta/);
assert.match(mcp,/finalizar_envio_analise_veredicta/);
assert.match(vercel,/\/api\/gpt\/analysis-start/);
assert.match(vercel,/\/api\/gpt\/analysis-point/);
assert.match(vercel,/\/api\/gpt\/analysis-finalize/);
console.log('v3.14.6 staged analysis submission: OK');
