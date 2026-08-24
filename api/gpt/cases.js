import { json, readJson } from '../_lib/http.js';
import { requireActionAuth } from '../_lib/actionAuth.js';
import { db } from '../_lib/supabase.js';

const ALLOWED_STATUS = new Set(['pendente','em-analise','aguardando-revisao','requer-correcao','concluido','erro']);

export default async function handler(req, res) {
  if (!requireActionAuth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const status = String(req.query?.status || '').trim();
      const filter = status && ALLOWED_STATUS.has(status) ? `&status=eq.${encodeURIComponent(status)}` : '';
      const rows = await db(`cases?select=id,title,client_name,status,created_at,updated_at${filter}&order=created_at.desc&limit=50`);
      return json(res, 200, { cases: rows });
    }
    if (req.method === 'POST') {
      const body = await readJson(req);
      if (!body.title || !body.contract_text) return json(res, 400, { error: 'title e contract_text são obrigatórios' });
      const [row] = await db('cases', { method: 'POST', body: JSON.stringify({
        title: String(body.title).slice(0, 180),
        client_name: String(body.client_name || '').slice(0, 180),
        contract_text: String(body.contract_text),
        status: 'pendente'
      })});
      await db('audit_logs', { method: 'POST', body: JSON.stringify({
        case_id: row.id,
        event_type: 'case_created_by_gpt_action',
        payload: { title: row.title }
      })});
      return json(res, 201, { case: { id: row.id, title: row.title, client_name: row.client_name, status: row.status } });
    }
    return json(res, 405, { error: 'Método não permitido' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
