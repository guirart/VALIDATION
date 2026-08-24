import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

export const mpText = fs.readFileSync(path.join(root, 'legal/MP_1376_2026_texto_integral.md'), 'utf8');
export const memoText = fs.readFileSync(path.join(root, 'legal/15_pontos_analise_MP_1376.md'), 'utf8');
export const analystRules = fs.readFileSync(path.join(root, 'prompts/analista-contratos-rurais.md'), 'utf8');
export const auditorRules = fs.readFileSync(path.join(root, 'prompts/auditor-precedentes.md'), 'utf8');

export const VERDICTS = new Set(['atinge', 'parcial', 'atenção', 'ausente']);
export const FINAL_CLASSES = new Set(['enquadrável', 'parcialmente enquadrável', 'inconclusivo', 'não enquadrável']);

function norm(s) {
  return String(s || '')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function quoteIsAbsentMarker(s) {
  return /não consta|ausente no documento|não localizado|não se aplica/i.test(String(s || ''));
}

export function verifyAnalysis(analysis, contractText) {
  const errors = [];
  if (!analysis || !Array.isArray(analysis.points)) errors.push('points ausente');
  if (analysis?.points?.length !== 15) errors.push(`esperados 15 pontos; recebidos ${analysis?.points?.length ?? 0}`);
  if (!FINAL_CLASSES.has(analysis?.final_classification)) errors.push('classificação final inválida');

  const seen = new Set();
  const points = (analysis?.points || []).map((p, idx) => {
    const number = Number(p.number || idx + 1);
    if (seen.has(number)) errors.push(`ponto ${number} duplicado`);
    seen.add(number);
    if (!VERDICTS.has(p.verdict)) errors.push(`veredito inválido no ponto ${number}`);
    if (!p.legal_reference) errors.push(`referência legal ausente no ponto ${number}`);

    const mpOk = !!p.mp_quote && norm(mpText).includes(norm(p.mp_quote));
    const contractOk = quoteIsAbsentMarker(p.contract_quote) || (!!p.contract_quote && norm(contractText).includes(norm(p.contract_quote)));
    if (!mpOk) errors.push(`citação da MP não verificada no ponto ${number}`);
    if (!contractOk) errors.push(`citação do contrato não verificada no ponto ${number}`);
    return { ...p, number, mp_quote_verified: mpOk, contract_quote_verified: contractOk };
  });

  return { valid: errors.length === 0, errors, analysis: { ...analysis, points } };
}
