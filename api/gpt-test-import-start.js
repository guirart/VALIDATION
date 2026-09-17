import { json, readJson } from '../lib/http.js';
import { requireActionAuth } from '../lib/actionAuth.js';
import { startImport } from '../lib/stagedTestImport.js';
export default async function handler(req,res){
  const principal=await requireActionAuth(req,res); if(!principal)return;
  if(principal.role!=='admin')return json(res,403,{error:'Importação de testes restrita ao administrador'});
  if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});
  try{return json(res,200,await startImport({principal,body:await readJson(req)}));}
  catch(e){return json(res,e.statusCode||500,{ok:false,error:e.message,app_version:'3.15.2'});}
}
