import crypto from 'node:crypto';
import { json } from './http.js';
import { db } from './supabase.js';
import { findOAuthAccessToken, touchOAuthToken } from './oauth.js';

export const LEGACY_OWNER_ID = '00000000-0000-0000-0000-000000000001';

function safeEqual(a, b) {
  const A = Buffer.from(String(a || ''));
  const B = Buffer.from(String(b || ''));
  if (!A.length || A.length !== B.length) return false;
  try { return crypto.timingSafeEqual(A, B); } catch { return false; }
}

export function hashApiKey(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

export function generateUserApiKey() {
  const prefix = crypto.randomBytes(5).toString('hex');
  const secret = crypto.randomBytes(32).toString('base64url');
  return `vrd_live_${prefix}_${secret}`;
}

function extractPresentedCredential(req) {
  const customHeader = String(req.headers['x-veredicta-key'] || '').trim();
  const authorization = String(req.headers.authorization || '').trim();
  const bearer = authorization.replace(/^Bearer\s+/i, '').trim();
  return {customHeader,bearer,presented:bearer||customHeader};
}

async function principalFromUserId(userId, res, extra={}){
  const users = await db(
    `veredicta_users?id=eq.${encodeURIComponent(userId)}&status=eq.active&select=id,name,email,role,status,subscription_status&limit=1`
  );
  if (!users.length) {
    json(res, 403, { error:'Usuário Veredicta inativo ou não encontrado' });
    return null;
  }
  const u = users[0];
  const isAdmin=u.role==='admin';
  if(!isAdmin && !['active','trialing'].includes(String(u.subscription_status||'').toLowerCase())){
    json(res, 402, { error:'Assinatura Veredicta sem adimplência ativa', subscription_status:u.subscription_status||'pending' });
    return null;
  }
  return {userId:u.id,email:u.email,name:u.name,role:u.role||'user',...extra};
}

export async function requireActionAuth(req, res) {
  const {customHeader,bearer,presented}=extractPresentedCredential(req);
  if (!presented) {
    json(res, 401, { error:'Action não autorizada', auth_debug:{ credential_present:false } });
    return null;
  }

  // v3.11: OAuth é o caminho preferencial para usuários individuais.
  // O bearer token identifica a conta conectada no ChatGPT sem expor chaves manuais.
  if(bearer){
    try{
      const oauth=await findOAuthAccessToken(bearer);
      if(oauth){
        if(oauth.expired){
          res.setHeader('WWW-Authenticate','Bearer error="invalid_token", error_description="expired"');
          json(res,401,{error:'Token OAuth expirado',oauth_error:'invalid_token'});
          return null;
        }
        const principal=await principalFromUserId(oauth.user_id,res,{
          authType:'oauth',oauthTokenId:oauth.id,clientId:oauth.client_id,scope:oauth.scope
        });
        if(!principal)return null;
        touchOAuthToken(oauth.id).catch(()=>{});
        return principal;
      }
    }catch(e){
      // Instalações ainda sem a migration v3.11 podem continuar usando a chave legada.
      if(!/veredicta_oauth_tokens|schema cache|does not exist/i.test(String(e?.message||''))) throw e;
    }
  }

  // Compatibilidade: a chave global antiga continua funcionando como administrador legado.
  const legacy = String(process.env.GPT_ACTION_API_KEY || '').trim();
  if (legacy && safeEqual(presented, legacy)) {
    return {
      userId: LEGACY_OWNER_ID,
      email: 'legacy-admin@veredicta.local',
      name: 'Administrador legado',
      role: 'admin',
      authType: 'legacy_global_key'
    };
  }

  // Compatibilidade de transição com chaves pessoais da v3.9/v3.10.
  const keyHash = hashApiKey(customHeader||presented);
  const keyRows = await db(
    `veredicta_api_keys?key_hash=eq.${encodeURIComponent(keyHash)}&status=eq.active&select=id,user_id,key_prefix,status&limit=1`
  );
  if (!keyRows.length) {
    json(res, 401, { error:'Action não autorizada', auth_debug:{ credential_present:true, credential_recognized:false } });
    return null;
  }

  const keyRow = keyRows[0];
  const principal=await principalFromUserId(keyRow.user_id,res,{
    authType:'user_api_key',keyId:keyRow.id,keyPrefix:keyRow.key_prefix
  });
  if(!principal)return null;

  db(`veredicta_api_keys?id=eq.${encodeURIComponent(keyRow.id)}`, {
    method:'PATCH',
    body:JSON.stringify({ last_used_at:new Date().toISOString() })
  }).catch(()=>{});

  return principal;
}
