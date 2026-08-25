import assert from 'node:assert/strict';
import { validateMpEvidenceForPoint, exactQuoteExists, reasoningDeclaresSilence } from './_legal-v35-testable.mjs';

assert.equal(
  reasoningDeclaresSilence('A MP não contém previsão expressa que permita validar o conteúdo da minuta futura não assinada.'),
  true
);

const p12 = validateMpEvidenceForPoint(12, {
  legal_reference:'Silêncio normativo quanto ao conteúdo da minuta futura; art. 5º trata das garantias na contratação',
  mp_quote:'',
  evidence_status:'parcialmente_comprovado',
  legal_result:'inconclusivo',
  reasoning:'A MP não contém previsão expressa que permita validar o conteúdo de uma minuta futura não assinada.'
});
assert.equal(p12.ok, true);
assert.equal(p12.mode, 'normative_silence');

const p11 = validateMpEvidenceForPoint(11, {
  legal_reference:'Silêncio do dossiê quanto à utilização da linha adicional do art. 2º',
  mp_quote:'',
  evidence_status:'parcialmente_comprovado',
  legal_result:'inconclusivo',
  reasoning:'Não há previsão expressa no dossiê de utilização da linha adicional do art. 2º; não se presume essa modalidade.'
});
assert.equal(p11.ok, true);
assert.equal(p11.mode, 'documentary_silence');

const p11bad = validateMpEvidenceForPoint(11, {
  legal_reference:'Silêncio do dossiê quanto à utilização da linha adicional do art. 2º',
  mp_quote:'',
  evidence_status:'comprovado',
  legal_result:'atende',
  reasoning:'Não há previsão expressa no dossiê de utilização da linha adicional.'
});
assert.equal(p11bad.ok, false);

assert.equal(exactQuoteExists(
  'Fica autorizada a criação de linha de crédito rural, com recursos livres ou direcionados das instituições financeiras.',
  'linha de crédito rural com recursos livres das instituições financeiras'
), false);

assert.equal(exactQuoteExists(
  'É assegurada na contratação das operações de que trata o *caput* a possibilidade de revisão das garantias para sua:',
  'É assegurada na contratação das operações de que trata o caput a possibilidade de revisão das garantias para sua:'
), true);

console.log('v3.5 behavior regression: OK');
