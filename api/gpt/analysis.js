import { json, readJson } from '../_lib/http.js';
import { requireActionAuth } from '../_lib/actionAuth.js';
import { db } from '../_lib/supabase.js';
import { verifyAnalysis, FINAL_CLASSES } from '../_lib/legal.js';

const AUDIT_RECOMMENDATIONS = new Set(['liberar','corrigir','escalar para revisão humana aprofundada']);
const AUDIT_STATUSES = new Set(['confirmado','divergente','não encontrado','opinião sem precedente']);

function verifyAudit(audit, analyst) {
  const errors = [];
  if (!audit || typeof audit !== 'object') return { valid: false, errors: ['auditoria ausente'] };
  if (!AUDIT_RECOMMENDATIONS.has(audit.recommendation)) errors.push('recomendação de auditoria inválida');
  if (!FINAL_CLASSES.has(audit.final_classification)) errors.push('classificação final da auditoria inválida');
  if (!Array.isArray(audit.findings)) errors.push('findings da auditoria ausente');
  const findings = Array.isArray(audit.findings) ? audit.findings : [];
  if (findings.length !== 15) errors.push(`auditoria deve conter 15 findings; recebidos ${findings.length}`);
  const seen = new Set();
  for (const f of findings) {
    const point = Number(f.point);
    if (!Number.isInteger(point) || point < 1 || point > 15) errors.push(`número de ponto inválido na auditoria: ${f.point}`);
    if (seen.has(point)) errors.push(`ponto ${point} duplicado na auditoria`);
    seen.add(point);
    if (!AUDIT_STATUSES.has(f.status)) errors.push(`status de auditoria inválido no ponto ${point}`);
  }
  if (audit.recommendation === 'liberar') {
    const notConfirmed = findings.filter(f => f.status !== 'confirmado').map(f => f.point);
    if (notConfirmed.length) errors.push(`auditoria não pode liberar com pontos não confirmados: ${notConfirmed.join(', ')}`);
    if (audit.final_classification !== analyst.final_classification) errors.push('auditoria liberou com classificação divergente do analista');
  }
  return { valid: errors.length === 0, errors };
}

export default async function handler(req, res) {
  if (!requireActionAuth(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido' });
  try {
    const body = await readJson(req);
    const caseId = String(body.case_id || '').trim();
    if (!caseId || !body.analyst || !body.audit) return json(res, 400, { error: 'case_id, analyst e audit são obrigatórios' });

    const rows = await db(`cases?id=eq.${encodeURIComponent(caseId)}&select=*&limit=1`);
    if (!rows.length) return json(res, 404, { error: 'Caso não encontrado' });
    const c = rows[0];

    const analystCheck = verifyAnalysis(body.analyst, c.contract_text);
    const auditCheck = verifyAudit(body.audit, analystCheck.analysis);
    const validationErrors = [...analystCheck.errors, ...auditCheck.errors];
    const recommendation = AUDIT_RECOMMENDATIONS.has(body.audit.recommendation)
      ? body.audit.recommendation
      : 'escalar para revisão humana aprofundada';
    const qualityGate = analystCheck.valid && auditCheck.valid && recommendation === 'liberar';
    const finalClassification = FINAL_CLASSES.has(body.audit.final_classification)
      ? body.audit.final_classification
      : analystCheck.analysis.final_classification;

    const [analysisRow] = await db('analyses', { method: 'POST', body: JSON.stringify({
      case_id: caseId,
      analyst_json: analystCheck.analysis,
      audit_json: body.audit,
      final_classification: finalClassification,
      auditor_recommendation: recommendation,
      quality_gate: qualityGate,
      validation_errors: validationErrors,
      legal_source_version: process.env.LEGAL_SOURCE_VERSION || null,
      memorandum_version: process.env.MEMORANDUM_VERSION || null,
      model_name: 'ChatGPT Custom GPT via Action'
    })});

    const status = qualityGate ? 'aguardando-revisao' : 'requer-correcao';
    await db(`cases?id=eq.${encodeURIComponent(caseId)}`, { method: 'PATCH', body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
    await db('audit_logs', { method: 'POST', body: JSON.stringify({
      case_id: caseId,
      analysis_id: analysisRow.id,
      event_type: 'analysis_submitted_by_gpt_action',
      payload: { quality_gate: qualityGate, recommendation, validation_errors: validationErrors }
    })});

    return json(res, 200, {
      accepted: true,
      analysis_id: analysisRow.id,
      case_id: caseId,
      status,
      quality_gate: qualityGate,
      final_classification: finalClassification,
      auditor_recommendation: recommendation,
      validation_errors: validationErrors,
      next_step: qualityGate ? 'Revisão humana obrigatória no app.' : 'Corrija os itens apontados e reenvie a análise.'
    });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}
