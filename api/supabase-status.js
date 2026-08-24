import { json, requireAuth } from './_lib/http.js';
import { supabaseConfigStatus } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido' });
  return json(res, 200, supabaseConfigStatus());
}
