import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

export const mpText = fs.readFileSync(path.join(root, 'legal/MP_1376_2026_texto_integral.md'), 'utf8');
export const memoText = fs.readFileSync(path.join(root, 'legal/15_pontos_analise_MP_1376.md'), 'utf8');
export const analystRules = fs.readFileSync(path.join(root, 'prompts/analista-contratos-rurais.md'), 'utf8');
export const auditorRules = fs.readFileSync(path.join(root, 'prompts/auditor-precedentes.md'), 'utf8');

export const VERDICTS = new Set(['atinge', 'parcial', 'atencao', 'ausente']);
export const FINAL_CLASSES = new Set(['enquadrável', 'parcialmente enquadrável', 'inconclusivo', 'não enquadrável']);
export const EVIDENCE_STATUSES = new Set(['comprovado','parcialmente_comprovado','nao_comprovado','nao_consta']);
export const LEGAL_RESULTS = new Set(['atende','nao_atende','inconclusivo','nao_aplicavel']);

/*
 * Validação de citações v3.5:
 * - matching literal, sem aproximação semântica;
 * - normalização de Markdown SOMENTE para comparação de citações;
 * - status/enums continuam usando a normalização normal, preservando underscores;
 * - distingue silêncio NORMATIVO de silêncio DOCUMENTAL.
 */

const NORMATIVE_SILENCE_POINTS = new Set([6, 12]);
const DOCUMENTARY_SILENCE_POINTS = new Set([11]);

