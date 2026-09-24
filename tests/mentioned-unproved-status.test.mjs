import assert from 'node:assert/strict';
import { projectAnalysisDisplay } from '../lib/legal.js';

const point=(evidence_status,contract_quote,applicability='aplicavel',legal_result='inconclusivo')=>({
  evidence_status,contract_quote,applicability,legal_result,
  display_status:'nao_consta',display_label:'NÃO CONSTA',verdict:'ausente'
});

const stored={analyst_json:{points:[
  point('nao_comprovado','O contrato menciona laudo, sem apresentar seus dados.'),
  point('nao_comprovado','não consta no documento'),
  point('nao_comprovado',''),
  point('nao_comprovado','Menção a requisito descumprido','aplicavel','nao_atende'),
  point('nao_comprovado','Menção em modalidade dispensada','nao_aplicavel','nao_aplicavel')
]}};
const projected=projectAnalysisDisplay(stored);
assert.deepEqual(projected.analyst_json.points.map(p=>p.display_status),[
  'parcial','nao_consta','nao_consta','atencao','nao_se_aplica'
]);
assert.equal(projected.analyst_json.points[0].display_label,'PARCIAL');
assert.equal(projected.analyst_json.points[0].verdict,'parcial');
assert.equal(stored.analyst_json.points[0].display_status,'nao_consta');
console.log('Menção sem comprovação: projeção de status OK');
