import crypto from 'node:crypto';
import { json } from './http.js';

function safeEqual(a, b) {
  const A = Buffer.from(String(a || ''));
  const B = Buffer.from(String(b || ''));
  if (!A.length || A.length !== B.length) return false;
  try { return crypto.timingSafeEqual(A, B); } catch { return false; }
}

export function requireActionAuth(req, res) {
  const expected = process.env.GPT_ACTION_API_KEY || '';
  if (!expected) {
    json(res, 500, { error: 'GPT_ACTION_API_KEY não configurada no servidor' });
    return false;
  }
  const auth = String(req.headers.authorization || '');
  const provided = auth.replace(/^Bearer\s+/i, '').trim();
  if (!safeEqual(provided, expected)) {
    json(res, 401, { error: 'Action não autorizada' });
    return false;
  }
  return true;
}
