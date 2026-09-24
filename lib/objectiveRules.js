// Motor determinístico dos requisitos objetivos da MP 1.376/2026.
// A IA extrai fatos e interpreta questões semânticas; este módulo calcula
// apenas aquilo que pode ser decidido por regras explícitas.

const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;

function num(v){
  if(v===null||v===undefined||v==='') return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}
function date(v){
  const s=String(v||'').slice(0,10);
  return ISO_DATE.test(s)?s:null;
}
function bool(v){ return typeof v==='boolean'?v:null; }
function inRange(v,min,max){ return v!==null && v>=min && v<=max; }
function onOrBefore(v,max){ return Boolean(v&&v<=max); }
function onOrAfter(v,min){ return Boolean(v&&v>=min); }
function tri(test,reasonTrue,reasonFalse,reasonUnknown){
  if(test===null||test===undefined) return {result:'indeterminado',reason:reasonUnknown};
  return test?{result:'atende',reason:reasonTrue}:{result:'nao_atende',reason:reasonFalse};
}

export function normalizeObjectiveFacts(raw={}){
  return {
    beneficiary_type:String(raw.beneficiary_type||'').trim().toLowerCase()||null,
    program:String(raw.program||'').trim().toLowerCase()||null,
    debt_type:String(raw.debt_type||'').trim().toLowerCase()||null,
    operation_contract_date:date(raw.operation_contract_date),
    renegotiated_or_extended:bool(raw.renegotiated_or_extended),
    compliant_on_composition_date:bool(raw.compliant_on_composition_date),
    default_start_date:date(raw.default_start_date),
    remained_in_default_on_2026_05_31:bool(raw.remained_in_default_on_2026_05_31),
    installment_due_date:date(raw.installment_due_date),
    loss_harvest_count:num(raw.loss_harvest_count),
    loss_years:Array.isArray(raw.loss_years)?raw.loss_years.map(num).filter(Number.isFinite):[],
    income_reduction_pct:num(raw.income_reduction_pct),
    extreme_climate_event:bool(raw.extreme_climate_event),
    technical_report_present:bool(raw.technical_report_present),
    debt_amount_brl:num(raw.debt_amount_brl),
    already_paid_or_indemnified_brl:num(raw.already_paid_or_indemnified_brl),
    constitutional_fund:bool(raw.constitutional_fund),
    funcafe:bool(raw.funcafe),
    social_fund:bool(raw.social_fund),
    mp1314_resource:bool(raw.mp1314_resource),
    active_federal_debt:bool(raw.active_federal_debt),
    cpr:bool(raw.cpr),
    judicial_proceeding_active:bool(raw.judicial_proceeding_active)
  };
}

