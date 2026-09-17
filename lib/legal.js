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
export const APPLICABILITIES = new Set(['aplicavel','nao_aplicavel','condicional']);
export const EVIDENCE_STATUSES = new Set(['comprovado','parcialmente_comprovado','nao_comprovado','nao_consta','dispensado']);
export const LEGAL_RESULTS = new Set(['atende','nao_atende','inconclusivo','nao_aplicavel']);
export const DISPLAY_STATUSES = new Set(['atinge','parcial','atencao','nao_consta','nao_se_aplica']);

/*
 * Validação de citações v3.5:
 * - matching literal, sem aproximação semântica;
 * - normalização de Markdown SOMENTE para comparação de citações;
 * - status/enums continuam usando a normalização normal, preservando underscores;
 * - distingue silêncio NORMATIVO de silêncio DOCUMENTAL.
 */

const SILENCE_POINTS = new Set([6, 12]); // compatibilidade com testes/política v3.5
const NORMATIVE_SILENCE_POINTS = SILENCE_POINTS;
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

function documentarySilenceSignals(s) {
  const text = normText(s);

  const absence = /\b(?:ausência|ausente|inexistência|não consta|não constam|não há|não existe|não existem|não informado|não informada|não comprovado|não comprovada|não demonstrado|não demonstrada|sem comprovação|sem informação|não documentado|não documentada)\b/i.test(text);
  const documentary = /\b(?:dossiê|documento|documentação|documental|prova|evidência|autos|instrumento|contrato)\b/i.test(text);
  const nonPresumption = /\b(?:não se presume|não será presumid[oa]|não deve ser presumid[oa]|não pode ser presumid[oa]|sem presunção)\b/i.test(text);
  const p11Subject = /\b(?:art\.?\s*2|artigo\s*2|linha adicional|modalidade adicional|linha de crédito adicional|contratação|utilização)\b/i.test(text);

  return {
    absence,
    documentary,
    non_presumption:nonPresumption,
    p11_subject:p11Subject,
    result:Boolean((absence && documentary) || (absence && nonPresumption) || (documentary && nonPresumption))
  };
}

function legalReferenceIsDocumentarySilence(s) {
  const sig = documentarySilenceSignals(s);
  return sig.result && sig.p11_subject;
}

