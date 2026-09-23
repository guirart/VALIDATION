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
function unknown(v){return v===null||v===undefined;}

function shuffle(rand,arr){
  const out=[...arr];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}

// Gabarito jurídico independente do texto produzido pelo agente.
// A classificação é derivada dos fatos estruturados do gerador, não do nome/título do caso.
export function deriveLegalClassification(f){
  // Impedimentos objetivos prevalecem quando estão expressamente comprovados.
  if(f.hasDau===true||f.indemnity==='full'||f.within120Days===false||f.debtEligible===false||f.eligibleRural===false)return 'não enquadrável';
  if(!unknown(f.safraCount)&&f.safraCount<2)return 'não enquadrável';
  if(!unknown(f.lossPercent)&&f.lossPercent<30)return 'não enquadrável';
  if(f.causalNexus===false||f.laudoComplete===false)return 'não enquadrável';

  // Se algum requisito central não puder ser aferido, o resultado é inconclusivo.
  const essentials=[f.eligibleRural,f.safraCount,f.lossPercent,f.causalNexus,f.laudoComplete,f.debtEligible,f.hasDau,f.indemnity,f.within120Days];
  if(essentials.some(unknown))return 'inconclusivo';

  const general=f.eligibleRural&&f.safraCount>=2&&f.lossPercent>=30&&f.causalNexus&&f.laudoComplete&&f.debtEligible&&!f.hasDau&&f.indemnity!=='full'&&f.within120Days;
  if(!general)return 'não enquadrável';

  // Core jurídico atendido, mas documentação operacional secundária incompleta.
  if(!f.docsComplete||f.totalDebtKnown!==true||f.guaranteeReviewKnown!==true)return 'parcialmente enquadrável';
  return 'enquadrável';
}

function expectedPoints(facts){
  const out={};
  const set=(point,legal_result)=>{out[String(point)]={legal_result};};

  // 1. Natureza/elegibilidade rural do instrumento.
  if(unknown(facts.eligibleRural))set(1,'inconclusivo');
  else set(1,facts.eligibleRural?'atende':'nao_atende');

  // 2. Filtro geral cumulativo do art. 1º, §1º.
  const generalInputs=[facts.eligibleRural,facts.safraCount,facts.lossPercent,facts.causalNexus,facts.laudoComplete,facts.debtEligible];
  if(generalInputs.some(unknown))set(2,'inconclusivo');
  else if(!facts.eligibleRural||facts.safraCount<2||facts.lossPercent<30||!facts.causalNexus||!facts.laudoComplete||!facts.debtEligible)set(2,'nao_atende');
  else set(2,'atende');

  // 3. Modalidade excepcional do §7º: 3+ safras, 40%+, evento climático extremo e laudo.
  const exceptionalInputs=[facts.eligibleRural,facts.safraCount,facts.lossPercent,facts.causalNexus,facts.climateExtreme,facts.laudoComplete];
  if(exceptionalInputs.some(unknown))set(3,'inconclusivo');
  else if(!facts.eligibleRural||facts.safraCount<3||facts.lossPercent<40||!facts.causalNexus||!facts.climateExtreme||!facts.laudoComplete)set(3,'nao_atende');
  else set(3,'atende');

  // 4. Escopo da dívida: categoria, data e situação de renegociação/inadimplência.
  if(unknown(facts.debtEligible))set(4,'inconclusivo');
  else set(4,facts.debtEligible?'atende':'nao_atende');

  // 5. A MP não cria obrigação automática de o banco contratar.
  set(5,'atende');

  // 6. Processo ativo não reprova o enquadramento: exige apenas não presumir suspensão automática.
  if(unknown(facts.hasJudicialAction))set(6,'inconclusivo');
  else set(6,facts.hasJudicialAction?'atende':'nao_aplicavel');

  // 7. Art. 4º: a redação legal exige operação ADIMPLENTE em 14/07/2026, vencimento na janela e pedido da linha.
  if(unknown(facts.art4Applicable))set(7,'inconclusivo');
  else if(facts.art4Applicable===false)set(7,'nao_aplicavel');
  else if([facts.art4AdimplenteOnJul14,facts.art4DueWithin30,facts.art4RequestedLine].some(unknown))set(7,'inconclusivo');
  else set(7,(facts.art4AdimplenteOnJul14&&facts.art4DueWithin30&&facts.art4RequestedLine)?'atende':'nao_atende');

  // 8. Laudo técnico: evento/safras/renda esperada x obtida/percentual/nexo.
  if(unknown(facts.laudoComplete))set(8,'inconclusivo');
  else set(8,facts.laudoComplete?'atende':'nao_atende');

  // 9. Independência técnica é requisito de método do relatório, não um defeito do dossiê.
  set(9,'atende');

  // 10. Limites são cumulativos por mutuário em todas as instituições.
  if(unknown(facts.totalDebtKnown))set(10,'inconclusivo');
  else if(!facts.totalDebtKnown)set(10,'inconclusivo');
  else set(10,facts.withinCreditLimit?'atende':'nao_atende');

  // 11. Art. 2º só é aplicável se houver excedente acima dos limites do art. 1º.
  if(unknown(facts.art2Needed))set(11,'inconclusivo');
  else set(11,facts.art2Needed?'atende':'nao_aplicavel');

  // 12. Garantias/novação: exige revisão da nova minuta; garantia antiga isolada não basta.
  if(unknown(facts.guaranteeReviewKnown))set(12,'inconclusivo');
  else set(12,facts.guaranteeReviewKnown?'atende':'inconclusivo');

  // 13. Valores integralmente indenizados não retornam para a linha.
  if(unknown(facts.indemnity))set(13,'inconclusivo');
  else set(13,facts.indemnity==='full'?'nao_atende':'atende');

  // 14. DAU é impedimento expresso do art. 1º, §9º.
  if(unknown(facts.hasDau))set(14,'inconclusivo');
  else set(14,facts.hasDau?'nao_atende':'atende');

  // 15. Prazo de contratação de 120 dias da MP, distinto do prazo constitucional de vigência.
  if(unknown(facts.within120Days))set(15,'inconclusivo');
  else set(15,facts.within120Days?'atende':'nao_atende');

  return out;
}

