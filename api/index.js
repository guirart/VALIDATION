import crypto from 'node:crypto';
import { json, readJson, makeSessionCookie, clearSessionCookie, isAuthenticated, requireAuth } from '../lib/http.js';
import { requireActionAuth } from '../lib/actionAuth.js';
import { db, supabaseConfigStatus } from '../lib/supabase.js';
import { verifyAnalysis, FINAL_CLASSES, mpText, memoText } from '../lib/legal.js';

const ALLOWED_STATUS = new Set(['pendente','em-analise','aguardando-revisao','requer-correcao','concluido','erro']);
const AUDIT_RECOMMENDATIONS = new Set(['liberar','corrigir','escalar para revisão humana aprofundada']);
const AUDIT_STATUSES = new Set(['confirmado','divergente','não encontrado','opinião sem precedente']);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const APP_VERSION = '3.0.0';
const VALIDATOR_VERSION = '3.0.0';

function stageLog(stage, meta={}) {
  try {
    console.log(JSON.stringify({
      scope:'gpt-analysis',
      stage,
      ...meta
    }));
  } catch {
    console.log(`[gpt-analysis] ${stage}`);
  }
}

function badRequest(res, stage, error, extra={}) {
  stageLog('REQUEST_REJECTED', { stage, error });
  return json(res,400,{
    ok:false,
    stage,
    error,
    app_version:APP_VERSION,
    validator_version:VALIDATOR_VERSION,
    ...extra
  });
}


function classifyValidationError(message) {
  const m = String(message || '');
  const pointMatch = m.match(/ponto\s+(\d+)/i);
  const point = pointMatch ? Number(pointMatch[1]) : null;

  let category = 'other';
  if (/citação da MP/i.test(m)) category = 'citation_mp';
  else if (/citação do contrato/i.test(m)) category = 'citation_contract';
  else if (/evidence_status|evidência/i.test(m)) category = 'evidence';
  else if (/legal_result|contradiz|não pode ser|coerência/i.test(m)) category = 'consistency';
  else if (/auditoria|finding/i.test(m)) category = 'audit';
  else if (/classificação/i.test(m)) category = 'classification';
  else if (/points|ponto .*ausente|duplicado|número de ponto|veredito inválido|referência legal|título ausente|raciocínio ausente/i.test(m)) category = 'schema';

  const correctable = ['schema','citation_mp','citation_contract','evidence','consistency','audit','classification'].includes(category);

  return { category, point, message: m, correctable };
}


function action(req) {
  return String(req.query?.action || '').trim();
}

function verifyAudit(audit, analyst) {
  const errors = [];
  if (!audit || typeof audit !== 'object') return { valid:false, errors:['auditoria ausente'], allConfirmed:false, classificationsMatch:false };

  if (!AUDIT_RECOMMENDATIONS.has(audit.recommendation)) errors.push('recomendação de auditoria inválida');
  if (!FINAL_CLASSES.has(audit.final_classification)) errors.push('classificação final da auditoria inválida');

  const findings = Array.isArray(audit.findings) ? audit.findings : [];
  if (!Array.isArray(audit.findings)) errors.push('findings da auditoria ausente');
  if (findings.length !== 15) errors.push(`auditoria deve conter 15 findings; recebidos ${findings.length}`);

  const seen = new Set();
  for (const f of findings) {
    const point = Number(f.point);
    if (!Number.isInteger(point) || point < 1 || point > 15) errors.push(`número de ponto inválido na auditoria: ${f.point}`);
    if (seen.has(point)) errors.push(`ponto ${point} duplicado na auditoria`);
    seen.add(point);
    if (!AUDIT_STATUSES.has(f.status)) errors.push(`status de auditoria inválido no ponto ${point}`);
    if (!String(f.reason || '').trim()) errors.push(`fundamentação ausente na auditoria do ponto ${point}`);
  }
  for (let n=1;n<=15;n++) if(!seen.has(n)) errors.push(`ponto ${n} ausente na auditoria`);

  const allConfirmed = findings.length === 15 && findings.every(f => f.status === 'confirmado');
  const classificationsMatch = audit.final_classification === analyst.final_classification;

  if (audit.recommendation === 'liberar') {
    const notConfirmed = findings.filter(f => f.status !== 'confirmado').map(f => f.point);
    if (notConfirmed.length) errors.push(`auditoria não pode liberar com pontos não confirmados: ${notConfirmed.join(', ')}`);
    if (!classificationsMatch) errors.push('auditoria liberou com classificação divergente do analista');
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    allConfirmed,
    classificationsMatch
  };
}