function reasoningDeclaresDocumentarySilence(s) {
  const sig = documentarySilenceSignals(s);
  return sig.result && sig.p11_subject;
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
  const legalReferenceDocumentarySignals = documentarySilenceSignals(p.legal_reference);
  const reasoningDocumentarySignals = documentarySilenceSignals(p.reasoning);

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
        legal_reference_documentary_signals:legalReferenceDocumentarySignals,
        reasoning_documentary_signals:reasoningDocumentarySignals,
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
        legal_reference_documentary_signals:legalReferenceDocumentarySignals,
        reasoning_documentary_signals:reasoningDocumentarySignals,
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
        legal_reference_documentary_signals:legalReferenceDocumentarySignals,
        reasoning_documentary_signals:reasoningDocumentarySignals,
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

function canonicalApplicability(v) {
  return normText(v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function canonicalDisplayStatus(v) {
  const n = normText(v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
  if (n === 'atencao') return 'atencao';
  if (n === 'nao_aplicavel' || n === 'nao_se_aplica') return 'nao_se_aplica';
  return n;
}

function deriveDisplayStatus(applicability, evidenceStatus, legalResult) {
  if (applicability === 'nao_aplicavel' || legalResult === 'nao_aplicavel') return 'nao_se_aplica';
  if (legalResult === 'nao_atende') return 'atencao';
  if (legalResult === 'atende' && evidenceStatus === 'comprovado') return 'atinge';
  if (evidenceStatus === 'nao_consta' || evidenceStatus === 'nao_comprovado') return 'nao_consta';
  return 'parcial';
}

function displayLabelFromStatus(status) {
  return ({
    atinge:'ATINGE',
    parcial:'PARCIAL',
    atencao:'ATENÇÃO',
    nao_consta:'NÃO CONSTA',
    nao_se_aplica:'NÃO SE APLICA'
  })[status] || 'PARCIAL';
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
    const applicability = canonicalApplicability(p.applicability);
    const evidenceStatus = canonicalEvidenceStatus(p.evidence_status);
    const legalResult = canonicalLegalResult(p.legal_result);
    const suppliedDisplayStatus = canonicalDisplayStatus(p.display_status || p.display_label);
    const displayStatus = deriveDisplayStatus(applicability, evidenceStatus, legalResult);

    if (!Number.isInteger(number) || number < 1 || number > 15) {
      errors.push(`número de ponto inválido: ${p.point ?? p.number}`);
    }
    if (seen.has(number)) errors.push(`ponto ${number} duplicado`);
    seen.add(number);

    if (!APPLICABILITIES.has(applicability)) errors.push(`applicability inválido/ausente no ponto ${number}`);
    if (!EVIDENCE_STATUSES.has(evidenceStatus)) errors.push(`evidence_status inválido/ausente no ponto ${number}`);
    if (!LEGAL_RESULTS.has(legalResult)) errors.push(`legal_result inválido/ausente no ponto ${number}`);
    if (p.display_status && !DISPLAY_STATUSES.has(canonicalDisplayStatus(p.display_status))) errors.push(`display_status inválido no ponto ${number}`);
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

    // v3.8 — coerência entre aplicabilidade, prova, resultado jurídico e exibição.
    if (applicability === 'nao_aplicavel') {
      if (legalResult !== 'nao_aplicavel') {
        errors.push(`ponto ${number}: applicability "nao_aplicavel" exige legal_result "nao_aplicavel"`);
      }
      if (evidenceStatus !== 'dispensado') {
        errors.push(`ponto ${number}: applicability "nao_aplicavel" exige evidence_status "dispensado"`);
      }
    }

    if (legalResult === 'nao_aplicavel' && applicability !== 'nao_aplicavel') {
      errors.push(`ponto ${number}: legal_result "nao_aplicavel" exige applicability "nao_aplicavel"`);
    }

    if (evidenceStatus === 'dispensado' && applicability !== 'nao_aplicavel') {
      errors.push(`ponto ${number}: evidence_status "dispensado" só é válido quando applicability="nao_aplicavel"`);
    }

    if (evidenceStatus === 'nao_consta' && !absentContractEvidence) {
      errors.push(`ponto ${number}: evidence_status "nao_consta" contradiz citação contratual localizada`);
    }
    if (evidenceStatus === 'comprovado' && absentContractEvidence) {
      errors.push(`ponto ${number}: evidence_status "comprovado" contradiz marcador de ausência documental`);
    }
    if (legalResult === 'atende' && evidenceStatus !== 'comprovado') {
      errors.push(`ponto ${number}: resultado "atende" exige evidência comprovada`);
    }
    if (legalResult === 'nao_atende' && ['nao_consta','dispensado'].includes(evidenceStatus)) {
      errors.push(`ponto ${number}: resultado "nao_atende" é incompatível com evidence_status "${evidenceStatus}"`);
    }

    // display_status é consequência, não uma quinta opinião independente.
    if (p.display_status && suppliedDisplayStatus !== displayStatus) {
      errors.push(`ponto ${number}: display_status "${suppliedDisplayStatus}" contradiz o status derivado "${displayStatus}"`);
    }

    // v3.8.1 — verdict é estritamente legado.
    // Entradas antigas podem enviar valores incompatíveis; isso NÃO reprova o quality gate.
    // O backend sempre sobrescreve o legado a partir do display_status derivado, evitando
    // que um campo de compatibilidade obrigue a taxonomia nova a voltar para "parcial".
    const normalizedLegacyVerdict = displayStatus === 'nao_se_aplica' || displayStatus === 'nao_consta'
      ? 'ausente'
      : displayStatus;

    return {
      ...p,
      point: number,
      number, // compatibilidade visual com versões anteriores
      applicability,
      evidence_status: evidenceStatus,
      legal_result: legalResult,
      display_status: displayStatus,
      display_label: displayLabelFromStatus(displayStatus),
      verdict: normalizedLegacyVerdict,
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