function generateFacts(rand,targetClassification){
  const cultures=['soja','milho','café','feijão','algodão','trigo','sorgo'];
  const cities=['Rio Verde/GO','Uberaba/MG','Patrocínio/MG','Sorriso/MT','Cascavel/PR','Barreiras/BA','Unaí/MG'];
  const modalities=['custeio agrícola','comercialização','industrialização'];
  const sources=['recursos obrigatórios','poupança rural','recursos livres com finalidade rural','fundos constitucionais'];
  const seedNonce=int(rand,100000,999999);
  const common={
    clientName:syntheticParty(seedNonce),culture:pick(rand,cultures),city:pick(rand,cities),modality:pick(rand,modalities),source:pick(rand,sources),
    amount:int(rand,80,2400)*1000,seedNonce,guarantee:pick(rand,['penhor rural','hipoteca','aval','alienação fiduciária de máquinas'])
  };

  if(targetClassification==='enquadrável'){
    const safraCount=rand()<0.35?3:2;
    return {...common,
      contractDate:dateYmd(2025,int(rand,1,10),int(rand,1,25)),eligibleRural:true,debtEligible:true,
      safraCount,lossPercent:int(rand,safraCount>=3?40:30,75),causalNexus:true,climateExtreme:true,laudoComplete:true,
      docsComplete:true,hasInsurance:rand()<0.35,indemnity:'none',hasDau:false,hasJudicialAction:rand()<0.2,
      within120Days:true,totalDebtKnown:true,withinCreditLimit:true,art2Needed:false,guaranteeReviewKnown:true,
      art4Applicable:false,art4AdimplenteOnJul14:null,art4DueWithin30:null,art4RequestedLine:null
    };
  }

  if(targetClassification==='parcialmente enquadrável'){
    return {...common,
      contractDate:dateYmd(2025,int(rand,1,10),int(rand,1,25)),eligibleRural:true,debtEligible:true,
      safraCount:2,lossPercent:int(rand,30,65),causalNexus:true,climateExtreme:true,laudoComplete:true,
      docsComplete:false,hasInsurance:rand()<0.35,indemnity:'none',hasDau:false,hasJudicialAction:rand()<0.35,
      within120Days:true,totalDebtKnown:false,withinCreditLimit:null,art2Needed:null,guaranteeReviewKnown:false,
      art4Applicable:false,art4AdimplenteOnJul14:null,art4DueWithin30:null,art4RequestedLine:null
    };
  }

  if(targetClassification==='não enquadrável'){
    return {...common,
      contractDate:dateYmd(2026,int(rand,7,12),int(rand,1,25)),eligibleRural:true,debtEligible:false,
      safraCount:1,lossPercent:int(rand,5,24),causalNexus:false,climateExtreme:false,laudoComplete:true,
      docsComplete:true,hasInsurance:true,indemnity:'full',hasDau:true,hasJudicialAction:rand()<0.25,
      within120Days:false,totalDebtKnown:true,withinCreditLimit:true,art2Needed:false,guaranteeReviewKnown:true,
      art4Applicable:false,art4AdimplenteOnJul14:null,art4DueWithin30:null,art4RequestedLine:null
    };
  }

  return {...common,
    contractDate:null,eligibleRural:null,debtEligible:null,safraCount:null,lossPercent:null,causalNexus:null,climateExtreme:null,laudoComplete:null,
    docsComplete:false,hasInsurance:null,indemnity:null,hasDau:null,hasJudicialAction:null,within120Days:null,totalDebtKnown:null,withinCreditLimit:null,
    art2Needed:null,guaranteeReviewKnown:null,art4Applicable:null,art4AdimplenteOnJul14:null,art4DueWithin30:null,art4RequestedLine:null,source:null
  };
}