async function auth(req,res) {
  if (req.method === 'GET') return json(res,200,{authenticated:isAuthenticated(req),passwordRequired:true});
  if (req.method === 'POST') {
    const {password=''} = await readJson(req);
    const expected = process.env.APP_PASSWORD || 'marcal2015';
    const a=Buffer.from(String(password)), b=Buffer.from(String(expected));
    const ok=expected && a.length===b.length && crypto.timingSafeEqual(a,b);
    if(!ok) return json(res,401,{error:'Senha inválida'});
    res.setHeader('Set-Cookie',makeSessionCookie());
    return json(res,200,{ok:true});
  }
  if(req.method==='DELETE') { res.setHeader('Set-Cookie',clearSessionCookie()); return json(res,200,{ok:true}); }
  return json(res,405,{error:'Método não permitido'});
}

async function cases(req,res) {
  // Endpoint do APP, protegido pela sessão interna.
  // O usuário autenticado pode cadastrar e consultar casos reais.
  if(!requireAuth(req,res)) return;

  if(req.method==='GET') {
    const id=String(req.query?.id||'').trim();
    if(id){
      const rows=await db(`cases?id=eq.${encodeURIComponent(id)}&select=*,analyses(*),reviews(*)&limit=1`);
      if(!rows.length)return json(res,404,{error:'Caso não encontrado'});
      return json(res,200,{case:rows[0]});
    }
    const rows=await db('cases?select=*,analyses(id,final_classification,quality_gate,auditor_recommendation,created_at)&order=created_at.desc');
    return json(res,200,{cases:rows});
  }

  if(req.method==='POST'){
    const body=await readJson(req);
    if(!body.title||!body.contract_text){
      return json(res,400,{error:'Título e texto do contrato são obrigatórios'});
    }

    const [row]=await db('cases',{
      method:'POST',
      body:JSON.stringify({
        title:String(body.title).slice(0,180),
        client_name:String(body.client_name||'').slice(0,180),
        contract_text:String(body.contract_text),
        status:'pendente'
      })
    });

    await db('audit_logs',{
      method:'POST',
      body:JSON.stringify({
        case_id:row.id,
        event_type:'case_created_in_app',
        payload:{title:row.title}
      })
    });

    return json(res,201,{case:row});
  }

  return json(res,405,{error:'Método não permitido'});
}

async function gptCases(req,res){
  // Endpoint da ACTION: somente leitura. O GPT nunca cria casos.
  if(!requireActionAuth(req,res))return;

  if(req.method==='GET'){
    const status=String(req.query?.status||'').trim();
    const filter=status&&ALLOWED_STATUS.has(status)
      ? `&status=eq.${encodeURIComponent(status)}`
      : '';

    const rows=await db(
      `cases?select=id,title,client_name,status,created_at,updated_at${filter}&order=created_at.desc&limit=50`
    );

    return json(res,200,{cases:rows});
  }

  return json(res,405,{
    error:'Criação ou alteração de casos pelo GPT não é permitida.'
  });
}

