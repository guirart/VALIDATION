import { json, readJson, requireAuth } from '../lib/http.js';
import { db } from '../lib/supabase.js';
import { projectAnalysisDisplay } from '../lib/legal.js';

export default async function handler(req,res){
  const session=requireAuth(req,res); if(!session)return;
  const ownerId=session.profileId;

  try{
    if(req.method==='GET'){
      const id=String(req.query?.id||'').trim();
      if(id){
        const rows=await db(`cases?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=*,analyses(*),reviews(*)&limit=1`);
        if(!rows.length)return json(res,404,{error:'Caso não encontrado'});
        return json(res,200,{case:{...rows[0],analyses:(rows[0].analyses||[]).map(projectAnalysisDisplay)}});
      }

      const runId=String(req.query?.run_id||'').trim();
      const environment=String(req.query?.environment||'').trim();
      const explicitEnvironment=environment==='test'||environment==='production';
      const scopeFilter=runId
        ? `&run_id=eq.${encodeURIComponent(runId)}`
        : explicitEnvironment
          ? `&environment=eq.${encodeURIComponent(environment)}`
          : session.role==='admin'
            ? ''
            : '&environment=eq.production';

      const rows=await db(`cases?owner_id=eq.${encodeURIComponent(ownerId)}${scopeFilter}&select=id,title,client_name,status,owner_id,synthetic,environment,external_test_id,run_id,training_round,training_order,created_at,updated_at,analyses(id,final_classification,quality_gate,auditor_recommendation,created_at),reviews(id,created_at)&order=created_at.desc&limit=500`);
      return json(res,200,{cases:rows,migration_required:false,scope:session.role==='admin'&&!explicitEnvironment&&!runId?'all':'filtered'});
    }

    if(req.method==='POST'){
      const body=await readJson(req);
      if(!body.title||!body.contract_text)return json(res,400,{error:'Título e texto do contrato são obrigatórios'});
      let targetOwner=ownerId;
      if(session.role==='admin'&&body.owner_user_id)targetOwner=String(body.owner_user_id).trim();
      const owners=await db(`veredicta_users?id=eq.${encodeURIComponent(targetOwner)}&status=eq.active&select=id,name,email&limit=1`);
      if(!owners.length)return json(res,400,{error:'Usuário responsável inválido ou inativo'});
      const [row]=await db('cases',{method:'POST',body:JSON.stringify({title:String(body.title).slice(0,180),client_name:String(body.client_name||'').slice(0,180),contract_text:String(body.contract_text),owner_id:targetOwner,status:'pendente',environment:'production',synthetic:false})});
      await db('audit_logs',{method:'POST',body:JSON.stringify({case_id:row.id,owner_id:targetOwner,event_type:'case_created_in_app',payload:{title:row.title,owner_email:owners[0].email}})});
      return json(res,201,{case:row});
    }

    return json(res,405,{error:'Método não permitido'});
  }catch(error){
    console.error('[CASES_ALL]',error);
    return json(res,500,{error:error?.message||'Falha ao listar casos'});
  }
}
