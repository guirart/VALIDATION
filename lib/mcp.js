import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const AUTH_SCHEME=[{type:'oauth2',scopes:['veredicta']}];
const READ_ONLY={readOnlyHint:true,destructiveHint:false,openWorldHint:false};
const WRITE_ANALYSIS={readOnlyHint:false,destructiveHint:false,openWorldHint:false};

const pointSchema=z.object({
  point:z.number().int().min(1).max(15),
  title:z.string(),
  legal_reference:z.string(),
  applicability:z.enum(['aplicavel','nao_aplicavel','condicional']),
  evidence_status:z.enum(['comprovado','parcialmente_comprovado','nao_comprovado','nao_consta','dispensado']),
  legal_result:z.enum(['atende','nao_atende','inconclusivo','nao_aplicavel']),
  verdict:z.string().optional(),
  display_label:z.string().optional(),
  mp_quote:z.string(),
  contract_quote:z.string(),
  reasoning:z.string()
});

const analystSchema=z.object({
  final_classification:z.enum(['enquadrável','parcialmente enquadrável','inconclusivo','não enquadrável']),
  modality:z.string().optional(),
  summary:z.string(),
  warnings:z.array(z.string()).optional(),
  tested_paths:z.array(z.record(z.string(),z.unknown())).optional(),
  points:z.array(pointSchema).length(15)
});

const auditSchema=z.object({
  recommendation:z.enum(['liberar','corrigir','escalar para revisão humana aprofundada']),
  final_classification:z.enum(['enquadrável','parcialmente enquadrável','inconclusivo','não enquadrável']),
  findings:z.array(z.object({
    point:z.number().int().min(1).max(15),
    status:z.enum(['confirmado','divergente','não encontrado','opinião sem precedente']),
    reason:z.string()
  })).length(15),
  summary:z.string()
});

function baseUrlFromExtra(extra){
  const headers=extra?.requestInfo?.headers||{};
  const proto=String(headers['x-forwarded-proto']||'https').split(',')[0].trim();
  const host=String(headers['x-forwarded-host']||headers.host||'').split(',')[0].trim();
  return host?`${proto}://${host}`.replace(/\/$/,''):String(process.env.APP_BASE_URL||'').replace(/\/$/,'');
}

function bearerFromExtra(extra){
  if(extra?.authInfo?.token)return `Bearer ${extra.authInfo.token}`;
  const raw=extra?.requestInfo?.headers?.authorization;
  return Array.isArray(raw)?String(raw[0]||''):String(raw||'');
}

function authChallenge(base,message='Entre na sua conta Veredicta para continuar.'){
  const metadata=`${base}/.well-known/oauth-protected-resource`;
  return {
    content:[{type:'text',text:message}],
    _meta:{'mcp/www_authenticate':[`Bearer resource_metadata="${metadata}", error="invalid_token", error_description="${message}"`]},
    isError:true
  };
}

async function callVeredicta(extra,path,{method='GET',body}={}){
  const base=baseUrlFromExtra(extra);
  const authorization=bearerFromExtra(extra);
  if(!base) return {content:[{type:'text',text:'APP_BASE_URL não configurado.'}],isError:true};
  if(!authorization) return authChallenge(base);
  let response;
  try{
    response=await fetch(`${base}${path}`,{
      method,
      headers:{authorization,accept:'application/json',...(body?{'content-type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined,
      signal:extra?.signal
    });
  }catch(error){
    return {content:[{type:'text',text:`Falha ao acessar o Veredicta: ${error.message}`}],isError:true};
  }
  const data=await response.json().catch(()=>({error:`Resposta inválida do Veredicta (${response.status})`}));
  if(response.status===401)return authChallenge(base,String(data?.error||'A conexão com o Veredicta expirou. Entre novamente.'));
  return {
    content:[{type:'text',text:JSON.stringify(data)}],
    structuredContent:{data},
    isError:!response.ok
  };
}

function toolMeta(){return {securitySchemes:AUTH_SCHEME}}

export function createVeredictaMcpServer(){
  const server=new McpServer(
    {name:'veredicta',version:'3.12.0'},
    {instructions:'Consulte o status das fontes antes da primeira análise. Busque o caso no Veredicta, faça análise e auditoria independentes dos 15 pontos e envie somente a análise completa. A revisão humana é sempre obrigatória.'}
  );

  server.registerTool('consultar_status_veredicta',{
    title:'Consultar status do Veredicta',
    description:'Consulte antes da primeira análise para conferir as versões do app, do validador e das fontes jurídicas.',
    inputSchema:{},outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async(_args,extra)=>callVeredicta(extra,'/api/gpt/source-status'));

  server.registerTool('listar_casos_veredicta',{
    title:'Listar casos do Veredicta',
    description:'Lista somente os casos pertencentes à conta Veredicta conectada. Use para localizar um caso quando o UUID não foi informado.',
    inputSchema:{status:z.enum(['pendente','em-analise','aguardando-revisao','requer-correcao','concluido','erro']).optional()},
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async({status},extra)=>callVeredicta(extra,`/api/gpt/cases${status?`?status=${encodeURIComponent(status)}`:''}`));

  server.registerTool('buscar_caso_veredicta',{
    title:'Buscar caso do Veredicta',
    description:'Recupera o dossiê integral e o hash atual de um caso pertencente à conta conectada. Use antes de analisar ou reenviar uma correção.',
    inputSchema:{id:z.string().uuid()},outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async({id},extra)=>callVeredicta(extra,`/api/gpt/case?id=${encodeURIComponent(id)}`));

  server.registerTool('enviar_analise_veredicta',{
    title:'Enviar análise auditada ao Veredicta',
    description:'Grava a análise jurídica e a auditoria adversarial completas de um caso já recuperado. Exige exatamente 15 pontos e 15 findings.',
    inputSchema:{case_id:z.string().uuid(),source_contract_sha256:z.string().regex(/^[a-f0-9]{64}$/i),analyst:analystSchema,audit:auditSchema},
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:WRITE_ANALYSIS,_meta:toolMeta()
  },async(args,extra)=>callVeredicta(extra,'/api/gpt/analysis',{method:'POST',body:args}));

  server.registerTool('listar_historico_veredicta',{
    title:'Listar histórico de análises',
    description:'Lista as análises já armazenadas para um caso da conta conectada.',
    inputSchema:{case_id:z.string().uuid()},outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async({case_id},extra)=>callVeredicta(extra,`/api/gpt/analysis-history?case_id=${encodeURIComponent(case_id)}`));

  server.registerTool('buscar_analise_veredicta',{
    title:'Buscar detalhe de uma análise',
    description:'Recupera uma análise armazenada, seus erros de validação e o diagnóstico do quality gate.',
    inputSchema:{id:z.string().uuid()},outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async({id},extra)=>callVeredicta(extra,`/api/gpt/analysis-detail?id=${encodeURIComponent(id)}`));

  return server;
}
