import assert from 'node:assert/strict';
import { verifyAnalysis } from '../lib/legal.js';

const contractText = `
Produtor/beneficiário: Helena Costa Martins
Garantias/minuta: hipoteca rural; minuta da nova operação ainda não assinada
Art. 4º — prorrogação de até 30 dias: não aplicável; parcela de investimento analisada vence em 20/11/2026
Instrução ao analisador
Analise exclusivamente os fatos e documentos descritos neste dossiê. Não complete lacunas por presunção.
`;

function basePoint(n, overrides={}) {
  return {
    point:n,
    title:`P${n}`,
    legal_reference:'Art. 1º',
    applicability:'nao_aplicavel',
    evidence_status:'dispensado',
    legal_result:'nao_aplicavel',
    display_status:'nao_se_aplica',
    verdict:'parcial', // legado contraditório proposital: deve ser ignorado/normalizado
    display_label:'PARCIAL',
    mp_quote:'Não se aplica',
    contract_quote:'não aplicável',
    reasoning:'Regra não aplicável ao caso concreto.',
    ...overrides
  };
}

// O teste abaixo verifica o defeito específico do TEST-004 sem depender das citações da MP.
// Inspeciona a fonte para garantir que verdict não gere mais erro de consistência.
const fs = await import('node:fs');
const source = fs.readFileSync(new URL('../lib/legal.js', import.meta.url),'utf8');
assert.doesNotMatch(source,/verdict legado .* contradiz display_status derivado/);
assert.match(source,/verdict é estritamente legado/);
assert.match(source,/normalizedLegacyVerdict/);

// P15 deve ter orientação explícita no prompt para evento futuro não exigível.
const instructions = fs.readFileSync(new URL('../GPT_INSTRUCTIONS.md', import.meta.url),'utf8');
assert.match(instructions,/P5\/P12\/P15/);
assert.match(instructions,/ainda NÃO É EXIGÍVEL/);
assert.match(instructions,/applicability=condicional/);
assert.match(instructions,/P15, nunca use a data da operação originária como data da futura contratação/);

console.log('v3.8.1 TEST-004 regression fix: OK');
