import crypto from 'node:crypto';
import { json } from '../lib/http.js';
import { requireActionAuth } from '../lib/actionAuth.js';
import { db } from '../lib/supabase.js';

const APP_VERSION='3.15.3';
const ALLOWED_STATUS=new Set(['pendente','em-analise','aguardando-revisao','requer-correcao','concluido','erro']);
const sha=s=>crypto.createHash('sha256').update(String(s||'')).digest('hex');

export default async function handler(req,res){
  const principal=await requireActionAuth(req,res); if(!principal)return;
  if(req.method!=='GET')return json(res,405,{error:'Método não permitido'});
  try{
    const status=String(req.query?.status||'pendente').trim();
    const environment=String(req.query?.environment||'test').trim()==='production'?'production':'test';
    const limit=Math.max(1,Math.min(100,Number(req.query?.limit||100)||100));
    if(!ALLOWED_STATUS.has(status))return json(res,400,{error:'status inválido'});
    const rows=await db(`cases?owner_id=eq.${encodeURIComponent(principal.userId)}&environment=eq.${encodeURIComponent(environment)}&status=eq.${encodeURIComponent(status)}&select=id,external_test_id,synthetic,environment,run_id,training_round,training_order,title,client_name,contract_text,status,created_at,updated_at&order=created_at.asc&limit=${limit}`);
    return json(res,200,{
      ok:true,
      identity_rule:'case.id UUID é a única identidade canônica. Ignore nome, client_name e title para associação.',
      status,
      environment,
      total:rows.length,
      cases:rows.map(row=>({
        case_id:row.id,
        external_test_id:row.external_test_id,
        synthetic:row.synthetic,
        environment:row.environment,
        run_id:row.run_id,
        training_round:row.training_round,
        training_order:row.training_order,
        title:row.title,
        client_name:row.client_name,
        contract_text:row.contract_text,
        contract_sha256:sha(row.contract_text),
        status:row.status,
        created_at:row.created_at,
        updated_at:row.updated_at
      })),
      app_version:APP_VERSION
    });
  }catch(error){
    console.error('[GPT_BATCH_CASES]',error);
    return json(res,500,{ok:false,error:error?.message||'Falha ao listar lote',app_version:APP_VERSION});
  }
}
