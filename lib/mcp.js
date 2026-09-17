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
    {name:'veredicta',version:'3.15.0'},
    {instructions:'Antes da primeira análise, consulte o status e carregue as fontes jurídicas do Veredicta. A identidade canônica de cada caso é somente case.id (UUID): nunca associe, deduplique ou reutilize análise por title, client_name, nomes das partes ou texto do contrato. external_test_id serve apenas à identidade estável de entradas sintéticas. Use somente citações literais das fontes e do contrato recuperado. Faça análise e auditoria independentes dos 15 pontos e para /begin_test use exclusivamente as ferramentas training-start/training-next/training-record até success ou blocked; para análises prefira o envio fracionado em 3 etapas (iniciar, enviar 15 pontos, finalizar) para reduzir o tamanho de cada chamada. O envio completo continua disponível por compatibilidade. A revisão humana é sempre obrigatória.'}
  );

  server.registerTool('consultar_status_veredicta',{
    title:'Consultar status do Veredicta',
    description:'Consulte antes da primeira análise. Retorna versões, hashes e os textos integrais da MP e do memorando usados pelo quality gate.',
    inputSchema:{},outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async(_args,extra)=>callVeredicta(extra,'/api/gpt/source-status'));

  server.registerTool('consultar_fontes_juridicas_veredicta',{
    title:'Consultar fontes jurídicas do Veredicta',
    description:'Retorna o texto integral, a versão e o SHA-256 da MP e do memorando usados pelo quality gate. Chame antes de redigir as citações dos 15 pontos.',
    inputSchema:{},outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async(_args,extra)=>callVeredicta(extra,'/api/gpt/legal-sources'));

  server.registerTool('listar_casos_veredicta',{
    title:'Listar casos do Veredicta',
    description:'Lista casos da conta conectada. Por padrão retorna somente produção. Para testes use environment=test ou run_id; o run_id isola uma execução de treinamento.',
    inputSchema:{
      status:z.enum(['pendente','em-analise','aguardando-revisao','requer-correcao','concluido','erro']).optional(),
      environment:z.enum(['production','test']).optional(),
      run_id:z.string().uuid().optional()
    },
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async({status,environment,run_id},extra)=>{
    const q=new URLSearchParams(); if(status)q.set('status',status); if(environment)q.set('environment',environment); if(run_id)q.set('run_id',run_id);
    return callVeredicta(extra,`/api/gpt/cases${q.toString()?`?${q.toString()}`:''}`);
  });

  server.registerTool('criar_caso_veredicta',{
    title:'Criar caso no Veredicta',
    description:'Cadastra um novo caso na conta Veredicta autenticada para análise posterior.',
    inputSchema:{title:z.string().min(1).max(180),client_name:z.string().max(180).optional(),contract_text:z.string().min(1)},
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:WRITE_ANALYSIS,_meta:toolMeta()
  },async(args,extra)=>callVeredicta(extra,'/api/gpt/cases',{method:'POST',body:args}));

  server.registerTool('importar_casos_sinteticos_veredicta',{
    title:'Importar casos sintéticos no Veredicta',
    description:'Importa de 1 a 100 casos exclusivamente sintéticos para testes. Restrita à conta administradora e exige environment=test.',
    inputSchema:{environment:z.literal('test'),batch_id:z.string().min(1).max(120),cases:z.array(z.object({external_test_id:z.string().regex(/^VEREDICTA-(?:TEST-\d{3,4}|REG-\d{3}-\d{3,4})$/),title:z.string().min(1),client_name:z.string().optional(),contract_text:z.string().min(1)})).min(1).max(100)},
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:WRITE_ANALYSIS,_meta:toolMeta()
  },async(args,extra)=>callVeredicta(extra,'/api/gpt/test-import',{method:'POST',body:args}));


  server.registerTool('iniciar_treinamento_veredicta',{
    title:'Iniciar /begin_test autônomo',
    description:'Cria uma execução cega isolada por run_id, gera uma rodada inédita com 100 casos balanceados 25/25/25/25 e max_rounds fixo em 400. O gabarito permanece oculto no servidor.',
    inputSchema:{seed:z.string().min(8).max(240).optional()},
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:WRITE_ANALYSIS,_meta:toolMeta()
  },async(args,extra)=>callVeredicta(extra,'/api/gpt/training-start',{method:'POST',body:args||{}}));

  server.registerTool('consultar_treinamento_veredicta',{
    title:'Consultar execução de treinamento',
    description:'Retorna progresso agregado do run_id sem expor o gabarito oculto. Se run_id for omitido, consulta a execução mais recente da conta.',
    inputSchema:{run_id:z.string().uuid().optional()},
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async({run_id},extra)=>callVeredicta(extra,`/api/gpt/training-status${run_id?`?run_id=${encodeURIComponent(run_id)}`:''}`));

  server.registerTool('proximo_caso_treinamento_veredicta',{
    title:'Obter próximo caso cego do treinamento',
    description:'Retorna apenas o próximo dossiê da rodada atual por UUID. Não retorna seed de caso, classificação esperada, mutação ou qualquer parte do gabarito.',
    inputSchema:{run_id:z.string().uuid()},
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async({run_id},extra)=>callVeredicta(extra,`/api/gpt/training-next?run_id=${encodeURIComponent(run_id)}`));

  server.registerTool('registrar_resultado_treinamento_veredicta',{
    title:'Comparar e registrar resultado cego',
    description:'Depois que a análise foi gravada, compara no servidor o analysis_id com o gabarito oculto. Um erro encerra a rodada, zera a sequência e gera automaticamente nova rodada; sucesso exige 100/100 na mesma rodada.',
    inputSchema:{run_id:z.string().uuid(),case_id:z.string().uuid(),analysis_id:z.string().uuid()},
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:WRITE_ANALYSIS,_meta:toolMeta()
  },async(args,extra)=>callVeredicta(extra,'/api/gpt/training-record',{method:'POST',body:args}));

  server.registerTool('buscar_caso_veredicta',{
    title:'Buscar caso do Veredicta',
    description:'Recupera o dossiê integral e o hash atual de um caso pertencente à conta conectada. Use antes de analisar ou reenviar uma correção.',
    inputSchema:{id:z.string().uuid()},outputSchema:{data:z.record(z.string(),z.unknown())},annotations:READ_ONLY,_meta:toolMeta()
  },async({id},extra)=>callVeredicta(extra,`/api/gpt/case?id=${encodeURIComponent(id)}`));


  server.registerTool('iniciar_envio_analise_veredicta',{
    title:'Iniciar envio fracionado de análise',
    description:'Cria um rascunho de submissão para um caso já recuperado. Use este fluxo para evitar payloads grandes: inicie, envie os 15 pontos individualmente e finalize.',
    inputSchema:{
      case_id:z.string().uuid(),
      source_contract_sha256:z.string().regex(/^[a-f0-9]{64}$/i),
      analyst_final_classification:z.enum(['enquadrável','parcialmente enquadrável','inconclusivo','não enquadrável']),
      analyst_summary:z.string(),
      audit_final_classification:z.enum(['enquadrável','parcialmente enquadrável','inconclusivo','não enquadrável']),
      audit_recommendation:z.enum(['liberar','corrigir','escalar para revisão humana aprofundada']),
      audit_summary:z.string()
    },
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:WRITE_ANALYSIS,_meta:toolMeta()
  },async(args,extra)=>callVeredicta(extra,'/api/gpt/analysis-start',{method:'POST',body:args}));

  server.registerTool('enviar_ponto_analise_veredicta',{
    title:'Enviar um ponto da análise',
    description:'Grava um único ponto jurídico e o finding correspondente no rascunho. Envie exatamente os pontos 1 a 15; um reenvio do mesmo ponto substitui logicamente o anterior na finalização.',
    inputSchema:{
      draft_id:z.string().uuid(),case_id:z.string().uuid(),
      analyst_point:pointSchema,
      audit_finding:z.object({
        point:z.number().int().min(1).max(15),
        status:z.enum(['confirmado','divergente','não encontrado','opinião sem precedente']),
        reason:z.string()
      })
    },
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:WRITE_ANALYSIS,_meta:toolMeta()
  },async(args,extra)=>callVeredicta(extra,'/api/gpt/analysis-point',{method:'POST',body:args}));

  server.registerTool('finalizar_envio_analise_veredicta',{
    title:'Finalizar envio fracionado de análise',
    description:'Monta no servidor os 15 pontos já enviados, executa o mesmo validador 3.8.1 e grava a análise final. Retorna os pontos ausentes sem gravar se o rascunho estiver incompleto.',
    inputSchema:{draft_id:z.string().uuid(),case_id:z.string().uuid()},
    outputSchema:{data:z.record(z.string(),z.unknown())},annotations:WRITE_ANALYSIS,_meta:toolMeta()
  },async(args,extra)=>callVeredicta(extra,'/api/gpt/analysis-finalize',{method:'POST',body:args}));

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
