import crypto from 'node:crypto';
import { json } from './http.js';
import { db } from './supabase.js';

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

function extractPresentedKey(req) {
  const customHeader = String(req.headers['x-veredicta-key'] || '').trim();
  const authorization = String(req.headers.authorization || '').trim();
  const bearer = authorization.replace(/^Bearer\s+/i, '').trim();
  return customHeader || bearer || '';
}

export async function requireActionAuth(req, res) {
  const presented = extractPresentedKey(req);
  if (!presented) {
    json(res, 401, { error:'Action não autorizada', auth_debug:{ key_present:false } });
    return null;
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

  const keyHash = hashApiKey(presented);
  const keyRows = await db(
    `veredicta_api_keys?key_hash=eq.${encodeURIComponent(keyHash)}&status=eq.active&select=id,user_id,key_prefix,status&limit=1`
  );
  if (!keyRows.length) {
    json(res, 401, { error:'Action não autorizada', auth_debug:{ key_present:true, key_recognized:false } });
    return null;
  }

  const keyRow = keyRows[0];
  const users = await db(
    `veredicta_users?id=eq.${encodeURIComponent(keyRow.user_id)}&status=eq.active&select=id,name,email,role,status,subscription_status&limit=1`
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

  // Melhor esforço: falha ao atualizar last_used_at nunca bloqueia a análise.
  db(`veredicta_api_keys?id=eq.${encodeURIComponent(keyRow.id)}`, {
    method:'PATCH',
    body:JSON.stringify({ last_used_at:new Date().toISOString() })
  }).catch(()=>{});

  return {
    userId:u.id,
    email:u.email,
    name:u.name,
    role:u.role || 'user',
    authType:'user_api_key',
    keyId:keyRow.id,
    keyPrefix:keyRow.key_prefix
  };
}
