import { json, requireAuth } from './_lib/http.js';
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido' });
  return json(res, 200, { custom_gpt_url: process.env.CUSTOM_GPT_URL || '' });
}