export function evaluateObjectiveRules(raw={}){
  const f=normalizeObjectiveFacts(raw);
  const checks={};

  const harvestWindow=f.loss_years.length
    ? f.loss_years.every(y=>inRange(y,2019,2025))
    : null;

  checks.general_loss_harvests=tri(
    f.loss_harvest_count===null?null:f.loss_harvest_count>=2,
    'Há pelo menos 2 safras com perda.','Há menos de 2 safras com perda.','Número de safras com perda não informado.'
  );
  checks.general_income_reduction=tri(
    f.income_reduction_pct===null?null:f.income_reduction_pct>=30,
    'Redução de renda é de pelo menos 30%.','Redução de renda é inferior a 30%.','Percentual de redução de renda não informado.'
  );
  checks.loss_year_window=tri(
    harvestWindow,
    'As safras informadas estão entre 2019 e 2025.','Há safra fora da janela 2019–2025.','Anos das safras não informados.'
  );
  checks.exceptional_loss_harvests=tri(
    f.loss_harvest_count===null?null:f.loss_harvest_count>=3,
    'Há pelo menos 3 safras com perda.','Há menos de 3 safras com perda.','Número de safras com perda não informado.'
  );
  checks.exceptional_income_reduction=tri(
    f.income_reduction_pct===null?null:f.income_reduction_pct>=40,
    'Redução de renda é de pelo menos 40%.','Redução de renda é inferior a 40%.','Percentual de redução de renda não informado.'
  );
  checks.exceptional_climate_event=tri(
    f.extreme_climate_event,
    'Evento climático extremo foi identificado.','Evento climático extremo não foi identificado.','Não há dado estruturado sobre evento climático extremo.'
  );
  checks.technical_report_present=tri(
    f.technical_report_present,
    'Laudo técnico está presente.','Laudo técnico não está presente.','Presença de laudo técnico não informada.'
  );

  const debtType=f.debt_type;
  const isFlow=['custeio','comercializacao','industrializacao'].includes(debtType);
  const isInvestment=debtType==='investimento';
  checks.operation_contracted_by_2025_12_31=tri(
    f.operation_contract_date?onOrBefore(f.operation_contract_date,'2025-12-31'):null,
    'Operação foi contratada até 31/12/2025.','Operação foi contratada após 31/12/2025.','Data de contratação não informada.'
  );
  checks.default_from_2024_01_01=tri(
    f.default_start_date?onOrAfter(f.default_start_date,'2024-01-01'):null,
    'Inadimplência iniciou em ou após 01/01/2024.','Inadimplência iniciou antes de 01/01/2024.','Data de início da inadimplência não informada.'
  );
  checks.default_on_2026_05_31=tri(
    f.remained_in_default_on_2026_05_31,
    'Operação permaneceu inadimplente em 31/05/2026.','Operação não permaneceu inadimplente em 31/05/2026.','Situação em 31/05/2026 não informada.'
  );
  checks.investment_due_window=tri(
    isInvestment&&f.installment_due_date?inRange(f.installment_due_date,'2024-01-01','2026-12-31'):isInvestment?null:false,
    'Parcela de investimento vence na janela objetiva.','A parcela não é de investimento ou está fora da janela objetiva.','Vencimento da parcela de investimento não informado.'
  );
  checks.article1_II_candidate={
    result:isFlow && checks.operation_contracted_by_2025_12_31.result==='atende' &&
      checks.default_from_2024_01_01.result==='atende' && checks.default_on_2026_05_31.result==='atende'
      ?'atende'
      : [checks.operation_contracted_by_2025_12_31,checks.default_from_2024_01_01,checks.default_on_2026_05_31].some(x=>x.result==='indeterminado')
        ?'indeterminado':'nao_atende',
    reason:'Cálculo composto do art. 1º, II, a partir de tipo, data de contratação e inadimplência.'
  };

  checks.social_fund_exclusion=tri(
    f.social_fund===null?null:!f.social_fund,
    'Não foi indicada origem no Fundo Social.','Foi indicada origem no Fundo Social.','Origem no Fundo Social não informada.'
  );
  checks.federal_debt_exclusion=tri(
    f.active_federal_debt===null?null:!f.active_federal_debt,
    'Não foi indicado encaminhamento à Dívida Ativa da União.','Foi indicado encaminhamento à Dívida Ativa da União.','Situação perante a Dívida Ativa da União não informada.'
  );

  const program=f.program;
  let baseLimit=null;
  if(program==='pronaf') baseLimit=400000;
  else if(program==='pronamp') baseLimit=2000000;
  else if(program) baseLimit=4000000;
  checks.base_credit_limit={
    result:f.debt_amount_brl===null||baseLimit===null?'indeterminado':f.debt_amount_brl<=baseLimit?'atende':'excede',
    limit_brl:baseLimit,
    amount_brl:f.debt_amount_brl,
    reason:baseLimit===null?'Programa/categoria não estruturado para cálculo do teto.':'Comparação matemática entre valor informado e teto-base da categoria.'
  };

  const generalEligible=['general_loss_harvests','general_income_reduction','loss_year_window']
    .every(k=>checks[k].result==='atende');
  const generalUnknown=['general_loss_harvests','general_income_reduction','loss_year_window']
    .some(k=>checks[k].result==='indeterminado');
  const exceptionalEligible=['exceptional_loss_harvests','exceptional_income_reduction','loss_year_window','exceptional_climate_event']
    .every(k=>checks[k].result==='atende');
  const exceptionalUnknown=['exceptional_loss_harvests','exceptional_income_reduction','loss_year_window','exceptional_climate_event']
    .some(k=>checks[k].result==='indeterminado');

  return {
    engine_version:'OBJECTIVE-RULES-1.0.0',
    facts:f,
    checks,
    derived:{
      general_loss_threshold:generalEligible?'atende':generalUnknown?'indeterminado':'nao_atende',
      exceptional_loss_threshold:exceptionalEligible?'atende':exceptionalUnknown?'indeterminado':'nao_atende'
    },
    policy:'Resultados deste motor são determinísticos. A IA pode interpretar fatos e consequências jurídicas, mas não pode contradizer cálculos objetivos sem apontar erro nos fatos de entrada.'
  };
}
