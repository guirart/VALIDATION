import crypto from 'node:crypto';
import { json, readJson, readRaw, makeSessionCookie, clearSessionCookie, isAuthenticated, requireAuth, getSession } from '../lib/http.js';
import { requireActionAuth, LEGACY_OWNER_ID } from '../lib/actionAuth.js';
import { db, supabaseConfigStatus } from '../lib/supabase.js';
import { signUpUser, signInUser, recoverPassword } from '../lib/userAuth.js';
import { createCheckoutSession, createBillingPortalSession, retrieveStripeEvent, stripeConfigStatus } from '../lib/stripe.js';
import { sendWelcomeEmail } from '../lib/email.js';
import { createAuthorizationCode, exchangeAuthorizationCode, refreshOAuthToken, oauthConfigStatus, validateOAuthClient, validateOAuthRedirectUri, revokeUserOAuth } from '../lib/oauth.js';
import { verifyAnalysis, FINAL_CLASSES, mpText, memoText } from '../lib/legal.js';

const ALLOWED_STATUS = new Set(['pendente','em-analise','aguardando-revisao','requer-correcao','concluido','erro']);
const AUDIT_RECOMMENDATIONS = new Set(['liberar','corrigir','escalar para revisão humana aprofundada']);
const AUDIT_STATUSES = new Set(['confirmado','divergente','não encontrado','opinião sem precedente']);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const APP_VERSION = '3.12.0';
const VALIDATOR_VERSION = '3.8.1';

function requestBaseUrl(req){
  const forwardedProto=String(req.headers?.['x-forwarded-proto']||'').split(',')[0].trim();
  const forwardedHost=String(req.headers?.['x-forwarded-host']||'').split(',')[0].trim();
  const host=forwardedHost || String(req.headers?.host||'').trim();
  const proto=forwardedProto || (host && !/^localhost(?::|$)/i.test(host) ? 'https' : 'http');
  if(host && !/^localhost(?::|$)/i.test(host)) return `${proto}://${host}`.replace(/\/$/,'');
  return String(process.env.APP_BASE_URL||'').replace(/\/$/,'');
}

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
  if (req.method === 'GET') {
    const session=getSession(req);
    return json(res,200,{authenticated:Boolean(session),user:session?{name:session.name,email:session.email,role:session.role}:null});
  }
  if (req.method === 'POST') {
    const {email='',password=''} = await readJson(req);
    const normalizedEmail=String(email).trim().toLowerCase();
    if(!normalizedEmail||!password) return json(res,400,{error:'Informe e-mail e senha.'});

    let authData;
    try{ authData=await signInUser({email:normalizedEmail,password:String(password)}); }
    catch(e){ return json(res,401,{error:'E-mail ou senha inválidos, ou e-mail ainda não confirmado.'}); }

    const authUserId=authData?.user?.id;
    if(!authUserId) return json(res,401,{error:'Não foi possível identificar o usuário autenticado.'});
    let profiles=await db(`veredicta_users?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=id,auth_user_id,name,email,role,status,subscription_status,stripe_customer_id,stripe_subscription_id&limit=1`);
    if(!profiles.length){
      const authEmail=String(authData?.user?.email||normalizedEmail).trim().toLowerCase();
      const byEmail=await db(`veredicta_users?email=eq.${encodeURIComponent(authEmail)}&select=id,auth_user_id,name,email,role,status,subscription_status,stripe_customer_id,stripe_subscription_id&limit=1`);
      if(byEmail.length){
        await db(`veredicta_users?id=eq.${encodeURIComponent(byEmail[0].id)}`,{method:'PATCH',body:JSON.stringify({auth_user_id:authUserId,updated_at:new Date().toISOString()})});
        profiles=[{...byEmail[0],auth_user_id:authUserId}];
      }else{
        const adminEmail=String(process.env.VEREDICTA_ADMIN_EMAIL||'').trim().toLowerCase();
        const role=adminEmail&&authEmail===adminEmail?'admin':'user';
        const displayName=String(authData?.user?.user_metadata?.name||authEmail.split('@')[0]||'Usuário').trim();
        const created=await db('veredicta_users',{method:'POST',body:JSON.stringify({
          auth_user_id:authUserId,name:displayName,email:authEmail,role,
          status:'pending_payment',subscription_status:'pending'
        })});
        profiles=created;
      }
    }
    let profile=profiles[0];

    // O e-mail administrativo configurado na Vercel é a fonte de verdade.
    // Se a conta já existia como usuário comum, ela é promovida automaticamente no login.
    const configuredAdminEmail=String(process.env.VEREDICTA_ADMIN_EMAIL||'').trim().toLowerCase();
    const isConfiguredAdmin=Boolean(configuredAdminEmail && String(profile.email||normalizedEmail).trim().toLowerCase()===configuredAdminEmail);
    const isAdmin=isConfiguredAdmin || profile.role==='admin';

    if(isAdmin && (profile.role!=='admin' || profile.status!=='active' || profile.subscription_status!=='admin_exempt')){
      const updated=await db(`veredicta_users?id=eq.${encodeURIComponent(profile.id)}`,{
        method:'PATCH',
        body:JSON.stringify({
          role:'admin',
          status:'active',
          subscription_status:'admin_exempt',
          updated_at:new Date().toISOString()
        })
      });
      profile=updated[0]||{...profile,role:'admin',status:'active',subscription_status:'admin_exempt'};
    }

    if(profile.status==='suspended' && !isAdmin) return json(res,403,{error:'Acesso suspenso. Contate o administrador do Veredicta.'});

    const paid=new Set(['active','trialing']);
    const subscriptionStatus=String(profile.subscription_status||'pending').toLowerCase();
    if(!isAdmin && !paid.has(subscriptionStatus)){
      let paymentUrl='';
      let billingError='';
      try{
        // Conta ainda sem assinatura efetiva: crie um novo Checkout.
        // Portal é reservado para quem já possui relação de cobrança que pode ser regularizada.
        const checkoutStatuses=new Set(['pending','incomplete','incomplete_expired','canceled']);
        if(!profile.stripe_customer_id || checkoutStatuses.has(subscriptionStatus)){
          paymentUrl=(await createCheckoutSession({userId:profile.id,email:profile.email,name:profile.name,customerId:profile.stripe_customer_id||undefined})).url||'';
        }else{
          paymentUrl=(await createBillingPortalSession({customerId:profile.stripe_customer_id})).url||'';
        }
      }catch(e){
        billingError=String(e?.message||e||'Falha ao gerar cobrança');
        console.error('[billing] não foi possível gerar URL de regularização',billingError);
      }
      return json(res,402,{
        error:'Assinatura sem adimplência ativa. Regularize o pagamento para acessar o Veredicta.',
        billing_required:true,
        subscription_status:profile.subscription_status||'pending',
        payment_url:paymentUrl,
        billing_error:billingError||undefined
      });
    }

    if(profile.role==='admin'){
      // No primeiro acesso do administrador, incorpora os dados legados à conta individual.
      try{
        await db(`cases?owner_id=eq.${encodeURIComponent(LEGACY_OWNER_ID)}`,{method:'PATCH',body:JSON.stringify({owner_id:profile.id})});
        await db(`analyses?owner_id=eq.${encodeURIComponent(LEGACY_OWNER_ID)}`,{method:'PATCH',body:JSON.stringify({owner_id:profile.id})});
        await db(`reviews?owner_id=eq.${encodeURIComponent(LEGACY_OWNER_ID)}`,{method:'PATCH',body:JSON.stringify({owner_id:profile.id})});
        await db(`audit_logs?owner_id=eq.${encodeURIComponent(LEGACY_OWNER_ID)}`,{method:'PATCH',body:JSON.stringify({owner_id:profile.id})});
      }catch(e){ console.warn('[legacy-claim]',e?.message||e); }
    }

    res.setHeader('Set-Cookie',makeSessionCookie({
      userId:authUserId,
      profileId:profile.id,
      email:profile.email,
      name:profile.name,
      role:profile.role
    }));
    return json(res,200,{ok:true,user:{name:profile.name,email:profile.email,role:profile.role}});
  }
  if(req.method==='DELETE') { res.setHeader('Set-Cookie',clearSessionCookie()); return json(res,200,{ok:true}); }
  return json(res,405,{error:'Método não permitido'});
}

