import crypto from 'node:crypto';

export const TRAINING_MAX_ROUNDS = 400;
export const TRAINING_ROUND_SIZE = 100;
export const TRAINING_DISTRIBUTION = Object.freeze({
  'enquadrável': 25,
  'parcialmente enquadrável': 25,
  'não enquadrável': 25,
  'inconclusivo': 25
});

function seedToUint32(seed){
  const hex=crypto.createHash('sha256').update(String(seed)).digest('hex').slice(0,8);
  return Number.parseInt(hex,16)>>>0;
}

export function seededRandom(seed){
  let a=seedToUint32(seed)||0x9e3779b9;
  return function rand(){
    a|=0; a=(a+0x6D2B79F5)|0;
    let t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

function pick(rand,arr){return arr[Math.floor(rand()*arr.length)];}
function int(rand,min,max){return Math.floor(rand()*(max-min+1))+min;}
function money(v){return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function dateYmd(y,m,d){return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;}
function syntheticParty(n){return `DEVEDOR-TESTE-${String(n).padStart(6,'0')}`;}

function shuffle(rand,arr){
  const out=[...arr];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}

function expectedPoints(classification,facts){
  const base={};
  for(let i=1;i<=15;i++)base[String(i)]={legal_result:'atende'};
  if(classification==='enquadrável'){
    base['6']={legal_result:facts.hasInsurance?'nao_aplicavel':'atende'};
    base['12']={legal_result:facts.hasJudicialAction?'nao_atende':'nao_aplicavel'};
  }else if(classification==='parcialmente enquadrável'){
    base['4']={legal_result:'inconclusivo'};
    base['6']={legal_result:facts.hasInsurance?'inconclusivo':'atende'};
    base['9']={legal_result:'nao_atende'};
    base['13']={legal_result:'inconclusivo'};
  }else if(classification==='não enquadrável'){
    base['1']={legal_result:'nao_atende'};
    base['2']={legal_result:'nao_atende'};
    base['3']={legal_result:'nao_atende'};
    base['5']={legal_result:'nao_atende'};
    base['10']={legal_result:'nao_atende'};
  }else{
    for(const n of ['1','2','3','4','5','6','8','9','10','11','13','14','15'])base[n]={legal_result:'inconclusivo'};
    base['7']={legal_result:'atende'};
    base['12']={legal_result:'nao_aplicavel'};
  }
  return base;
}

function generateFacts(rand,classification){
  const cultures=['soja','milho','café','feijão','algodão','trigo','sorgo'];
  const cities=['Rio Verde/GO','Uberaba/MG','Patrocínio/MG','Sorriso/MT','Cascavel/PR','Barreiras/BA','Unaí/MG'];
  const modalities=['custeio agrícola','investimento rural','comercialização','renegociação de crédito rural'];
  const sources=['recursos obrigatórios','poupança rural','recursos livres com finalidade rural','fundos constitucionais'];
  const baseYear=2024+int(rand,0,2);
  const amount=int(rand,80,2400)*1000;
  const loss=int(rand,20,85);
  const seedNonce=int(rand,100000,999999);
  const common={
    clientName:syntheticParty(seedNonce),culture:pick(rand,cultures),city:pick(rand,cities),modality:pick(rand,modalities),source:pick(rand,sources),
    amount,lossPercent:loss,safra:`${baseYear}/${baseYear+1}`,hasInsurance:rand()<0.35,hasJudicialAction:rand()<0.18,
    hasDau:rand()<0.12,guarantee:pick(rand,['penhor rural','hipoteca','aval','alienação fiduciária de máquinas']),
    seedNonce
  };
  if(classification==='enquadrável')return {...common,contractDate:dateYmd(2025,int(rand,1,9),int(rand,1,25)),eligibleRural:true,lossPercent:int(rand,45,80),causalNexus:true,docsComplete:true,formalizationTimely:true,hasDau:false,hasJudicialAction:false,indemnity:false};
  if(classification==='parcialmente enquadrável')return {...common,contractDate:dateYmd(2025,int(rand,1,11),int(rand,1,25)),eligibleRural:true,lossPercent:int(rand,35,70),causalNexus:true,docsComplete:false,formalizationTimely:rand()<0.5,hasDau:false,indemnity:common.hasInsurance&&rand()<0.5};
  if(classification==='não enquadrável')return {...common,contractDate:dateYmd(2026,int(rand,7,12),int(rand,1,25)),eligibleRural:rand()<0.3,lossPercent:int(rand,5,24),causalNexus:false,docsComplete:true,formalizationTimely:false,hasDau:true,indemnity:common.hasInsurance};
  return {...common,contractDate:null,eligibleRural:null,lossPercent:null,causalNexus:null,docsComplete:false,formalizationTimely:null,hasDau:null,indemnity:null,source:null};
}

function contractFromFacts(f,classification){
  const missing=classification==='inconclusivo';
  const docs=missing
    ? 'O dossiê não informa de modo verificável a data original da operação, a origem dos recursos, o percentual de perda nem apresenta laudo conclusivo de nexo causal.'
    : `A operação foi formalizada em ${f.contractDate}, na modalidade ${f.modality}, no valor de ${money(f.amount)}, com origem declarada em ${f.source}.`;
  const loss=missing
    ? 'Há alegação genérica de quebra de safra, sem percentual quantificado e sem documentação técnica suficiente.'
    : `A cultura financiada é ${f.culture}, safra ${f.safra}, no município de ${f.city}. O laudo registra perda de ${f.lossPercent}% e ${f.causalNexus?'confirma':'não confirma'} nexo causal entre o evento climático e a perda.`;
  const eligibility=missing
    ? 'Não consta documentação bastante para confirmar a natureza e a elegibilidade rural da operação.'
    : `A finalidade rural ${f.eligibleRural?'está comprovada pelos documentos de custeio/produção':'não está comprovada; os documentos indicam destinação incompatível com a finalidade rural elegível'}.`;
  const insurance=`Seguro/Proagro: ${f.hasInsurance?'há cobertura declarada':'não há cobertura declarada'}. Indenização: ${f.indemnity===null?'não consta':f.indemnity?'houve pagamento relacionado à perda':'não houve pagamento relacionado à perda'}.`;
  const legal=`DAU: ${f.hasDau===null?'não consta':f.hasDau?'há inscrição informada':'não há inscrição informada'}. Processo judicial: ${f.hasJudicialAction?'há demanda judicial relacionada à obrigação':'não há demanda judicial informada'}. Garantia: ${f.guarantee}.`;
  const formal=missing?'O prazo e a data de formalização da renegociação não constam do dossiê.':`A formalização da renegociação ${f.formalizationTimely?'ocorreu dentro do prazo documentado':'ocorreu fora do prazo documentado'}.`;
  return [
    'INSTRUMENTO SINTÉTICO DE CRÉDITO RURAL — DADOS FICTÍCIOS',
    `Parte sintética: ${f.clientName}.`,
    docs,loss,eligibility,insurance,legal,formal
  ].join('\n\n');
}

export function generateTrainingRound({runId,seed,round}){
  const roundSeed=`${seed}:round:${round}`;
  const rand=seededRandom(roundSeed);
  const classes=[];
  for(const [classification,count] of Object.entries(TRAINING_DISTRIBUTION))for(let i=0;i<count;i++)classes.push(classification);
  const generated=classes.map((classification,index)=>{
    const caseSeed=`${roundSeed}:case:${index}:${int(rand,1,1_000_000_000)}`;
    const caseRand=seededRandom(caseSeed);
    const facts=generateFacts(caseRand,classification);
    return {
      classification,
      facts,
      expected_points:expectedPoints(classification,facts),
      title:`Dossiê sintético ${crypto.createHash('sha256').update(caseSeed).digest('hex').slice(0,8).toUpperCase()}`,
      client_name:facts.clientName,
      contract_text:contractFromFacts(facts,classification),
      generation_seed:caseSeed
    };
  });
  const shuffled=shuffle(rand,generated).map((x,i)=>({...x,order_index:i+1}));
  return {run_id:runId,round,seed:roundSeed,cases:shuffled,distribution:{...TRAINING_DISTRIBUTION}};
}

export function compareTrainingResult(expected,analysis){
  const classification=analysis?.final_classification||analysis?.analyst_json?.final_classification||null;
  const points=analysis?.analyst_json?.points||analysis?.analyst?.points||[];
  const expectedPoints=expected?.expected_points||{};
  const pointDiffs=Object.entries(expectedPoints).map(([point,want])=>{
    const got=points.find(p=>String(p.point)===String(point));
    return {point:Number(point),expected:want.legal_result,actual:got?.legal_result||null,ok:got?.legal_result===want.legal_result};
  });
  const classificationOk=classification===expected.expected_classification;
  return {correct:classificationOk&&pointDiffs.every(x=>x.ok),classification_ok:classificationOk,expected_classification:expected.expected_classification,actual_classification:classification,point_diffs:pointDiffs};
}
