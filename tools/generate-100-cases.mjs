import fs from 'node:fs';

const source=JSON.parse(fs.readFileSync(new URL('../VEREDICTA_40_CASOS_IMPORT.json',import.meta.url)));
const defects=[
  ['01 — ausência de laudo','Laudo técnico: não apresentado'],
  ['02 — nexo não demonstrado','Nexo com a safra/atividade financiada: não demonstrado'],
  ['03 — renda abaixo do limite','redução da renda bruta agropecuária esperada: 12%'],
  ['04 — dívida ativa','Dívida Ativa da União: sim; certidão positiva'],
  ['05 — processo judicial','Processo judicial: sim; execução em andamento'],
  ['06 — seguro acionado','Seguro rural/Proagro: acionado; indenização recebida'],
  ['07 — documento ausente','Instrumento de crédito/CPR e aditivos: não disponíveis'],
  ['08 — garantia incompleta','Garantias/minuta: garantia não identificada; minuta ausente'],
  ['09 — data incompatível','Data de contratação: 20/12/2026'],
  ['10 — operação fora da modalidade','Natureza da operação: cartão empresarial'],
  ['11 — valor divergente','Valor/saldo de referência: valor não comprovado'],
  ['12 — informação contraditória','Situação em 31/05/2026: não; inadimplência informada em 15/04/2025'],
  ['13 — fonte não comprovada','Fonte/linha: não consta no dossiê'],
  ['14 — laudo sem cálculo','Laudo técnico: mede produtividade, mas não calcula renda bruta'],
  ['15 — operação posterior','Início da inadimplência/renegociação: data anterior à contratação'],
  ['16 — percentual limítrofe','redução da renda bruta agropecuária esperada: 29%'],
  ['17 — documento parcial','Laudo técnico: parcialmente apresentado'],
  ['18 — safra divergente','Nexo com a safra/atividade financiada: safra diferente da financiada'],
  ['19 — limite cumulativo ausente','Outras operações/limite cumulativo: não consta'],
  ['20 — prorrogação aplicável','Art. 4º — prorrogação de até 30 dias: aplicável; não requerida']
];

const cases=[];
for(let i=0;i<100;i++){
  const base=source.cases[i%source.cases.length];
  const [label,defect]=defects[i%defects.length];
  const field=defect.split(':')[0];
  const normalized=base.contract_text.replace(new RegExp(`^${field}:.*$`,'m'),defect);
  const marker=`\n\nTESTE SINTÉTICO ${String(i+1).padStart(3,'0')} — ${label}\n\nEsperado: o analisador deve identificar expressamente este problema, sem presumir documentos ausentes.`;
  const testNumber=i+41;
  cases.push({...base,external_test_id:`VEREDICTA-TEST-${String(testNumber).padStart(3,'0')}`,title:`Teste 100 — Caso ${String(i+1).padStart(3,'0')} — ${label}`,contract_text:normalized+marker});
}
const output={environment:'test',batch_id:'VEREDICTA-BATERIA-100-V1',cases};
fs.writeFileSync(new URL('../VEREDICTA_100_CASOS_IMPORT.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(`Gerados ${cases.length} casos em VEREDICTA_100_CASOS_IMPORT.json`);