async function register(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Método não permitido'});
  const body=await readJson(req);
  const name=String(body.name||'').trim();
  const email=String(body.email||'').trim().toLowerCase();
  const password=String(body.password||'');
  const accepted=Boolean(body.accept_terms);
  if(name.length<2) return json(res,400,{error:'Informe seu nome.'});
  if(!email||!email.includes('@')) return json(res,400,{error:'Informe um e-mail válido.'});
  if(password.length<8) return json(res,400,{error:'A senha deve ter pelo menos 8 caracteres.'});
  if(!accepted) return json(res,400,{error:'É necessário aceitar os Termos de Uso e a Política de Privacidade.'});

  const existing=await db(`veredicta_users?email=eq.${encodeURIComponent(email)}&select=id,subscription_status,stripe_customer_id&limit=1`);
  if(existing.length) return json(res,409,{error:'Já existe uma conta com este e-mail. Use Entrar para acessar ou regularizar sua assinatura.'});

  let signup;
  try{ signup=await signUpUser({email,password,name,redirectBase:requestBaseUrl(req)}); }
  catch(e){ return json(res,e.statusCode===400?400:500,{error:e.message||'Falha ao criar usuário no Supabase Auth.'}); }
  const signupUser=signup?.user || signup;
  const authUserId=signupUser?.id;
  if(!authUserId) return json(res,500,{error:'O Supabase não retornou o identificador do novo usuário.'});

  const adminEmail=String(process.env.VEREDICTA_ADMIN_EMAIL||'').trim().toLowerCase();
  const role=adminEmail&&email===adminEmail?'admin':'user';
  const adminExempt=role==='admin';
  const [profile]=await db('veredicta_users',{
    method:'POST',
    body:JSON.stringify({
      auth_user_id:authUserId,name,email,role,
      status:adminExempt?'active':'pending_payment',
      subscription_status:adminExempt?'admin_exempt':'pending',
      terms_accepted_at:new Date().toISOString()
    })
  });

  if(adminExempt){
    return json(res,201,{
      ok:true,
      admin:true,
      billing_exempt:true,
      checkout_url:'',
      email_confirmation_required:!(signup?.session || signup?.access_token),
      message:'Conta administrativa criada. Confirme o e-mail e entre normalmente; nenhuma assinatura será exigida.'
    });
  }

  let checkout;
  try{
    checkout=await createCheckoutSession({userId:profile.id,email,name});
    await db(`veredicta_users?id=eq.${encodeURIComponent(profile.id)}`,{
      method:'PATCH',body:JSON.stringify({stripe_checkout_session_id:checkout.id,updated_at:new Date().toISOString()})
    });
  }catch(e){
    console.error('[register] usuário criado, mas Stripe falhou:',e?.message||e);
    return json(res,500,{error:`Conta criada, mas não foi possível abrir o pagamento: ${e.message}. Tente entrar para gerar uma nova cobrança.`});
  }

  return json(res,201,{
    ok:true,
    checkout_url:checkout.url,
    email_confirmation_required:!(signup?.session || signup?.access_token),
    message:'Conta criada. Conclua o pagamento e confirme seu e-mail para acessar o Veredicta.'
  });
}

