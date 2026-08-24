import { json, readJson, requireAuth } from './_lib/http.js';
import { db } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido' });
  try {
    const body = await readJson(req);
    if (!body.case_id || !body.analysis_id || !body.reviewer_name || !['aprovado','devolver'].includes(body.decision)) {
      return json(res, 400, { error: 'Dados de revisão incompletos' });
    }
    const [review] = await db('reviews', { method: 'POST', body: JSON.stringify({
      case_id: body.case_id,
      analysis_id: body.analysis_id,
      reviewer_name: String(body.reviewer_name).slice(0, 180),
      reviewer_oab: String(body.reviewer_oab || '').slice(0, 80),
      decision: body.decision,
      notes: String(body.notes || '')
    })});
    await db(`cases?id=eq.${body.case_id}`, { method: 'PATCH', body: JSON.stringify({ status: body.decision === 'aprovado' ? 'concluido' : 'requer-correcao' }) });
    await db('audit_logs', { method: 'POST', body: JSON.stringify({ case_id: body.case_id, analysis_id: body.analysis_id, event_type: 'human_review', payload: review }) });
    return json(res, 200, { review });
  } catch (e) { return json(res, 500, { error: e.message }); }
}
