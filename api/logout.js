import { json, clearSessionCookie } from './_lib/http.js';
export default async function handler(req, res) {
  res.setHeader('Set-Cookie', clearSessionCookie());
  return json(res, 200, { ok: true });
}