async function recover(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Método não permitido'});
  const {email=''}=await readJson(req);
  const normalized=String(email).trim().toLowerCase();
  if(!normalized||!normalized.includes('@')) return json(res,400,{error:'Informe um e-mail válido.'});
  try{await recoverPassword(normalized,{redirectBase:requestBaseUrl(req)});}catch(e){console.warn('[recover]',e?.message||e)}
  return json(res,200,{ok:true,message:'Se houver uma conta para este e-mail, o Supabase enviará as instruções de recuperação.'});
}

async function stripeWebhook(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Método não permitido'});
  const incoming=await readJson(req);
  if(!incoming?.id) return json(res,400,{error:'Evento Stripe sem id.'});
  // O evento é recuperado diretamente da API da Stripe com a chave secreta.
  // Assim o backend não confia no JSON recebido do navegador/rede.
  const event=await retrieveStripeEvent(incoming.id);
  const object=event?.data?.object||{};
  const type=String(event?.type||'');

  async function profileByBilling(){
    const userId=String(object?.metadata?.veredicta_user_id||object?.client_reference_id||'').trim();
    if(userId){
      const rows=await db(`veredicta_users?id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
      if(rows.length) return rows[0];
    }
    const sub=typeof object?.subscription==='string'?object.subscription:object?.id?.startsWith?.('sub_')?object.id:'';
    if(sub){
      const rows=await db(`veredicta_users?stripe_subscription_id=eq.${encodeURIComponent(sub)}&select=*&limit=1`);
      if(rows.length) return rows[0];
    }
    const customer=typeof object?.customer==='string'?object.customer:'';
    if(customer){
      const rows=await db(`veredicta_users?stripe_customer_id=eq.${encodeURIComponent(customer)}&select=*&limit=1`);
      if(rows.length) return rows[0];
    }
    return null;
  }

  const profile=await profileByBilling();
  if(!profile){
    console.warn('[stripe-webhook] perfil não localizado para',event.id,type);
    return json(res,200,{received:true,ignored:true});
  }

  let patch={updated_at:new Date().toISOString()};
  if(type==='checkout.session.completed'){
    patch.stripe_customer_id=typeof object.customer==='string'?object.customer:profile.stripe_customer_id;
    patch.stripe_subscription_id=typeof object.subscription==='string'?object.subscription:profile.stripe_subscription_id;
    patch.stripe_checkout_session_id=object.id||profile.stripe_checkout_session_id;
    patch.subscription_status=(object.payment_status==='paid'||object.payment_status==='no_payment_required')?'active':'pending';
    patch.status=patch.subscription_status==='active'?'active':profile.status;
  }else if(type==='customer.subscription.created'||type==='customer.subscription.updated'){
    patch.stripe_customer_id=typeof object.customer==='string'?object.customer:profile.stripe_customer_id;
    patch.stripe_subscription_id=object.id||profile.stripe_subscription_id;
    patch.subscription_status=object.status||profile.subscription_status;
    patch.status=['active','trialing'].includes(object.status)?'active':profile.status;
    if(object.current_period_end) patch.current_period_end=new Date(Number(object.current_period_end)*1000).toISOString();
  }else if(type==='customer.subscription.deleted'){
    patch.subscription_status='canceled';
  }else if(type==='invoice.payment_failed'){
    patch.subscription_status='past_due';
  }else if(type==='invoice.paid'||type==='invoice.payment_succeeded'){
    patch.subscription_status='active';
    patch.status='active';
  }else{
    return json(res,200,{received:true,ignored:true,type});
  }

  const rows=await db(`veredicta_users?id=eq.${encodeURIComponent(profile.id)}`,{method:'PATCH',body:JSON.stringify(patch)});
  const updated=rows?.[0]||{...profile,...patch};
  if(['active','trialing'].includes(String(updated.subscription_status))&&!updated.welcome_email_sent_at){
    try{
      await sendWelcomeEmail({to:updated.email,name:updated.name});
      await db(`veredicta_users?id=eq.${encodeURIComponent(profile.id)}`,{method:'PATCH',body:JSON.stringify({welcome_email_sent_at:new Date().toISOString()})});
    }catch(e){ console.error('[welcome-email]',e?.message||e); }
  }
  return json(res,200,{received:true,type});
}

async function billing(req,res){
  const session=requireAuth(req,res); if(!session)return;
  if(req.method!=='POST') return json(res,405,{error:'Método não permitido'});
  const profiles=await db(`veredicta_users?id=eq.${encodeURIComponent(session.profileId)}&select=id,name,email,stripe_customer_id,subscription_status&limit=1`);
  if(!profiles.length) return json(res,404,{error:'Usuário não encontrado'});
  const profile=profiles[0];
  if(session.role==='admin') return json(res,200,{url:'',billing_exempt:true,message:'Administrador isento de cobrança.'});
  const target=profile.stripe_customer_id
    ? await createBillingPortalSession({customerId:profile.stripe_customer_id})
    : await createCheckoutSession({userId:profile.id,email:profile.email,name:profile.name});
  return json(res,200,{url:target.url});
}

async function config(req,res){
  const session=requireAuth(req,res); if(!session)return;
  if(req.method!=='GET') return json(res,405,{error:'Método não permitido'});
  return json(res,200,{
    custom_gpt_url: process.env.CUSTOM_GPT_URL || '',
    app_version: APP_VERSION,
    validator_version: VALIDATOR_VERSION,
    user:{name:session.name,email:session.email,role:session.role},
    supabase: supabaseConfigStatus(),
    stripe: stripeConfigStatus()
  });
}

async function cases(req,res) {
  const session=requireAuth(req,res); if(!session)return;
  const ownerId=session.profileId;

  if(req.method==='GET') {
    const id=String(req.query?.id||'').trim();
    if(id){
      const rows=await db(`cases?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=*,analyses(*),reviews(*)&limit=1`);
      if(!rows.length)return json(res,404,{error:'Caso não encontrado'});
      return json(res,200,{case:rows[0]});
    }
    const rows=await db(`cases?owner_id=eq.${encodeURIComponent(ownerId)}&select=id,title,client_name,status,owner_id,created_at,updated_at,analyses(id,final_classification,quality_gate,auditor_recommendation,created_at),reviews(id,created_at)&order=created_at.desc&limit=200`);
    return json(res,200,{cases:rows,migration_required:false});
  }

  if(req.method==='POST'){
    const body=await readJson(req);
    if(!body.title||!body.contract_text) return json(res,400,{error:'Título e texto do contrato são obrigatórios'});
    let targetOwner=ownerId;
    if(session.role==='admin'&&body.owner_user_id) targetOwner=String(body.owner_user_id).trim();
    const owners=await db(`veredicta_users?id=eq.${encodeURIComponent(targetOwner)}&status=eq.active&select=id,name,email&limit=1`);
    if(!owners.length) return json(res,400,{error:'Usuário responsável inválido ou inativo'});
    const [row]=await db('cases',{method:'POST',body:JSON.stringify({
      title:String(body.title).slice(0,180),client_name:String(body.client_name||'').slice(0,180),
      contract_text:String(body.contract_text),owner_id:targetOwner,status:'pendente'
    })});
    await db('audit_logs',{method:'POST',body:JSON.stringify({case_id:row.id,owner_id:targetOwner,event_type:'case_created_in_app',payload:{title:row.title,owner_email:owners[0].email}})});
    return json(res,201,{case:row});
  }
  return json(res,405,{error:'Método não permitido'});
}

async function gptCases(req,res){
  // Cada chave GPT enxerga somente os casos do seu próprio usuário.
  const principal=await requireActionAuth(req,res);
  if(!principal)return;

  if(req.method==='GET'){
    const status=String(req.query?.status||'').trim();
    const filter=status&&ALLOWED_STATUS.has(status)
      ? `&status=eq.${encodeURIComponent(status)}`
      : '';

    const rows=await db(
      `cases?owner_id=eq.${encodeURIComponent(principal.userId)}&select=id,title,client_name,status,created_at,updated_at${filter}&order=created_at.desc&limit=50`
    );

    return json(res,200,{cases:rows,user:{name:principal.name,email:principal.email}});
  }

  if(req.method==='POST'){
    const body=await readJson(req);
    if(!body?.title||!body?.contract_text) return json(res,400,{error:'Título e texto do contrato são obrigatórios'});
    const [row]=await db('cases',{method:'POST',body:JSON.stringify({title:String(body.title).slice(0,180),client_name:String(body.client_name||'').slice(0,180),contract_text:String(body.contract_text),owner_id:principal.userId,status:'pendente'})});
    await db('audit_logs',{method:'POST',body:JSON.stringify({case_id:row.id,owner_id:principal.userId,event_type:'case_created_by_mcp',payload:{title:row.title,owner_email:principal.email}})});
    return json(res,201,{case:row,user:{name:principal.name,email:principal.email}});
  }
  return json(res,405,{error:'Método não permitido'});
}

async function gptCase(req,res){
  const principal=await requireActionAuth(req,res);
  if(!principal)return;
  if(req.method!=='GET')return json(res,405,{error:'Método não permitido'});
  const id=String(req.query?.id||'').trim(); if(!id)return json(res,400,{error:'id obrigatório'});
  const rows=await db(`cases?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(principal.userId)}&select=id,title,client_name,contract_text,status,created_at,updated_at&limit=1`);
  if(!rows.length)return json(res,404,{error:'Caso não encontrado para este usuário'});
  await db(`cases?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(principal.userId)}`,{method:'PATCH',body:JSON.stringify({status:'em-analise',updated_at:new Date().toISOString()})});
  await db('audit_logs',{method:'POST',body:JSON.stringify({case_id:id,owner_id:principal.userId,event_type:'case_fetched_by_gpt_action',payload:{user_email:principal.email}})});
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

  const principal=await requireActionAuth(req,res);
  if(!principal){
    stageLog('AUTH_FAILED');
    return;
  }
  stageLog('AUTH_OK',{user_id:principal.userId});

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

  const rows=await db(`cases?id=eq.${encodeURIComponent(caseId)}&owner_id=eq.${encodeURIComponent(principal.userId)}&select=*&limit=1`);
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
      owner_id:principal.userId,
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

  await db(`cases?id=eq.${encodeURIComponent(caseId)}&owner_id=eq.${encodeURIComponent(principal.userId)}`,{
    method:'PATCH',
    body:JSON.stringify({status})
  });

  await db('audit_logs',{
    method:'POST',
    body:JSON.stringify({
      case_id:caseId,
      analysis_id:analysisRow.id,
      owner_id:principal.userId,
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


function testImportEnabled() {
  return String(process.env.TEST_IMPORT_ENABLED || '').toLowerCase() === 'true';
}

function normalizeTestCaseInput(input, index) {
  const externalTestId = String(input?.external_test_id || '').trim();
  const title = String(input?.title || '').trim();
  const clientName = String(input?.client_name || '').trim();
  const contractText = String(input?.contract_text || '').trim();

  if (!/^VEREDICTA-(?:TEST-\d{3,4}|REG-\d{3}-\d{3,4})$/.test(externalTestId)) {
    throw new Error(`caso ${index + 1}: external_test_id inválido`);
  }
  if (!title || !contractText) {
    throw new Error(`caso ${index + 1}: title e contract_text são obrigatórios`);
  }
  if ('expected_result' in (input || {}) || 'expected_classification' in (input || {})) {
    throw new Error(`caso ${index + 1}: gabarito não pode ser importado para o dossiê`);
  }

  return {
    external_test_id: externalTestId,
    title: title.slice(0,180),
    client_name: clientName.slice(0,180),
    contract_text: contractText
  };
}

async function importSyntheticCases(body) {
  if (!testImportEnabled()) {
    const err = new Error('Importação de testes desativada. Configure TEST_IMPORT_ENABLED=true.');
    err.statusCode = 403;
    throw err;
  }

  if (body?.environment !== 'test') {
    const err = new Error('environment deve ser exatamente "test".');
    err.statusCode = 400;
    throw err;
  }

  const batchId = String(body?.batch_id || '').trim();
  const list = Array.isArray(body?.cases) ? body.cases : [];
  if (!batchId) {
    const err = new Error('batch_id é obrigatório.');
    err.statusCode = 400;
    throw err;
  }
  if (!list.length || list.length > 100) {
    const err = new Error('cases deve conter entre 1 e 100 casos.');
    err.statusCode = 400;
    throw err;
  }

  const normalized = list.map(normalizeTestCaseInput);
  const results = [];

  for (const item of normalized) {
    // 1) Idempotência por external_test_id.
    let existing = await db(
      `cases?external_test_id=eq.${encodeURIComponent(item.external_test_id)}&select=id,title,client_name,status,synthetic,environment,external_test_id&limit=1`
    );

    if (existing.length) {
      results.push({
        external_test_id:item.external_test_id,
        case_id:existing[0].id,
        title:existing[0].title,
        status:'skipped_existing_id'
      });
      continue;
    }

    // 2) Adoção segura de teste cadastrado manualmente pelo mesmo título.
    existing = await db(
      `cases?title=eq.${encodeURIComponent(item.title)}&select=id,title,client_name,status,synthetic,environment,external_test_id&limit=1`
    );

    if (existing.length) {
      const adopted = existing[0];
      await db(`cases?id=eq.${encodeURIComponent(adopted.id)}`,{
        method:'PATCH',
        body:JSON.stringify({
          synthetic:true,
          environment:'test',
          external_test_id:item.external_test_id
        })
      });
      await db('audit_logs',{
        method:'POST',
        body:JSON.stringify({
          case_id:adopted.id,
          event_type:'synthetic_case_adopted_by_test_import',
          payload:{batch_id:batchId,external_test_id:item.external_test_id}
        })
      });
      results.push({
        external_test_id:item.external_test_id,
        case_id:adopted.id,
        title:adopted.title,
        status:'adopted_existing_title'
      });
      continue;
    }

    // 3) Criação de caso exclusivamente sintético.
    const [row] = await db('cases',{
      method:'POST',
      body:JSON.stringify({
        title:item.title,
        client_name:item.client_name,
        contract_text:item.contract_text,
        synthetic:true,
        environment:'test',
        external_test_id:item.external_test_id,
        status:'pendente'
      })
    });

    await db('audit_logs',{
      method:'POST',
      body:JSON.stringify({
        case_id:row.id,
        event_type:'synthetic_case_imported',
        payload:{batch_id:batchId,external_test_id:item.external_test_id}
      })
    });

    results.push({
      external_test_id:item.external_test_id,
      case_id:row.id,
      title:row.title,
      contract_sha256:sha(row.contract_text),
      status:'created'
    });
  }

  return {
    ok:true,
    environment:'test',
    batch_id:batchId,
    total:list.length,
    created:results.filter(x=>x.status==='created').length,
    adopted:results.filter(x=>x.status==='adopted_existing_title').length,
    skipped:results.filter(x=>x.status==='skipped_existing_id').length,
    cases:results,
    app_version:APP_VERSION
  };
}

async function testImport(req,res){
  const principal=await requireActionAuth(req,res);
  if(!principal) return;
  if(principal.role!=='admin') return json(res,403,{error:'Importação de testes restrita ao administrador'});
  if(req.method!=='POST') return json(res,405,{error:'Método não permitido'});

  try {
    const body=await readJson(req);
    const result=await importSyntheticCases(body);
    return json(res,200,result);
  } catch(e) {
    return json(res,e.statusCode||500,{
      ok:false,
      error:e.message,
      app_version:APP_VERSION
    });
  }
}

async function testImportUi(req,res){
  const session=requireAuth(req,res); if(!session)return;
  if(session.role!=='admin') return json(res,403,{error:'Importação de testes restrita ao administrador'});
  if(req.method!=='POST') return json(res,405,{error:'Método não permitido'});

  try {
    const body=await readJson(req);
    const result=await importSyntheticCases(body);
    return json(res,200,result);
  } catch(e) {
    return json(res,e.statusCode||500,{
      ok:false,
      error:e.message,
      app_version:APP_VERSION
    });
  }
}


async function gptAnalysisHistory(req,res){
  const principal=await requireActionAuth(req,res);
  if(!principal) return;
  if(req.method!=='GET') return json(res,405,{error:'Método não permitido'});

  const caseId=String(req.query?.case_id||'').trim();
  if(!caseId) return json(res,400,{
    ok:false,error:'case_id é obrigatório',
    app_version:APP_VERSION,validator_version:VALIDATOR_VERSION
  });

  const owned=await db(`cases?id=eq.${encodeURIComponent(caseId)}&owner_id=eq.${encodeURIComponent(principal.userId)}&select=id&limit=1`);
  if(!owned.length) return json(res,404,{ok:false,error:'Caso não encontrado para este usuário'});

  const rows=await db(
    `analyses?case_id=eq.${encodeURIComponent(caseId)}&owner_id=eq.${encodeURIComponent(principal.userId)}&select=id,case_id,final_classification,quality_gate,auditor_recommendation,created_at&order=created_at.desc`
  );

  return json(res,200,{
    ok:true,case_id:caseId,analyses:rows,
    app_version:APP_VERSION,validator_version:VALIDATOR_VERSION
  });
}

async function gptAnalysisDetail(req,res){
  const principal=await requireActionAuth(req,res);
  if(!principal) return;
  if(req.method!=='GET') return json(res,405,{error:'Método não permitido'});

  const analysisId=String(req.query?.id||'').trim();
  if(!analysisId) return json(res,400,{
    ok:false,error:'id da análise é obrigatório',
    app_version:APP_VERSION,validator_version:VALIDATOR_VERSION
  });

  const rows=await db(
    `analyses?id=eq.${encodeURIComponent(analysisId)}&owner_id=eq.${encodeURIComponent(principal.userId)}&select=id,case_id,analyst_json,audit_json,final_classification,quality_gate,auditor_recommendation,created_at&limit=1`
  );

  if(!rows.length) return json(res,404,{
    ok:false,error:'Análise não encontrada para este usuário',analysis_id:analysisId,
    app_version:APP_VERSION,validator_version:VALIDATOR_VERSION
  });

  const a=rows[0];
  const logs=await db(
    `audit_logs?analysis_id=eq.${encodeURIComponent(analysisId)}&owner_id=eq.${encodeURIComponent(principal.userId)}&event_type=eq.analysis_submitted&select=id,payload,created_at&order=created_at.desc&limit=1`
  );
  const payload=logs?.[0]?.payload || {};

  return json(res,200,{
    ok:true,
    analysis:{
      id:a.id,case_id:a.case_id,analyst:a.analyst_json,audit:a.audit_json,
      final_classification:a.final_classification,quality_gate:a.quality_gate,
      auditor_recommendation:a.auditor_recommendation,created_at:a.created_at
    },
    validation:{
      validation_errors:payload.validation_errors||[],
      validation_error_details:payload.validation_error_details||[],
      quality_gate_reasons:payload.quality_gate_reasons||[],
      validation_debug:payload.validation_debug||[],
      failed_points:payload.failed_points||[]
    },
    integrity:{
      contract_sha256:payload.contract_sha256||null,
      app_version:payload.app_version||APP_VERSION,
      validator_version:payload.validator_version||VALIDATOR_VERSION
    },
    app_version:APP_VERSION,validator_version:VALIDATOR_VERSION
  });
}


async function readOAuthParams(req){
  if(req.body && typeof req.body==='object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw=await readRaw(req);
  const ct=String(req.headers?.['content-type']||'').toLowerCase();
  if(ct.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
  if(!raw)return {};
  try{return JSON.parse(raw)}catch{return Object.fromEntries(new URLSearchParams(raw))}
}

function oauthError(res,status,error,description){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Pragma','no-cache');
  return json(res,status,{error,error_description:description||error});
}

function appendQuery(url,params){
  const u=new URL(url);
  for(const [k,v] of Object.entries(params)) if(v!==undefined&&v!==null&&String(v)!=='') u.searchParams.set(k,String(v));
  return u.toString();
}

async function oauthAuthorize(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Método não permitido'});
  const session=requireAuth(req,res); if(!session)return;
  const body=await readJson(req);
  const clientId=String(body.client_id||'').trim();
  const redirectUri=String(body.redirect_uri||'').trim();
  const responseType=String(body.response_type||'code').trim();
  const state=String(body.state||'');
  const scope=String(body.scope||'veredicta');
  const decision=String(body.decision||'approve');
  const codeChallenge=String(body.code_challenge||'');
  const codeChallengeMethod=String(body.code_challenge_method||'');

  if(responseType!=='code') return json(res,400,{error:'unsupported_response_type'});
  if(!validateOAuthClient(clientId,'',{requireSecret:false})) return json(res,400,{error:'invalid_client'});
  if(!await validateOAuthRedirectUri(clientId,redirectUri)) return json(res,400,{error:'redirect_uri não autorizado'});

  if(decision==='deny'){
    return json(res,200,{redirect_to:appendQuery(redirectUri,{error:'access_denied',state})});
  }

  // Revalida a conta no momento da conexão do GPT. Sessão antiga não ignora suspensão ou inadimplência posterior.
  const profiles=await db(`veredicta_users?id=eq.${encodeURIComponent(session.profileId)}&select=id,name,email,role,status,subscription_status&limit=1`);
  if(!profiles.length) return json(res,403,{error:'Conta Veredicta não encontrada'});
  const profile=profiles[0];
  if(profile.status!=='active') return json(res,403,{error:'Conta Veredicta suspensa ou inativa'});
  const isAdmin=profile.role==='admin';
  if(!isAdmin && !['active','trialing'].includes(String(profile.subscription_status||'').toLowerCase())){
    return json(res,402,{error:'Assinatura sem adimplência ativa. Regularize o pagamento antes de conectar o GPT.',billing_required:true,subscription_status:profile.subscription_status||'pending'});
  }

  const out=await createAuthorizationCode({
    userId:profile.id,clientId,redirectUri,scope,codeChallenge,codeChallengeMethod
  });
  return json(res,200,{redirect_to:appendQuery(redirectUri,{code:out.code,state})});
}

function oauthProtectedResource(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Método não permitido'});
  const base=requestBaseUrl(req);
  res.setHeader('Cache-Control','public, max-age=300');
  return json(res,200,{
    resource:`${base}/mcp`,
    authorization_servers:[base],
    scopes_supported:['veredicta'],
    bearer_methods_supported:['header'],
    resource_documentation:`${base}/MCP_MIGRATION.md`
  });
}

function oauthAuthorizationServer(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Método não permitido'});
  const base=requestBaseUrl(req);
  res.setHeader('Cache-Control','public, max-age=300');
  return json(res,200,{
    issuer:base,
    authorization_endpoint:`${base}/oauth/authorize`,
    token_endpoint:`${base}/api/oauth/token`,
    response_types_supported:['code'],
    grant_types_supported:['authorization_code','refresh_token'],
    code_challenge_methods_supported:['S256'],
    scopes_supported:['veredicta'],
    token_endpoint_auth_methods_supported:['none','client_secret_basic','client_secret_post'],
    client_id_metadata_document_supported:true
  });
}

async function oauthToken(req,res){
  if(req.method!=='POST') return oauthError(res,405,'invalid_request','Método não permitido');
  const body=await readOAuthParams(req);
  const basic=String(req.headers?.authorization||'').match(/^Basic\s+(.+)$/i);
  let basicId='',basicSecret='';
  if(basic){
    try{
      const decoded=Buffer.from(basic[1],'base64').toString('utf8');
      const idx=decoded.indexOf(':');
      if(idx>=0){basicId=decoded.slice(0,idx);basicSecret=decoded.slice(idx+1)}
    }catch{}
  }
  const clientId=String(basicId||body.client_id||'').trim();
  const clientSecret=String(basicSecret||body.client_secret||'').trim();
  if(!validateOAuthClient(clientId,clientSecret)) return oauthError(res,401,'invalid_client','Client ID ou Client Secret inválido');

  try{
    let tokens;
    if(body.grant_type==='authorization_code'){
      tokens=await exchangeAuthorizationCode({
        code:String(body.code||''),clientId,clientSecret,
        redirectUri:String(body.redirect_uri||''),codeVerifier:String(body.code_verifier||'')
      });
    }else if(body.grant_type==='refresh_token'){
      tokens=await refreshOAuthToken({refreshToken:String(body.refresh_token||''),clientId,clientSecret});
    }else{
      return oauthError(res,400,'unsupported_grant_type','Use authorization_code ou refresh_token');
    }
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Pragma','no-cache');
    return json(res,200,tokens);
  }catch(e){
    return oauthError(res,e?.statusCode||400,e?.oauthError||'invalid_grant',e?.message||'Falha OAuth');
  }
}

async function sourceStatus(req,res){
  const principal=await requireActionAuth(req,res);
  if(!principal)return;
  if(req.method!=='GET')return json(res,405,{error:'Método não permitido'});
  return json(res,200,{
    app_version:APP_VERSION,
    validator_version:VALIDATOR_VERSION,
    user:{name:principal.name,email:principal.email},
    legal_source_version:process.env.LEGAL_SOURCE_VERSION||null,
    memorandum_version:process.env.MEMORANDUM_VERSION||null,
    mp_sha256:sha(mpText),
    memorandum_sha256:sha(memoText),
    instruction:'O GPT deve usar as cópias da MP e do memorando anexadas como Knowledge, conferir as versões e usar o contract_sha256 retornado por gpt-case no envio da análise.'
  });
}


async function adminUsers(req,res){
  const session=requireAuth(req,res); if(!session)return;
  if(session.role!=='admin') return json(res,403,{error:'Acesso administrativo restrito'});

  if(req.method==='GET'){
    const users=await db(`veredicta_users?id=neq.${encodeURIComponent(LEGACY_OWNER_ID)}&select=id,name,email,role,status,subscription_status,auth_user_id,created_at,updated_at&order=created_at.desc`);
    let oauthTokens=[];
    let legacyKeys=[];
    let migrationRequired=false;
    try{
      oauthTokens=await db('veredicta_oauth_tokens?select=id,user_id,client_id,scope,status,last_used_at,access_expires_at,created_at,revoked_at&order=created_at.desc');
    }catch(e){
      if(/veredicta_oauth_tokens|schema cache|does not exist/i.test(String(e?.message||''))) migrationRequired=true;
      else throw e;
    }
    try{legacyKeys=await db('veredicta_api_keys?select=id,user_id,status,last_used_at,created_at&order=created_at.desc')}catch{}
    const now=Date.now();
    const enriched=users.map(u=>{
      const activeOAuth=oauthTokens.filter(t=>t.user_id===u.id&&t.status==='active'&&Date.parse(t.access_expires_at)>now);
      const allOAuth=oauthTokens.filter(t=>t.user_id===u.id);
      const activeLegacy=legacyKeys.filter(k=>k.user_id===u.id&&k.status==='active');
      const dates=[...allOAuth.map(t=>t.last_used_at),...legacyKeys.filter(k=>k.user_id===u.id).map(k=>k.last_used_at)].filter(Boolean).sort();
      return {...u,gpt:{connected:activeOAuth.length>0,active_oauth_sessions:activeOAuth.length,legacy_keys:activeLegacy.length,last_used_at:dates.at(-1)||null}};
    });
    return json(res,200,{users:enriched,oauth:oauthConfigStatus(requestBaseUrl(req)),migration_required:migrationRequired});
  }

  if(req.method==='POST'){
    const body=await readJson(req);
    const op=String(body.operation||'').trim();
    const userId=String(body.user_id||'').trim();
    if(!userId) return json(res,400,{error:'user_id obrigatório'});
    const users=await db(`veredicta_users?id=eq.${encodeURIComponent(userId)}&select=id,name,email,role,status&limit=1`);
    if(!users.length) return json(res,404,{error:'Usuário não encontrado'});

    if(op==='revoke_gpt'){
      await revokeUserOAuth(userId).catch(e=>{if(!/veredicta_oauth_tokens|schema cache|does not exist/i.test(String(e?.message||'')))throw e});
      await db(`veredicta_api_keys?user_id=eq.${encodeURIComponent(userId)}&status=eq.active`,{method:'PATCH',body:JSON.stringify({status:'revoked',revoked_at:new Date().toISOString()})}).catch(()=>{});
      return json(res,200,{ok:true,user:users[0]});
    }

    if(op==='set_status'){
      const status=body.status==='suspended'?'suspended':'active';
      const rows=await db(`veredicta_users?id=eq.${encodeURIComponent(userId)}`,{method:'PATCH',body:JSON.stringify({status,updated_at:new Date().toISOString()})});
      if(status==='suspended'){
        await revokeUserOAuth(userId).catch(()=>{});
        await db(`veredicta_api_keys?user_id=eq.${encodeURIComponent(userId)}&status=eq.active`,{method:'PATCH',body:JSON.stringify({status:'revoked',revoked_at:new Date().toISOString()})}).catch(()=>{});
      }
      return json(res,200,{user:rows[0]});
    }

    return json(res,400,{error:'Operação administrativa inválida'});
  }

  return json(res,405,{error:'Método não permitido'});
}


export default async function handler(req,res){
  try {
    switch(action(req)){
      case 'auth': return await auth(req,res);
      case 'register': return await register(req,res);
      case 'recover': return await recover(req,res);
      case 'stripe-webhook': return await stripeWebhook(req,res);
      case 'billing': return await billing(req,res);
      case 'oauth-authorize': return await oauthAuthorize(req,res);
      case 'oauth-token': return await oauthToken(req,res);
      case 'oauth-protected-resource': return oauthProtectedResource(req,res);
      case 'oauth-authorization-server': return oauthAuthorizationServer(req,res);
      case 'cases': return await cases(req,res);
      case 'config': return await config(req,res);
      case 'admin-users': return await adminUsers(req,res);
      case 'review': return await review(req,res);
      case 'gpt-cases': return await gptCases(req,res);
      case 'gpt-case': return await gptCase(req,res);
      case 'gpt-analysis': return await gptAnalysis(req,res);
      case 'source-status': return await sourceStatus(req,res);
      case 'gpt-analysis-history': return await gptAnalysisHistory(req,res);
      case 'gpt-analysis-detail': return await gptAnalysisDetail(req,res);
      case 'test-import': return await testImport(req,res);
      case 'test-import-ui': return await testImportUi(req,res);
      default: return json(res,404,{error:'Ação não encontrada'});
    }
  } catch(e) {
    try {
      console.error('[VEREDICTA_RUNTIME_ERROR]', JSON.stringify({
        action: action(req),
        method: req.method,
        message: e?.message || String(e),
        stack: e?.stack || null,
        supabase: supabaseConfigStatus()
      }));
    } catch {}
    const status = e?.code === 'SUPABASE_TIMEOUT' ? 504 : 500;
    return json(res,status,{error:e?.message || 'Erro interno do servidor'});
  }
}
