import crypto from 'node:crypto';
import { json, readJson, requireAuth } from '../lib/http.js';
import { db } from '../lib/supabase.js';
import { TRAINING_MAX_ROUNDS, TRAINING_DISTRIBUTION, generateTrainingRound } from '../lib/training.js';

const APP_VERSION='3.15.5';
const VALIDATOR_VERSION='3.8.1';

async function createRound(run,ownerId){
  const generated=generateTrainingRound({runId:run.id,seed:run.seed,round:1});
  const payload=generated.cases.map(item=>({
    title:item.title,client_name:item.client_name,contract_text:item.contract_text,
    synthetic:true,environment:'test',external_test_id:null,owner_id:ownerId,
    run_id:run.id,training_round:1,training_order:item.order_index,status:'pendente'
  }));
  const created=await db('cases',{method:'POST',body:JSON.stringify(payload)});
  const byOrder=new Map(created.map(row=>[Number(row.training_order),row]));
  const expected=generated.cases.map(item=>{
    const row=byOrder.get(Number(item.order_index));
    if(!row)throw new Error(`Caso ${item.order_index} não retornou do banco`);
    return {run_id:run.id,case_id:row.id,round:1,expected_classification:item.classification,
      expected_points:item.expected_points,generation_facts:item.facts,generation_seed:item.generation_seed,
      order_index:item.order_index,result_status:'pending'};
  });
  await db('training_expected',{method:'POST',body:JSON.stringify(expected)});
  return created.length;
}

export default async function handler(req,res){
  try{
    const session=requireAuth(req,res); if(!session)return;
    if(session.role!=='admin')return json(res,403,{error:'Acesso administrativo restrito'});
    if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});
    if(String(process.env.TEST_IMPORT_ENABLED||'').toLowerCase()!=='true')return json(res,403,{error:'TEST_IMPORT_ENABLED precisa estar true'});
    const body=await readJson(req).catch(()=>({}));
    const seed=String(body?.seed||`dashboard-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`);
    const active=await db(`training_runs?owner_id=eq.${encodeURIComponent(session.profileId)}&status=eq.running&select=*&order=started_at.desc&limit=1`);
    if(active.length&&String(active[0].app_version||'')===APP_VERSION){
      const count=await db(`cases?owner_id=eq.${encodeURIComponent(session.profileId)}&run_id=eq.${encodeURIComponent(active[0].id)}&select=id`);
      return json(res,200,{ok:true,reused:true,run_id:active[0].id,round:Number(active[0].round),case_count:count.length,app_version:APP_VERSION});
    }
    if(active.length){
      await db(`training_runs?id=eq.${encodeURIComponent(active[0].id)}`,{method:'PATCH',body:JSON.stringify({status:'cancelled',completed_at:new Date().toISOString(),blocked_reason:`superseded_by_${APP_VERSION}`})}).catch(()=>{});
    }
    const [run]=await db('training_runs',{method:'POST',body:JSON.stringify({
      owner_id:session.profileId,seed,round:1,max_rounds:TRAINING_MAX_ROUNDS,attempts:0,correct:0,errors:0,streak:0,status:'running',
      app_version:APP_VERSION,validator_version:VALIDATOR_VERSION,distribution:TRAINING_DISTRIBUTION
    })});
    try{
      const count=await createRound(run,session.profileId);
      return json(res,201,{ok:true,reused:false,run_id:run.id,round:1,case_count:count,distribution:TRAINING_DISTRIBUTION,app_version:APP_VERSION});
    }catch(error){
      await db(`training_runs?id=eq.${encodeURIComponent(run.id)}`,{method:'PATCH',body:JSON.stringify({status:'cancelled',completed_at:new Date().toISOString()})}).catch(()=>{});
      throw error;
    }
  }catch(error){
    console.error('[ADMIN_TRAINING_START]',error);
    return json(res,500,{ok:false,error:error?.message||'Falha ao criar bateria'});
  }
}
