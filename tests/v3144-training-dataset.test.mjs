import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const publicPath=new URL('../VEREDICTA_100_CASOS_REGRESSAO_V3.json',import.meta.url);
const goldPath=new URL('./fixtures/veredicta-regressao-100-v3-gold.json',import.meta.url);
const payload=JSON.parse(fs.readFileSync(publicPath));
const gold=JSON.parse(fs.readFileSync(goldPath)).gold;

assert.equal(payload.batch_id,'VEREDICTA-REGRESSAO-100-V3');
assert.equal(payload.cases.length,100);
assert.equal(gold.length,100);
assert.equal(new Set(payload.cases.map(x=>x.external_test_id)).size,100);
assert.equal(new Set(payload.cases.map(x=>crypto.createHash('sha256').update(x.contract_text).digest('hex'))).size,100);

const distribution=gold.reduce((a,x)=>(a[x.expected_classification]=(a[x.expected_classification]||0)+1,a),{});
assert.deepEqual(distribution,{'enquadrável':25,'parcialmente enquadrável':25,'não enquadrável':25,'inconclusivo':25});

for(let i=0;i<100;i++){
  assert.equal(payload.cases[i].external_test_id,`VEREDICTA-REG-003-${String(i+1).padStart(4,'0')}`);
  assert.equal(gold[i].external_test_id,payload.cases[i].external_test_id);
  assert.doesNotMatch(payload.cases[i].contract_text,/INFORMAÇÃO ESPECÍFICA DO DOSSIÊ/);
}

assert.match(payload.cases[25].contract_text,/laudo da safra 2024\/2025 não foi apresentado/i);
assert.doesNotMatch(payload.cases[25].contract_text,/Três laudos assinados por engenheiro agrônomo habilitado/);
assert.match(payload.cases[50].contract_text,/cartão de crédito empresarial sem destinação rural/i);
assert.doesNotMatch(payload.cases[50].contract_text,/Operação original de custeio de soja e milho/);
assert.match(payload.cases[75].contract_text,/não informam renda esperada/i);
assert.doesNotMatch(payload.cases[75].contract_text,/redução de 45%/);

console.log('v3.14.4 deterministic blind training dataset: OK');
