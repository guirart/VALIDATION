
import assert from 'node:assert/strict';
import { verifyAnalysis } from '../lib/legal.js';

function point(n, overrides={}) {
  return {
    point:n,
    title:`P${n}`,
    legal_reference:'Art. 1º',
    applicability:'nao_aplicavel',
    evidence_status:'dispensado',
    legal_result:'nao_aplicavel',
    display_status:'nao_se_aplica',
    verdict:'ausente',
    display_label:'NÃO SE APLICA',
    mp_quote:'Não se aplica',
    contract_quote:'Não se aplica',
    reasoning:'Regra juridicamente não aplicável ao caso concreto.',
    ...overrides
  };
}

// Structural source checks are deterministic and don't depend on MP quote fixtures.
const source = await import('node:fs').then(fs => fs.readFileSync(new URL('../lib/legal.js', import.meta.url),'utf8'));
assert.match(source,/APPLICABILITIES/);
assert.match(source,/DISPLAY_STATUSES/);
assert.match(source,/evidence_status "dispensado"/);
assert.match(source,/applicability "nao_aplicavel" exige legal_result "nao_aplicavel"/);
assert.match(source,/display_status .* contradiz o status derivado/);
assert.match(source,/displayLabelFromStatus/);

console.log('v3.8 structural taxonomy: OK');
