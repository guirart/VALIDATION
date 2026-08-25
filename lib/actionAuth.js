import crypto from 'node:crypto';
import { json } from './http.js';

function safeEqual(a, b) {
  const A = Buffer.from(String(a || ''));
  const B = Buffer.from(String(b || ''));
  if (!A.length || A.length !== B.length) return false;
  try { return crypto.timingSafeEqual(A, B); } catch { return false; }
}

export function requireActionAuth(req, res) {
  const expected = String(process.env.GPT_ACTION_API_KEY || '').trim();

  if (!expected) {
    json(res, 500, {
      error: 'GPT_ACTION_API_KEY não configurada no servidor'
    });
    return false;
  }

  // Método preferencial para GPT Actions:
  // X-Veredicta-Key: <GPT_ACTION_API_KEY>
  const customHeader = String(req.headers['x-veredicta-key'] || '').trim();

  // Compatibilidade com versões anteriores:
  // Authorization: Bearer <GPT_ACTION_API_KEY>
  const authorization = String(req.headers.authorization || '').trim();
  const bearer = authorization.replace(/^Bearer\s+/i, '').trim();

  const customOk = safeEqual(customHeader, expected);
  const bearerOk = safeEqual(bearer, expected);

  if (!customOk && !bearerOk) {
    json(res, 401, {
      error: 'Action não autorizada',
      auth_debug: {
        x_veredicta_key_present: Boolean(customHeader),
        authorization_header_present: Boolean(authorization),
        authorization_bearer_detected: /^Bearer\s+/i.test(authorization)
      }
    });
    return false;
  }

  return true;
}
