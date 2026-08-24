import { json } from '../../lib/http.js';
import { requireActionAuth } from '../../lib/actionAuth.js';
import { db } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (!requireActionAuth(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido' });
  try {
    const id = String(req.query?.id || '').trim();
    if (!id) return json(res, 400, { error: 'id obrigatório' });
    const rows = await db(`cases?id=eq.${encodeURIComponent(id)}&select=id,title,client_name,contract_text,status,created_at,updated_at&limit=1`);
    if (!rows.length) return json(res, 404, { error: 'Caso não encontrado' });
    await db(`cases?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'em-analise', updated_at: new Date().toISOString() }) });
    await db('audit_logs', { method: 'POST', body: JSON.stringify({ case_id: id, event_type: 'case_fetched_by_gpt_action', payload: {} }) });
    return json(res, 200, {
      case: { ...rows[0], status: 'em-analise' },
      legal_source_version: process.env.LEGAL_SOURCE_VERSION || null,
      memorandum_version: process.env.MEMORANDUM_VERSION || null
    });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
