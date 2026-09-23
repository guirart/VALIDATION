import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
const mcp=fs.readFileSync(new URL('../lib/mcp.js',import.meta.url),'utf8');
const instructions=fs.readFileSync(new URL('../GPT_INSTRUCTIONS.md',import.meta.url),'utf8');
const vercel=fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8');

assert.ok(api.includes("const APP_VERSION = '3.17.2'"));
assert.ok(api.includes('async function gptPetitionRegister'));
assert.ok(api.includes('async function gptPetitionAnalyze'));
assert.ok(api.includes("flow:'petition_register_and_analyze'"));
assert.ok(api.includes("case 'gpt-petition-analyze'"));
assert.ok(mcp.includes("registrar_peticao_para_analise_veredicta"));
assert.ok(mcp.includes("cadastrar_e_analisar_peticao_veredicta"));
assert.ok(mcp.includes("version:'3.17.2'"));
assert.ok(mcp.includes('REGRA DE PETIÇÃO'));
assert.ok(instructions.includes('PETIÇÃO = CADASTRO + ANÁLISE EM UM ÚNICO FLUXO'));
assert.ok(instructions.includes('Não peça confirmação intermediária'));
assert.ok(vercel.includes('/api/gpt/petition-register'));
assert.ok(vercel.includes('/api/gpt/petition-analyze'));
console.log('v3.17 petition one-flow regression OK');
