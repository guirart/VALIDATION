import crypto from 'node:crypto';
import { db } from './supabase.js';

const APP_VERSION='3.15.2';
const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');

export function testImportEnabled(){
  return String(process.env.TEST_IMPORT_ENABLED||'').toLowerCase()==='true';
}

export function normalizeTestCaseInput(input,index=0){
  const externalTestId=String(input?.external_test_id||'').trim();
  const title=String(input?.title||'').trim();
  const clientName=String(input?.client_name||'').trim();
  const contractText=String(input?.contract_text||'').trim();
  if(!/^VEREDICTA-(?:TEST-\d{3,4}|REG-\d{3}-\d{3,4})$/.test(externalTestId)) throw Object.assign(new Error(`caso ${index+1}: external_test_id inválido`),{statusCode:400});
  if(!title||!contractText) throw Object.assign(new Error(`caso ${index+1}: title e contract_text são obrigatórios`),{statusCode:400});
  if('expected_result' in (input||{})||'expected_classification' in (input||{})) throw Object.assign(new Error(`caso ${index+1}: gabarito não pode ser importado para o dossiê`),{statusCode:400});
  return {external_test_id:externalTestId,title:title.slice(0,180),client_name:clientName.slice(0,180),contract_text:contractText};
}

export async function startImport({principal,body}){
  if(!testImportEnabled()) throw Object.assign(new Error('Importação de testes desativada. Configure TEST_IMPORT_ENABLED=true.'),{statusCode:403});
  const batchId=String(body?.batch_id||'').trim();
  const expectedTotal=Number(body?.expected_total);
  if(body?.environment!=='test') throw Object.assign(new Error('environment deve ser exatamente "test".'),{statusCode:400});
  if(!batchId) throw Object.assign(new Error('batch_id é obrigatório.'),{statusCode:400});
  if(!Number.isInteger(expectedTotal)||expectedTotal<1||expectedTotal>100) throw Object.assign(new Error('expected_total deve ser inteiro entre 1 e 100.'),{statusCode:400});
  const importId=crypto.randomUUID();
  await db('audit_logs',{method:'POST',body:JSON.stringify({owner_id:principal.userId,event_type:'test_import_batch_started',payload:{import_id:importId,batch_id:batchId,environment:'test',expected_total:expectedTotal,app_version:APP_VERSION,started_at:new Date().toISOString()}})});
  return {ok:true,import_id:importId,batch_id:batchId,environment:'test',expected_total:expectedTotal,next_action:'import_case',app_version:APP_VERSION};
}

async function getImportSession(principal,importId,batchId){
  const rows=await db(`audit_logs?owner_id=eq.${encodeURIComponent(principal.userId)}&event_type=eq.test_import_batch_started&select=id,payload,created_at&order=created_at.desc&limit=500`);
  return rows.find(x=>x?.payload?.import_id===importId&&x?.payload?.batch_id===batchId)||null;
}

export async function importOneCase({principal,body}){
  if(!testImportEnabled()) throw Object.assign(new Error('Importação de testes desativada. Configure TEST_IMPORT_ENABLED=true.'),{statusCode:403});
  const importId=String(body?.import_id||'').trim();
  const batchId=String(body?.batch_id||'').trim();
  if(!importId||!batchId||!body?.case) throw Object.assign(new Error('import_id, batch_id e case são obrigatórios.'),{statusCode:400});
  const session=await getImportSession(principal,importId,batchId);
  if(!session) throw Object.assign(new Error('Sessão de importação não encontrada.'),{statusCode:404});
  const item=normalizeTestCaseInput(body.case,0);
  let existing=await db(`cases?external_test_id=eq.${encodeURIComponent(item.external_test_id)}&owner_id=eq.${encodeURIComponent(principal.userId)}&select=id,title,status,synthetic,environment,external_test_id,owner_id,contract_text&limit=1`);
  let row,status;
  if(existing.length){row=existing[0];status='skipped_existing_id';}
  else {
    const orphaned=await db(`cases?external_test_id=eq.${encodeURIComponent(item.external_test_id)}&owner_id=is.null&synthetic=eq.true&environment=eq.test&select=id,title,status,synthetic,environment,external_test_id,owner_id,contract_text&limit=1`);
    if(orphaned.length){
      row=orphaned[0];status='claimed_orphan';
      await db(`cases?id=eq.${encodeURIComponent(row.id)}&owner_id=is.null`,{method:'PATCH',body:JSON.stringify({owner_id:principal.userId})});
    } else {
      [row]=await db('cases',{method:'POST',body:JSON.stringify({title:item.title,client_name:item.client_name,contract_text:item.contract_text,synthetic:true,environment:'test',external_test_id:item.external_test_id,owner_id:principal.userId,status:'pendente'})});
      status='created';
    }
  }
  await db('audit_logs',{method:'POST',body:JSON.stringify({case_id:row.id,owner_id:principal.userId,event_type:'test_import_batch_case',payload:{import_id:importId,batch_id:batchId,external_test_id:item.external_test_id,case_id:row.id,status,app_version:APP_VERSION}})});
  return {ok:true,import_id:importId,batch_id:batchId,external_test_id:item.external_test_id,case_id:row.id,status,contract_sha256:row.contract_text?sha(row.contract_text):null,next_action:'import_next_or_finalize',app_version:APP_VERSION};
}

export async function finalizeImport({principal,body}){
  const importId=String(body?.import_id||'').trim();
  const batchId=String(body?.batch_id||'').trim();
  if(!importId||!batchId) throw Object.assign(new Error('import_id e batch_id são obrigatórios.'),{statusCode:400});
  const session=await getImportSession(principal,importId,batchId);
  if(!session) throw Object.assign(new Error('Sessão de importação não encontrada.'),{statusCode:404});
  const expectedTotal=Number(session.payload.expected_total||0);
  const logs=await db(`audit_logs?owner_id=eq.${encodeURIComponent(principal.userId)}&event_type=eq.test_import_batch_case&select=id,case_id,payload,created_at&order=created_at.asc&limit=5000`);
  const byExternal=new Map();
  for(const x of logs){if(x?.payload?.import_id===importId&&x?.payload?.batch_id===batchId){const ext=String(x.payload.external_test_id||'').trim();if(ext)byExternal.set(ext,x);}}
  const entries=[...byExternal.values()];
  const total=entries.length,completed=total===expectedTotal;
  if(completed) await db('audit_logs',{method:'POST',body:JSON.stringify({owner_id:principal.userId,event_type:'test_import_batch_finalized',payload:{import_id:importId,batch_id:batchId,expected_total:expectedTotal,total,completed:true,app_version:APP_VERSION,completed_at:new Date().toISOString()}})});
  return {statusCode:completed?200:409,body:{ok:completed,completed,import_id:importId,batch_id:batchId,environment:'test',expected_total:expectedTotal,total,remaining:Math.max(0,expectedTotal-total),cases:entries.map(x=>({external_test_id:x.payload.external_test_id,case_id:x.payload.case_id,status:x.payload.status})),app_version:APP_VERSION,next_action:completed?'begin_analysis':'import_remaining_cases'}};
}
