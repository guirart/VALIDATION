import { json, requireAuth } from '../lib/http.js';
import { supabaseConfigStatus } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido' });
  return json(res, 200, {
    supabase: supabaseConfigStatus(),
    legalSourceVersion: process.env.LEGAL_SOURCE_VERSION || null,
    memorandumVersion: process.env.MEMORANDUM_VERSION || null
  });
}
