import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateTrainingRound,TRAINING_MAX_ROUNDS,TRAINING_DISTRIBUTION,compareTrainingResult} from '../lib/training.js';

assert.equal(TRAINING_MAX_ROUNDS,400);
const a=generateTrainingRound({runId:'00000000-0000-4000-8000-000000000001',seed:'seed-reproduzivel-3150',round:1});
const b=generateTrainingRound({runId:'00000000-0000-4000-8000-000000000001',seed:'seed-reproduzivel-3150',round:1});
assert.equal(a.cases.length,100);
assert.deepEqual(a.cases,b.cases,'mesma seed deve reproduzir a mesma rodada');
const dist=a.cases.reduce((acc,x)=>(acc[x.classification]=(acc[x.classification]||0)+1,acc),{});
assert.deepEqual(dist,TRAINING_DISTRIBUTION);
assert.ok(new Set(a.cases.map(x=>x.title)).size===100,'títulos devem ser únicos na rodada');
assert.ok(a.cases.every(x=>!x.title.includes(x.classification)),'título não pode revelar classificação');
assert.ok(a.cases.every(x=>x.order_index>=1&&x.order_index<=100));
assert.ok(a.cases.some((x,i)=>i>0&&x.classification!==a.cases[i-1].classification),'ordem deve estar embaralhada');

const sample=a.cases[0];
const analysis={final_classification:sample.classification,analyst_json:{points:Object.entries(sample.expected_points).map(([point,v])=>({point:Number(point),legal_result:v.legal_result}))}};
const cmp=compareTrainingResult({expected_classification:sample.classification,expected_points:sample.expected_points},analysis);
assert.equal(cmp.correct,true);
analysis.final_classification=sample.classification==='enquadrável'?'não enquadrável':'enquadrável';
assert.equal(compareTrainingResult({expected_classification:sample.classification,expected_points:sample.expected_points},analysis).correct,false);

const api=fs.readFileSync(new URL('../api/index.js',import.meta.url),'utf8');
assert.match(api,/APP_VERSION = '3\.15\.0'/);
assert.match(api,/TRAINING_MAX_ROUNDS/);
assert.match(api,/training_runs/);
assert.match(api,/training_expected/);
assert.match(api,/status:'blocked\/regression_detected'/);
assert.match(api,/streak:100,status:'success'/);
assert.doesNotMatch(api,/training_expected\?[^\n]*title=eq\./,'gabarito nunca deve ser localizado por título');

const skill=fs.readFileSync(new URL('../plugins/veredicta/skills/analisar-credito-rural/SKILL.md',import.meta.url),'utf8');
assert.match(skill,/max_rounds.*400/i);
assert.match(skill,/100\/100/);
assert.doesNotMatch(skill,/use exclusivamente o lote determinístico/i);

console.log('v3.15.0 autonomous blind training runs: OK');
