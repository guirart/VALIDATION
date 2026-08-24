import { json, requireAuth } from './_lib/http.js';
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  return json(res, 410, {
    error: 'A análise não é executada pelo app. Use o GPT personalizado conectado pelas Actions.',
    mode: 'gpt_action'
  });
}