async function gptCase(req,res){
  if(!requireActionAuth(req,res))return; if(req.method!=='GET')return json(res,405,{error:'Método não permitido'});
  const id=String(req.query?.id||'').trim(); if(!id)return json(res,400,{error:'id obrigatório'});
  const rows=await db(`cases?id=eq.${encodeURIComponent(id)}&select=id,title,client_name,contract_text,status,created_at,updated_at&limit=1`); if(!rows.length)return json(res,404,{error:'Caso não encontrado'});
  await db(`cases?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status:'em-analise',updated_at:new Date().toISOString()})});
  await db('audit_logs',{method:'POST',body:JSON.stringify({case_id:id,event_type:'case_fetched_by_gpt_action',payload:{}})});
  return json(res,200,{
    case:{...rows[0],status:'em-analise'},
    contract_sha256:sha(rows[0].contract_text),
    app_version:APP_VERSION,
    validator_version:VALIDATOR_VERSION,
    legal_source_version:process.env.LEGAL_SOURCE_VERSION||null,
    memorandum_version:process.env.MEMORANDUM_VERSION||null
  });
}

async function gptAnalysis(req,res){
  stageLog('REQUEST_RECEIVED',{method:req.method});

  if(!requireActionAuth(req,res)){
    stageLog('AUTH_FAILED');
    return;
  }
  stageLog('AUTH_OK');

  if(req.method!=='POST'){
    stageLog('METHOD_REJECTED',{method:req.method});
    return json(res,405,{
      ok:false,
      stage:'method',
      error:'Método não permitido',
      app_version:APP_VERSION,
      validator_version:VALIDATOR_VERSION
    });
  }

  let body;
  try{
    body=await readJson(req);
  }catch(e){
    return badRequest(res,'body_parse','JSON inválido');
  }

  const receivedFields=Object.keys(body||{});
  stageLog('BODY_RECEIVED',{fields:receivedFields});

  const caseId=String(body?.case_id||'').trim();
  if(!caseId){
    return badRequest(res,'request_validation','case_id é obrigatório',{field:'case_id',received_fields:receivedFields});
  }
  if(!body?.source_contract_sha256){
    return badRequest(res,'request_validation','source_contract_sha256 é obrigatório',{field:'source_contract_sha256',received_fields:receivedFields});
  }
  if(!body?.analyst){
    return badRequest(res,'request_validation','analyst é obrigatório',{field:'analyst',received_fields:receivedFields});
  }
  if(!body?.audit){
    return badRequest(res,'request_validation','audit é obrigatório',{field:'audit',received_fields:receivedFields});
  }

  stageLog('REQUEST_FIELDS_OK',{case_id:caseId});

  const rows=await db(`cases?id=eq.${encodeURIComponent(caseId)}&select=*&limit=1`);
  if(!rows.length){
    stageLog('CASE_NOT_FOUND',{case_id:caseId});
    return json(res,404,{
      ok:false,
      stage:'case_lookup',
      error:'Caso não encontrado',
      case_id:caseId,
      app_version:APP_VERSION,
      validator_version:VALIDATOR_VERSION
    });
  }

  const c=rows[0];
  stageLog('CASE_FOUND',{case_id:caseId});

  const currentContractSha256=sha(c.contract_text);
  const suppliedContractSha256=String(body.source_contract_sha256||'').trim().toLowerCase();

  stageLog('HASH_PRESENT',{
    case_id:caseId,
    supplied_hash_length:suppliedContractSha256.length,
    current_hash_length:currentContractSha256.length
  });

  if(suppliedContractSha256 !== currentContractSha256){
    stageLog('HASH_MISMATCH',{case_id:caseId});

    await db('audit_logs',{
      method:'POST',
      body:JSON.stringify({
        case_id:caseId,
        event_type:'analysis_rejected_contract_hash_mismatch',
        payload:{
          app_version:APP_VERSION,
          validator_version:VALIDATOR_VERSION,
          supplied_hash_length:suppliedContractSha256.length,
          current_hash_length:currentContractSha256.length
        }
      })
    });

    return json(res,409,{
      ok:false,
      accepted:false,
      stage:'integrity_check',
      case_id:caseId,
      status:'requer-correcao',
      quality_gate:false,
      error:'A análise não corresponde ao dossiê atual do caso.',
      app_version:APP_VERSION,
      validator_version:VALIDATOR_VERSION,
      next_step:'Busque novamente o caso e refaça a análise com o contract_sha256 atual.'
    });
  }

  stageLog('HASH_MATCH',{case_id:caseId});

  const pointCount=Array.isArray(body.analyst?.points)?body.analyst.points.length:null;
  const findingCount=Array.isArray(body.audit?.findings)?body.audit.findings.length:null;
  stageLog('PAYLOAD_STRUCTURE',{
    case_id:caseId,
    analyst_points:pointCount,
    audit_findings:findingCount
  });

  const analystCheck=verifyAnalysis(body.analyst,c.contract_text);
  stageLog('ANALYST_VALIDATED',{
    case_id:caseId,
    valid:analystCheck.valid,
    error_count:analystCheck.errors.length
  });

  const auditCheck=verifyAudit(body.audit,analystCheck.analysis);
  stageLog('AUDIT_VALIDATED',{
    case_id:caseId,
    valid:auditCheck.valid,
    all_confirmed:auditCheck.allConfirmed,
    classifications_match:auditCheck.classificationsMatch,
    error_count:auditCheck.errors.length
  });

  const validationErrors=[...analystCheck.errors,...auditCheck.errors];
  const validationErrorDetails=validationErrors.map(classifyValidationError);
  const recommendation=body.audit.recommendation;
  const finalClassification=FINAL_CLASSES.has(body.audit.final_classification)
    ? body.audit.final_classification
    : analystCheck.analysis.final_classification;

  const qualityGate=
    analystCheck.valid &&
    auditCheck.valid &&
    auditCheck.allConfirmed &&
    auditCheck.classificationsMatch;

  const qualityGateReasons=[
    ...validationErrors,
    ...(!auditCheck.allConfirmed ? ['auditoria contém findings não confirmados'] : []),
    ...(!auditCheck.classificationsMatch ? ['classificação da auditoria diverge da classificação do analista'] : [])
  ];

  const failedPoints=[...new Set(validationErrorDetails.map(x=>x.point).filter(Boolean))];

  stageLog('QUALITY_GATE_EVALUATED',{
    case_id:caseId,
    quality_gate:qualityGate,
    failed_points:failedPoints,
    validation_error_count:validationErrors.length
  });

  const [analysisRow]=await db('analyses',{
    method:'POST',
    body:JSON.stringify({
      case_id:caseId,
      analyst_json:analystCheck.analysis,
      audit_json:body.audit,
      final_classification:finalClassification,
      quality_gate:qualityGate,
      auditor_recommendation:recommendation
    })
  });

  stageLog('ANALYSIS_SAVED',{
    case_id:caseId,
    analysis_id:analysisRow.id,
    quality_gate:qualityGate
  });

  const status=qualityGate?'aguardando-revisao':'requer-correcao';

  await db(`cases?id=eq.${encodeURIComponent(caseId)}`,{
    method:'PATCH',
    body:JSON.stringify({status})
  });

  await db('audit_logs',{
    method:'POST',
    body:JSON.stringify({
      case_id:caseId,
      analysis_id:analysisRow.id,
      event_type:'analysis_submitted',
      payload:{
        quality_gate:qualityGate,
        recommendation,
        validation_errors:validationErrors,
        validation_error_details:validationErrorDetails,
        quality_gate_reasons:qualityGateReasons,
        validation_debug:analystCheck.validation_debug,
        failed_points:failedPoints,
        contract_sha256:currentContractSha256,
        app_version:APP_VERSION,
        validator_version:VALIDATOR_VERSION
      }
    })
  });

  stageLog('REQUEST_COMPLETE',{
    case_id:caseId,
    analysis_id:analysisRow.id,
    status,
    quality_gate:qualityGate
  });

  return json(res,200,{
    ok:true,
    stage:'quality_gate',
    accepted:true,
    analysis_id:analysisRow.id,
    case_id:caseId,
    status,
    quality_gate:qualityGate,
    final_classification:finalClassification,
    auditor_recommendation:recommendation,
    validation_errors:validationErrors,
    validation_error_details:validationErrorDetails,
    quality_gate_reasons:qualityGateReasons,
    validation_debug:analystCheck.validation_debug,
    failed_points:failedPoints,
    contract_sha256:currentContractSha256,
    app_version:APP_VERSION,
    validator_version:VALIDATOR_VERSION,
    next_step:qualityGate
      ? 'Revisão humana obrigatória no app.'
      : 'Corrija somente os itens apontados e faça no máximo um reenvio; persistindo falha, encaminhe à revisão humana.'
  });
}

async function sourceStatus(req,res){
  if(!requireActionAuth(req,res))return; if(req.method!=='GET')return json(res,405,{error:'Método não permitido'});
  return json(res,200,{
    app_version:APP_VERSION,
    validator_version:VALIDATOR_VERSION,
    legal_source_version:process.env.LEGAL_SOURCE_VERSION||null,
    memorandum_version:process.env.MEMORANDUM_VERSION||null,
    mp_sha256:sha(mpText),
    memorandum_sha256:sha(memoText),
    instruction:'O GPT deve usar as cópias da MP e do memorando anexadas como Knowledge, conferir as versões e usar o contract_sha256 retornado por gpt-case no envio da análise.'
  });
}

export default async function handler(req,res){
  try {
    switch(action(req)){
      case 'auth': return await auth(req,res);
      case 'cases': return await cases(req,res);
      case 'config': return await config(req,res);
      case 'review': return await review(req,res);
      case 'gpt-cases': return await gptCases(req,res);
      case 'gpt-case': return await gptCase(req,res);
      case 'gpt-analysis': return await gptAnalysis(req,res);
      case 'source-status': return await sourceStatus(req,res);
      default: return json(res,404,{error:'Ação não encontrada'});
    }
  } catch(e) { return json(res,500,{error:e.message}); }
}
