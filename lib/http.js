import crypto from 'node:crypto';

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error('JSON inválido'); }
}

export async function readRaw(req){
  if(typeof req.body==='string') return req.body;
  if(Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  let raw='';
  for await(const chunk of req) raw += chunk;
  return raw;
}

function cookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx < 0) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function secret(){
  return process.env.APP_SESSION_SECRET || '';
}

function sign(value) {
  if (!secret()) return '';
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

function b64url(value){
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
function unb64url(value){
  try{return JSON.parse(Buffer.from(value,'base64url').toString('utf8'))}catch{return null}
}

export function makeSessionCookie(session) {
  if(!secret()) throw new Error('APP_SESSION_SECRET não configurado.');
  const payload=b64url({
    sub:String(session?.userId||''),
    profileId:String(session?.profileId||''),
    email:String(session?.email||''),
    name:String(session?.name||''),
    role:String(session?.role||'user'),
    iat:Date.now()
  });
  const token = `${payload}.${sign(payload)}`;
  return `veredicta_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200; Secure`;
}

export function clearSessionCookie() {
  return 'veredicta_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure';
}

export function getSession(req) {
  const token = cookies(req).veredicta_session;
  if (!token || !secret()) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (!expected || signature.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  } catch { return null; }
  const data=unb64url(payload);
  if(!data?.sub||!data?.profileId||!Number.isFinite(Number(data?.iat))) return null;
  const age = Date.now() - Number(data.iat);
  if(age<0||age>=12*60*60*1000) return null;
  return {userId:data.sub,profileId:data.profileId,email:data.email,name:data.name,role:data.role||'user'};
}

export function isAuthenticated(req) { return Boolean(getSession(req)); }

export function requireAuth(req, res) {
  const session=getSession(req);
  if (session) return session;
  json(res, 401, { error: 'Não autenticado' });
  return null;
}