function contractFromFacts(f,classification){
  const missing=classification==='inconclusivo';
  if(missing){
    return [
      'INSTRUMENTO SINTÉTICO DE CRÉDITO RURAL — DADOS FICTÍCIOS',
      `Parte sintética: ${f.clientName}.`,
      'Há referência genérica a crédito rural, mas não consta documentação bastante para confirmar a data original, a modalidade elegível, a origem dos recursos ou a situação de renegociação/inadimplência da operação.',
      'Há alegação de perda de safra, porém não constam número de safras, percentual mensurável, renda bruta esperada e obtida, evento causal ou laudo técnico conclusivo.',
      'Seguro/Proagro, indenização, DAU e processo judicial: não constam de forma verificável.',
      `Garantia indicada de forma isolada: ${f.guarantee}. Não há minuta da nova operação nem quadro consolidado das demais dívidas.`,
      'Não constam dados suficientes para verificar o prazo de 120 dias nem eventual hipótese do art. 4º.'
    ].join('\n\n');
  }

  const safraText=f.safraCount===1?'uma safra':`${f.safraCount} safras`;
  const debtText=f.debtEligible
    ? 'A operação se enquadra em uma das categorias do art. 1º e os marcos documentais de renegociação/inadimplência exigidos para a categoria estão comprovados.'
    : 'A operação não se enquadra nos marcos temporais e de situação da dívida exigidos pelo art. 1º.';
  const laudoText=f.laudoComplete
    ? `Laudo emitido por profissional habilitado registra perda de ${f.lossPercent}% em ${safraText}, informa renda bruta esperada e efetivamente obtida e confirma nexo causal com ${f.climateExtreme?'evento climático extremo':'evento relacionado à atividade financiada'}.`
    : `O documento técnico menciona perda de ${f.lossPercent}% em ${safraText}, mas não contém todos os elementos necessários de renda bruta e nexo.`;
  const totals=f.totalDebtKnown
    ? `O quadro consolidado das dívidas do mutuário em todas as instituições foi apresentado e o total ${f.withinCreditLimit?'permanece dentro':'ultrapassa'} do limite aplicável.`
    : 'Não foi apresentada relação completa das demais dívidas do mutuário, impedindo conferir os limites cumulativos por todas as instituições.';
  const guarantees=f.guaranteeReviewKnown
    ? `Garantia atual: ${f.guarantee}. A minuta da nova operação foi disponibilizada para revisão de garantias, novação e renúncias.`
    : `Garantia atual: ${f.guarantee}. A minuta da nova operação não foi disponibilizada para revisão de novação, renúncias ou reforço de garantia.`;
  const art4=f.art4Applicable
    ? `Art. 4º: operação ${f.art4AdimplenteOnJul14?'adimplente':'não adimplente'} em 14/07/2026; ${f.art4DueWithin30?'há':'não há'} vencimento em até 30 dias da publicação; ${f.art4RequestedLine?'houve':'não houve'} pedido de contratação da nova linha.`
    : 'Art. 4º: não há parcela indicada como inserida na janela específica de prorrogação de até 30 dias.';
  return [
    'INSTRUMENTO SINTÉTICO DE CRÉDITO RURAL — DADOS FICTÍCIOS',
    `Parte sintética: ${f.clientName}.`,
    `A operação foi formalizada em ${f.contractDate}, na modalidade ${f.modality}, no valor de ${money(f.amount)}, com origem declarada em ${f.source}.`,
    `A finalidade rural ${f.eligibleRural?'está comprovada':'não está comprovada'}. ${debtText}`,
    laudoText,
    `Seguro/Proagro: ${f.hasInsurance?'há cobertura declarada':'não há cobertura declarada'}. Indenização: ${f.indemnity==='full'?'houve pagamento integral da perda objeto do pedido':'não houve pagamento relacionado à perda objeto do pedido'}.`,
    `DAU: ${f.hasDau?'há inscrição informada':'não há inscrição informada'}. Processo judicial: ${f.hasJudicialAction?'há demanda judicial relacionada à obrigação':'não há demanda judicial informada'}.`,
    totals,
    guarantees,
    `Prazo de 120 dias: ${f.within120Days?'o pedido e a contratação estão documentados dentro da janela legal':'a contratação ocorreu fora da janela legal'}.`,
    art4
  ].join('\n\n');
}

