import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../../../');
const casesPath=path.join(root,'VEREDICTA_100_CASOS_REGRESSAO_V3.json');
const goldPath=path.join(root,'tests/fixtures/veredicta-regressao-100-v3-gold.json');
const [command,stateArg,resultArg]=process.argv.slice(2);
if(!command||!stateArg) throw new Error('Uso: training-loop.mjs <init|batch|next|record|status> <estado.json> [resultado.json]');
const statePath=path.resolve(stateArg);
const publicCases=JSON.parse(fs.readFileSync(casesPath)).cases;
const gold=JSON.parse(fs.readFileSync(goldPath)).gold;
const goldById=new Map(gold.map(x=>[x.external_test_id,x]));
const datasetSha256=crypto.createHash('sha256').update(fs.readFileSync(casesPath)).digest('hex');
const distribution=gold.reduce((acc,x)=>(acc[x.expected_classification]=(acc[x.expected_classification]||0)+1,acc),{});
const expectedDistribution={'enquadrável':25,'parcialmente enquadrável':25,'não enquadrável':25,'inconclusivo':25};
if(publicCases.length!==100||gold.length!==100)throw new Error('Bateria deve conter exatamente 100 casos e 100 gabaritos.');
if(JSON.stringify(distribution)!==JSON.stringify(expectedDistribution))throw new Error(`Distribuição inválida: ${JSON.stringify(distribution)}`);
if(publicCases.some((x,i)=>x.external_test_id!==`VEREDICTA-REG-003-${String(i+1).padStart(4,'0')}`))throw new Error('IDs da bateria V3 estão fora da sequência oficial.');

function load(){return JSON.parse(fs.readFileSync(statePath))}
function save(state){fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n')}
function summary(state){return {run_id:state.run_id,dataset_sha256:datasetSha256,distribution,score:state.score,streak:state.streak,attempts:state.attempts,completed:state.streak>=100,current_case_id:state.current_case_id,lessons:state.lessons}}

if(command==='init'){
  const state={run_id:`TRAIN-${Date.now()}`,score:0,streak:0,attempts:0,next_index:0,current_case_id:null,history:[],lessons:[]}; save(state); console.log(JSON.stringify(summary(state),null,2));
}else if(command==='next'){
  const state=load(); if(state.streak>=100){console.log(JSON.stringify(summary(state),null,2));process.exit(0)}
  if(state.current_case_id) throw new Error('Registre o resultado do caso atual antes de solicitar o próximo.');
  const item=publicCases[state.next_index%publicCases.length]; state.current_case_id=item.external_test_id; save(state);
  console.log(JSON.stringify({external_test_id:item.external_test_id,title:item.title,client_name:item.client_name,contract_text:item.contract_text,approved_lessons:state.lessons.slice(-20)},null,2));
}else if(command==='batch'){
  console.log(fs.readFileSync(casesPath,'utf8'));
}else if(command==='record'){
  if(!resultArg) throw new Error('Informe o arquivo de resultado.');
  const state=load(); const actual=JSON.parse(fs.readFileSync(path.resolve(resultArg))); const expected=goldById.get(state.current_case_id);
  if(!expected) throw new Error('Caso atual sem gabarito.');
  const classification=actual.final_classification||actual.classification;
  const classificationOk=classification===expected.expected_classification;
  const points=actual.points||actual.analyst?.points||[];
  const pointDiffs=Object.entries(expected.expected_points).map(([point,want])=>{const got=points.find(p=>String(p.point)===point);return {point,expected:want.legal_result,actual:got?.legal_result||null,ok:got?.legal_result===want.legal_result}});
  const correct=classificationOk&&pointDiffs.every(x=>x.ok);
  let lesson=null;
  if(correct){state.score+=1;state.streak+=1}else{
    state.score-=1;state.streak=0;
    lesson={case_id:expected.external_test_id,rule:`Revisar classificação ${classification||'ausente'} versus ${expected.expected_classification} e os pontos divergentes: ${pointDiffs.filter(x=>!x.ok).map(x=>x.point).join(', ')||'classificação final'}.`,created_at:new Date().toISOString()};
    if(!state.lessons.some(x=>x.rule===lesson.rule)) state.lessons.push(lesson);
  }
  state.history.push({case_id:expected.external_test_id,correct,classification_ok:classificationOk,point_diffs:pointDiffs,score_after:state.score,streak_after:state.streak,created_at:new Date().toISOString()});
  state.attempts+=1; state.next_index+=1; state.current_case_id=null; save(state);
  console.log(JSON.stringify({...summary(state),correct,lesson},null,2));
}else if(command==='status') console.log(JSON.stringify(summary(load()),null,2));
else throw new Error('Comando inválido.');
