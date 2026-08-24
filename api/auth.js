import crypto from 'node:crypto';
import { json, readJson, makeSessionCookie, clearSessionCookie, isAuthenticated } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, { authenticated: isAuthenticated(req), passwordRequired: true });
  }

  if (req.method === 'POST') {
    const { password = '' } = await readJson(req);
    const expected = process.env.APP_PASSWORD || 'marcal2015';
    const a = Buffer.from(String(password));
    const b = Buffer.from(String(expected));
    const ok = expected && a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) return json(res, 401, { error: 'Senha inválida' });
    res.setHeader('Set-Cookie', makeSessionCookie());
    return json(res, 200, { ok: true });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return json(res, 200, { ok: true });
  }

  return json(res, 405, { error: 'Método não permitido' });
}