export function generateTrainingRound({runId,seed,round}){
  const roundSeed=`${seed}:round:${round}`;
  const rand=seededRandom(roundSeed);
  const targets=[];
  for(const [classification,count] of Object.entries(TRAINING_DISTRIBUTION))for(let i=0;i<count;i++)targets.push(classification);
  const generated=targets.map((targetClassification,index)=>{
    const caseSeed=`${roundSeed}:case:${index}:${int(rand,1,1_000_000_000)}`;
    const caseRand=seededRandom(caseSeed);
    const facts=generateFacts(caseRand,targetClassification);
    const expectedClassification=deriveLegalClassification(facts);
    if(expectedClassification!==targetClassification)throw new Error(`training oracle mismatch: target=${targetClassification} derived=${expectedClassification}`);
    return {
      classification:expectedClassification,
      facts,
      expected_points:expectedPoints(facts),
      title:`${facts.clientName} — ${facts.culture}${facts.city?` — ${facts.city}`:''}`,
      client_name:facts.clientName,
      contract_text:contractFromFacts(facts,expectedClassification),
      generation_seed:caseSeed
    };
  });
  const shuffled=shuffle(rand,generated).map((x,i)=>({...x,order_index:i+1}));
  return {run_id:runId,round,seed:roundSeed,cases:shuffled,distribution:{...TRAINING_DISTRIBUTION}};
}

export function compareTrainingResult(expected,analysis){
  const classification=analysis?.final_classification||analysis?.analyst_json?.final_classification||null;
  const points=analysis?.analyst_json?.points||analysis?.analyst?.points||[];
  const expectedPointsMap=expected?.expected_points||{};
  const pointDiffs=Object.entries(expectedPointsMap).map(([point,want])=>{
    const got=points.find(p=>String(p.point)===String(point));
    return {point:Number(point),expected:want.legal_result,actual:got?.legal_result||null,ok:got?.legal_result===want.legal_result};
  });
  const classificationOk=classification===expected.expected_classification;
  return {
    correct:classificationOk&&pointDiffs.every(x=>x.ok),
    classification_ok:classificationOk,
    expected_classification:expected.expected_classification,
    actual_classification:classification,
    point_diffs:pointDiffs
  };
}
