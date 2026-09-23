import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const mcp=fs.readFileSync(new URL('../lib/mcp.js',import.meta.url),'utf8');
const instructions=fs.readFileSync(new URL('../GPT_INSTRUCTIONS.md',import.meta.url),'utf8');

assert.ok(api.includes("const APP_VERSION = '3.16.0'"));
assert.ok(api.includes('await Promise.all(['));
assert.ok(api.includes("recommended_transport:'single_payload'"));
assert.ok(mcp.includes('Fluxo rápido preferencial'));
assert.ok(mcp.includes('Fallback para payload grande'));
assert.ok(instructions.includes('V3.16 — FLUXO RÁPIDO SEM REDUÇÃO DE QUALIDADE'));
assert.ok(instructions.includes('Enviar tudo em uma única chamada com `enviar_analise_veredicta`'));
assert.ok(instructions.includes('15 pontos e os 15 findings'));
assert.ok(instructions.includes('no máximo uma correção completa'));
console.log('v3.16 fast-flow regression OK');
