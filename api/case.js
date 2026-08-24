import { json, requireAuth } from './_lib/http.js';
import { db } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  try {
    const id = String(req.query?.id || '');
    if (!id) return json(res, 400, { error: 'id obrigatório' });
    const rows = await db(`cases?id=eq.${encodeURIComponent(id)}&select=*,analyses(*),reviews(*)&limit=1`);
    if (!rows.length) return json(res, 404, { error: 'Caso não encontrado' });
    return json(res, 200, { case: rows[0] });
  } catch (e) { return json(res, 500, { error: e.message }); }
}
