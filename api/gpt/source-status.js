import { json } from '../_lib/http.js';
import { requireActionAuth } from '../_lib/actionAuth.js';
import { mpText, memoText } from '../_lib/legal.js';
import crypto from 'node:crypto';

const sha = s => crypto.createHash('sha256').update(s).digest('hex');

export default async function handler(req, res) {
  if (!requireActionAuth(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido' });
  return json(res, 200, {
    legal_source_version: process.env.LEGAL_SOURCE_VERSION || null,
    memorandum_version: process.env.MEMORANDUM_VERSION || null,
    mp_sha256: sha(mpText),
    memorandum_sha256: sha(memoText),
    instruction: 'O GPT deve usar as cópias da MP e do memorando anexadas como Knowledge e conferir se as versões informadas no GPT correspondem às versões retornadas aqui.'
  });
}
