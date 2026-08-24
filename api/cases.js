import { json, readJson, requireAuth } from './_lib/http.js';
import { db } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const rows = await db('cases?select=*,analyses(id,final_classification,quality_gate,auditor_recommendation,created_at)&order=created_at.desc');
      return json(res, 200, { cases: rows });
    }
    if (req.method === 'POST') {
      const body = await readJson(req);
      if (!body.title || !body.contract_text) return json(res, 400, { error: 'Título e texto do contrato são obrigatórios' });
      const [row] = await db('cases', { method: 'POST', body: JSON.stringify({
        title: String(body.title).slice(0, 180),
        client_name: String(body.client_name || '').slice(0, 180),
        contract_text: String(body.contract_text),
        status: 'pendente'
      })});
      return json(res, 201, { case: row });
    }
    return json(res, 405, { error: 'Método não permitido' });
  } catch (e) { return json(res, 500, { error: e.message }); }
}
