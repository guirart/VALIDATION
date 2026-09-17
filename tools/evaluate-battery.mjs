import fs from 'node:fs';
const actualPath=process.argv[2];
if(!actualPath) throw new Error('Uso: node tools/evaluate-battery.mjs <resultados.json>');
const gold=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/veredicta-regressao-100-v2-gold.json',import.meta.url))).gold;
const raw=JSON.parse(fs.readFileSync(actualPath));
const actual=Array.isArray(raw)?raw:(raw.results||raw.cases||[]);
const byId=new Map(actual.map(x=>[x.external_test_id,x]));
const rows=gold.map(expected=>{
  const got=byId.get(expected.external_test_id);
  const actualClassification=got?.final_classification||got?.classification||null;
  const point_results=Object.entries(expected.expected_points).map(([point,want])=>{const found=(got?.points||got?.analyst?.points||[]).find(p=>String(p.point)===point);return {point,expected:want.legal_result,actual:found?.legal_result||null,ok:found?.legal_result===want.legal_result}});
  return {external_test_id:expected.external_test_id,present:Boolean(got),expected_classification:expected.expected_classification,actual_classification:actualClassification,classification_ok:actualClassification===expected.expected_classification,point_results};
});
const evaluated=rows.filter(x=>x.present); const checks=rows.flatMap(x=>x.point_results);
const report={batch_id:'VEREDICTA-REGRESSAO-100-V2',expected:gold.length,received:evaluated.length,classification_accuracy:evaluated.length?evaluated.filter(x=>x.classification_ok).length/evaluated.length:null,point_checks:checks.length,point_accuracy:checks.length?checks.filter(x=>x.ok).length/checks.length:null,false_positives:rows.filter(x=>x.present&&x.expected_classification==='enquadrável'&&!x.classification_ok).length,false_negatives:rows.filter(x=>x.present&&x.expected_classification!=='enquadrável'&&x.actual_classification==='enquadrável').length,rows};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
