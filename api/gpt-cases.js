import { json, readJson } from '../lib/http.js';
import { requireActionAuth } from '../lib/actionAuth.js';
import { db } from '../lib/supabase.js';

const APP_VERSION='3.15.4';
const ALLOWED_STATUS=new Set(['pendente','em-analise','aguardando-revisao','requer-correcao','concluido','erro']);

export default async function handler(req,res){
  const principal=await requireActionAuth(req,res);
  if(!principal)return;

  if(req.method==='GET'){
    const status=String(req.query?.status||'').trim();
    const runId=String(req.query?.run_id||'').trim();
    const requestedEnvironment=String(req.query?.environment||'').trim();
    const statusFilter=status&&ALLOWED_STATUS.has(status)?`&status=eq.${encodeURIComponent(status)}`:'';

    let scopeFilter='';
    if(runId){
      scopeFilter=`&run_id=eq.${encodeURIComponent(runId)}`;
    }else if(requestedEnvironment){
      const environment=requestedEnvironment==='test'?'test':'production';
      scopeFilter=`&environment=eq.${encodeURIComponent(environment)}`;
    }else if(principal.role!=='admin'){
      // Usuários comuns continuam vendo somente produção por padrão.
      scopeFilter='&environment=eq.production';
    }
    // Admin sem environment explícito vê produção + teste. Isso evita que casos
    // sintéticos recém-importados desapareçam da fila quando o catálogo MCP em cache
    // ainda não envia o parâmetro environment=test.

    const rows=await db(
      `cases?owner_id=eq.${encodeURIComponent(principal.userId)}${scopeFilter}${statusFilter}&select=id,external_test_id,synthetic,environment,run_id,training_round,training_order,title,client_name,status,created_at,updated_at&order=created_at.desc&limit=500`
    );

    return json(res,200,{
      cases:rows,
      user:{name:principal.name,email:principal.email},
      app_version:APP_VERSION,
      scope:runId?'run':requestedEnvironment|| (principal.role==='admin'?'all':'production')
    });
  }

  if(req.method==='POST'){
    const body=await readJson(req);
    if(!body?.title||!body?.contract_text)return json(res,400,{error:'Título e texto do contrato são obrigatórios'});
    const [row]=await db('cases',{
      method:'POST',
      body:JSON.stringify({
        title:String(body.title).slice(0,180),
        client_name:String(body.client_name||'').slice(0,180),
        contract_text:String(body.contract_text),
        owner_id:principal.userId,
        status:'pendente',
        environment:'production',
        synthetic:false
      })
    });
    await db('audit_logs',{
      method:'POST',
      body:JSON.stringify({
        case_id:row.id,
        owner_id:principal.userId,
        event_type:'case_created_by_mcp',
        payload:{title:row.title,owner_email:principal.email}
      })
    });
    return json(res,201,{case:row,user:{name:principal.name,email:principal.email},app_version:APP_VERSION});
  }

  return json(res,405,{error:'Método não permitido'});
}
