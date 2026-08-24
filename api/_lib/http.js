import crypto from 'node:crypto';

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error('JSON inválido'); }
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

function sign(value) {
  const secret = process.env.APP_SESSION_SECRET || 'veredicta-session-marcal2015-v1-2026';
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function makeSessionCookie() {
  const issued = String(Date.now());
  const token = `${issued}.${sign(issued)}`;
  return `veredicta_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200; Secure`;
}

export function clearSessionCookie() {
  return 'veredicta_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Secure';
}

export function isAuthenticated(req) {
  // O app exige autenticação mesmo sem variáveis de ambiente na Vercel.
  // APP_PASSWORD pode sobrescrever a senha padrão definida no login.
  const passwordEnabled = Boolean(process.env.APP_PASSWORD || 'marcal2015');
  if (!passwordEnabled) return true;
  const token = cookies(req).veredicta_session;
  if (!token) return false;
  const [issued, signature] = token.split('.');
  if (!issued || !signature) return false;
  const expected = sign(issued);
  if (!expected || signature.length !== expected.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  } catch { return false; }
  const age = Date.now() - Number(issued);
  return Number.isFinite(age) && age >= 0 && age < 12 * 60 * 60 * 1000;
}

export function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  json(res, 401, { error: 'Não autenticado' });
  return false;
}