function normText(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/\u00A0/g, ' ')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function normQuoteText(s) {
  return String(s ?? '')
    .replace(/[*_`]/g, '')
    .normalize('NFKC')
    .replace(/\u00A0/g, ' ')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function unwrapQuote(s) {
  let v = normQuoteText(s);
  v = v.replace(/^["']+|["']+$/g, '').trim();
  v = v.replace(/^(?:\.\.\.|…)\s*/, '').replace(/\s*(?:\.\.\.|…)$/, '').trim();
  return v;
}

function exactQuoteExists(source, quote) {
  const q = unwrapQuote(quote);
  if (!q) return false;
  return normQuoteText(source).includes(q);
}

function quoteIsAbsentMarker(s) {
  return /^(?:não consta|não consta no dossiê|não comprovado|não há comprovação|ausente no documento|não localizado|não informado|não foi apresentado|não foi juntado|não se aplica)(?:\b|[.:;-])/i.test(String(s || '').trim());
}

function silenceMarker(s) {
  return /sem previsão expressa|não há previsão expressa|não contém previsão expressa|silêncio da mp|silêncio normativo|ausência de previsão expressa|não existe previsão expressa|não consta previsão expressa/i.test(String(s || ''));
}

function legalReferenceIsSilence(s) {
  return /silêncio normativo|silêncio da mp|ausência de previsão|sem previsão expressa|não há previsão expressa|não contém previsão expressa/i.test(String(s || ''));
}

function reasoningDeclaresSilence(s) {
  return /silêncio normativo|silêncio da mp|ausência de previsão expressa|sem previsão expressa|não há previsão expressa|não contém previsão expressa|não consta previsão expressa|não existe previsão expressa/i.test(String(s || ''));
}

function legalReferenceIsDocumentarySilence(s) {
  return /silêncio do dossiê|ausência documental|ausência de informação no dossiê|não consta no dossiê|não informado no dossiê|não comprovado no dossiê/i.test(String(s || ''));
}

function reasoningDeclaresDocumentarySilence(s) {
  return /não (?:há|consta|existe) (?:previsão expressa |informação |comprovação )?(?:no|do) dossiê|não consta no dossiê|ausência documental|não se presume|não foi demonstrad[oa] no dossiê|não foi comprovad[oa] no dossiê/i.test(String(s || ''));
}

function validateMpEvidenceForPoint(number, p) {
  const quote = String(p.mp_quote || '').trim();
  const literalOk = Boolean(quote) && exactQuoteExists(mpText, quote);

  const normativeSilenceAllowed = NORMATIVE_SILENCE_POINTS.has(number);
  const documentarySilenceAllowed = DOCUMENTARY_SILENCE_POINTS.has(number);

  const refSilence = legalReferenceIsSilence(p.legal_reference);
  const reasoningSilence = reasoningDeclaresSilence(p.reasoning);

  const refDocumentarySilence = legalReferenceIsDocumentarySilence(p.legal_reference);
  const reasoningDocumentarySilence = reasoningDeclaresDocumentarySilence(p.reasoning);

  const quoteSilence = !quote || silenceMarker(quote);
  const evidenceStatus = canonicalEvidenceStatus(p.evidence_status);
  const legalResult = canonicalLegalResult(p.legal_result);

  // 1) Citação literal válida.
  if (literalOk) {
    return {
      ok:true,
      mode:'literal',
      error:null,
      debug:{
        point:number,
        literal_quote_found:true,
        silence_allowed:normativeSilenceAllowed,
        documentary_silence_allowed:documentarySilenceAllowed,
        legal_reference_silence:refSilence,
        reasoning_silence:reasoningSilence,
        legal_reference_documentary_silence:refDocumentarySilence,
        reasoning_documentary_silence:reasoningDocumentarySilence,
        quote_silence:quoteSilence,
        result:true
      }
    };
  }

  // 2) Pontos 6 e 12: silêncio normativo verdadeiro.
  if (
    normativeSilenceAllowed &&
    refSilence &&
    reasoningSilence &&
    quoteSilence
  ) {
    return {
      ok:true,
      mode:'normative_silence',
      error:null,
      debug:{
        point:number,
        literal_quote_found:false,
        silence_allowed:true,
        documentary_silence_allowed:documentarySilenceAllowed,
        legal_reference_silence:true,
        reasoning_silence:true,
        legal_reference_documentary_silence:refDocumentarySilence,
        reasoning_documentary_silence:reasoningDocumentarySilence,
        quote_silence:true,
        result:true
      }
    };
  }

  /*
   * 3) Ponto 11: ausência de contratação/utilização da linha adicional
   * pode ser ausência DOCUMENTAL, não silêncio da MP.
   *
   * mp_quote vazio só é aceito quando a ausência está declarada no
   * legal_reference e reasoning, e a conclusão continua conservadora.
   */
  const documentaryOutcomeOk =
    ['inconclusivo','nao_aplicavel'].includes(legalResult) &&
    ['parcialmente_comprovado','nao_comprovado','nao_consta'].includes(evidenceStatus);

  if (
    documentarySilenceAllowed &&
    !quote &&
    refDocumentarySilence &&
    reasoningDocumentarySilence &&
    documentaryOutcomeOk
  ) {
    return {
      ok:true,
      mode:'documentary_silence',
      error:null,
      debug:{
        point:number,
        literal_quote_found:false,
        silence_allowed:false,
        documentary_silence_allowed:true,
        legal_reference_silence:refSilence,
        reasoning_silence:reasoningSilence,
        legal_reference_documentary_silence:true,
        reasoning_documentary_silence:true,
        quote_silence:true,
        result:true
      }
    };
  }

  let error;
  if (normativeSilenceAllowed) {
    error = `ponto ${number}: informe citação literal verificável da MP ou, se o fundamento for realmente silêncio normativo, declare a ausência de previsão expressa na referência e no raciocínio sem inventar citação`;
  } else if (documentarySilenceAllowed && !quote) {
    error = `ponto ${number}: mp_quote vazio só é aceito quando referência e raciocínio declaram expressamente ausência documental no dossiê e o resultado é inconclusivo ou não aplicável`;
  } else {
    error = `citação da MP não verificada no ponto ${number}`;
  }

  return {
    ok:false,
    mode:'invalid',
    error,
    debug:{
      point:number,
      literal_quote_found:literalOk,
      silence_allowed:normativeSilenceAllowed,
      documentary_silence_allowed:documentarySilenceAllowed,
      legal_reference_silence:refSilence,
      reasoning_silence:reasoningSilence,
      legal_reference_documentary_silence:refDocumentarySilence,
      reasoning_documentary_silence:reasoningDocumentarySilence,
      quote_silence:quoteSilence,
      result:false
    }
  };
}

// Pontos 6 e 12 podem, conforme o subtema do checklist, ser fundados em silêncio normativo.
 // Nesses pontos o sistema aceita silêncio apenas quando a própria referência jurídica
 // declara expressamente a ausência de previsão; jamais aceita paráfrase como citação.
// Ele não deve fabricar uma "citação literal" inexistente.

function canonicalVerdict(v) {
  const n = normText(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return n === 'atencao' ? 'atencao' : n;
}

function canonicalEvidenceStatus(v) {
  return normText(v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function canonicalLegalResult(v) {
  return normText(v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function deriveLegacyVerdict(evidenceStatus, legalResult) {
  if (evidenceStatus === 'nao_consta' || evidenceStatus === 'nao_comprovado') return 'ausente';
  if (legalResult === 'atende' && evidenceStatus === 'comprovado') return 'atinge';
  if (legalResult === 'nao_atende') return 'atencao';
  return 'parcial';
}

export function verifyAnalysis(analysis, contractText) {
  const errors = [];

  if (!analysis || typeof analysis !== 'object') {
    return { valid:false, errors:['análise ausente'], analysis:analysis || {} };
  }
  if (!Array.isArray(analysis.points)) errors.push('points ausente');
  if ((analysis.points || []).length !== 15) {
    errors.push(`esperados 15 pontos; recebidos ${(analysis.points || []).length}`);
  }
  if (!FINAL_CLASSES.has(analysis.final_classification)) {
    errors.push('classificação final inválida');
  }

  const seen = new Set();
  const points = (analysis.points || []).map((raw, idx) => {
    const p = { ...raw };
    // O schema da Action usa "point". "number" é aceito só por compatibilidade.
    const number = Number(p.point ?? p.number ?? idx + 1);
    const evidenceStatus = canonicalEvidenceStatus(p.evidence_status);
    const legalResult = canonicalLegalResult(p.legal_result);
    const verdict = canonicalVerdict(p.verdict) || deriveLegacyVerdict(evidenceStatus, legalResult);

    if (!Number.isInteger(number) || number < 1 || number > 15) {
      errors.push(`número de ponto inválido: ${p.point ?? p.number}`);
    }
    if (seen.has(number)) errors.push(`ponto ${number} duplicado`);
    seen.add(number);

    if (!EVIDENCE_STATUSES.has(evidenceStatus)) errors.push(`evidence_status inválido/ausente no ponto ${number}`);
    if (!LEGAL_RESULTS.has(legalResult)) errors.push(`legal_result inválido/ausente no ponto ${number}`);
    if (!VERDICTS.has(verdict)) errors.push(`veredito legado inválido no ponto ${number}`);
    if (!String(p.title || '').trim()) errors.push(`título ausente no ponto ${number}`);
    if (!String(p.legal_reference || '').trim()) errors.push(`referência legal ausente no ponto ${number}`);
    if (!String(p.reasoning || '').trim()) errors.push(`raciocínio ausente no ponto ${number}`);

    const mpValidation = validateMpEvidenceForPoint(number, p);
    const mpOk = mpValidation.ok;
    const mpVerificationMode = mpValidation.mode;
    if (!mpValidation.ok && mpValidation.error) errors.push(mpValidation.error);

    const absentContractEvidence = quoteIsAbsentMarker(p.contract_quote);
    const contractOk = absentContractEvidence || exactQuoteExists(contractText, p.contract_quote);

    if (!contractOk) errors.push(`citação do contrato não verificada no ponto ${number}`);

    // Coerência entre prova e consequência jurídica.
    if (evidenceStatus === 'nao_consta' && !absentContractEvidence) {
      errors.push(`ponto ${number}: evidence_status "nao_consta" contradiz citação contratual localizada`);
    }
    if (evidenceStatus === 'comprovado' && absentContractEvidence) {
      errors.push(`ponto ${number}: evidence_status "comprovado" contradiz marcador de ausência documental`);
    }
    if (legalResult === 'atende' && !['comprovado'].includes(evidenceStatus)) {
      errors.push(`ponto ${number}: resultado "atende" exige evidência comprovada`);
    }
    if (legalResult === 'nao_atende' && evidenceStatus === 'nao_consta') {
      errors.push(`ponto ${number}: não é possível concluir "nao_atende" quando a evidência relevante "nao_consta"; use "inconclusivo" ou "nao_aplicavel" conforme o caso`);
    }
    if (verdict === 'atinge' && absentContractEvidence) {
      errors.push(`ponto ${number} não pode ser "atinge" com evidência contratual ausente`);
    }

    return {
      ...p,
      point: number,
      number, // compatibilidade visual com versões anteriores
      evidence_status: evidenceStatus,
      legal_result: legalResult,
      verdict: deriveLegacyVerdict(evidenceStatus, legalResult),
      mp_quote_verified: mpOk,
      mp_verification_mode: mpVerificationMode,
      mp_validation_debug: mpValidation.debug,
      contract_quote_verified: contractOk,
      contract_evidence_absent: absentContractEvidence
    };
  });

  // Garante conjunto exato 1..15, e não apenas "15 itens".
  for (let n = 1; n <= 15; n++) {
    if (!seen.has(n)) errors.push(`ponto ${n} ausente`);
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    analysis: { ...analysis, points },
    validation_debug: points.map(p => p.mp_validation_debug)
  };
}
