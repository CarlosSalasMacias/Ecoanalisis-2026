/**
 * Interpretación redactada por la IA bajo reglas estrictas, y auditoría del texto que devuelve.
 *
 * Reglas que se imponen a la IA:
 * - Solo puede usar las cifras del resumen de resultados (dossier).
 * - Solo puede citar con claves [@clave] de la bibliografía fija; no escribe lista de referencias.
 * - No compara con otros estudios: deja marcas [COMPARAR: …] para que los autores lo hagan.
 *
 * Después, el auditor:
 * - Sustituye las claves por citas (Autor, año) y añade la lista de referencias desde references.ts.
 * - Marca claves inexistentes, citas con formato autor-año escritas por la IA y cifras que no
 *   aparecen en el dossier, y elimina cualquier lista de referencias que haya escrito la IA.
 */
import { METHOD_REFERENCES, REFERENCES, cite, formatBibliography } from '../references';

export interface AuditIssues {
  /** Claves [@x] que no existen en la bibliografía fija. */
  invalidKeys: string[];
  /** Citas autor-año escritas directamente por la IA (no verificables). */
  unkeyedCitations: string[];
  /** Cifras del texto que no salen de los resultados calculados. */
  untraceableNumbers: string[];
  /** La IA escribió su propia lista de referencias y se eliminó. */
  removedReferenceSection: boolean;
  /** Número de marcas [COMPARAR: …] que los autores deben completar. */
  placeholders: number;
}

export interface AuditedText {
  markdown: string;
  citedKeys: string[];
  issues: AuditIssues;
}

const KEY_RE = /\[((?:\s*@[\w-]+\s*;?)+)\]/g;
const PLACEHOLDER_RE = /\[(?:COMPARAR|COMPARE)\s*:[^\]]*\]/gi;
const REFERENCE_HEADING_RE = /^\s{0,3}#{1,6}\s*(?:\d+\.\s*)?(?:referencias|bibliograf[ií]a|references|bibliography|literature cited)\b.*$/im;
const AUTHOR_YEAR_RE = /\b\p{Lu}[\p{L}'’-]+(?:\s+et\s+al\.?|\s+(?:y|and|&)\s+\p{Lu}[\p{L}'’-]+)?,?\s*\(?\s*(?:19|20)\d{2}[a-z]?\b\)?/gu;
const NUMBER_RE = /(?<![\p{L}\d.,])[-−]?\d+(?:[.,]\d+)?(?![\p{L}\d])/gu;

/** Lista de claves permitidas, con el método al que respaldan, para el prompt. */
export const allowedReferencesForPrompt = (): string => {
  const lines: string[] = [];
  (Object.keys(METHOD_REFERENCES) as (keyof typeof METHOD_REFERENCES)[]).forEach(method => {
    METHOD_REFERENCES[method].forEach(key => {
      const r = REFERENCES[key];
      lines.push(`- [@${key}] (${method}) ${r.authors[0].split(',')[0]}${r.authors.length > 1 ? ' et al.' : ''} ${r.year}. ${r.title}`);
    });
  });
  return Array.from(new Set(lines)).join('\n');
};

export const buildInterpretationPrompt = (dossier: string, lang: 'es' | 'en'): string => {
  const refs = allowedReferencesForPrompt();
  if (lang === 'es') {
    return `Eres un ecólogo cuantitativo. Redacta en español la sección de **Resultados y discusión** de un artículo científico a partir ÚNICAMENTE del resumen de resultados que aparece al final.

REGLAS OBLIGATORIAS (el texto se revisará automáticamente):
1. Usa solo cifras que aparezcan en el resumen. No calcules cifras nuevas, no redondees de otra forma y no inventes valores. Si un análisis no se hizo o no dio resultados significativos, dilo.
2. No escribas citas con formato (Autor, año). Para respaldar un método usa solo estas claves, entre corchetes, por ejemplo [@veech2013] o [@chao2014; @hsieh2016]:
${refs}
3. No escribas lista de referencias: se añade automáticamente.
4. No compares con otros estudios ni afirmes nada sobre la literatura. Donde una comparación sería útil, escribe una marca [COMPARAR: tema concreto] para que los autores la completen con fuentes verificadas.
5. Distingue resultado (lo que muestran los datos) de interpretación (posible explicación ecológica); presenta las interpretaciones como hipótesis.
6. Informa los valores de p ajustados cuando estén disponibles. Un resultado no significativo no demuestra ausencia de efecto.
7. Estructura con estos encabezados: ### 1. Estructura y diversidad, ### 2. Especies indicadoras y co-ocurrencia, ### 3. Relación especies–ambiente, ### 4. Biomasa y carbono (omite los que no tengan datos). Máximo 1000 palabras.

RESUMEN DE RESULTADOS:
${dossier}`;
  }
  return `You are a quantitative ecologist. Write in English the **Results and discussion** section of a scientific paper using ONLY the results summary given at the end.

MANDATORY RULES (the text will be checked automatically):
1. Use only figures that appear in the summary. Do not compute new figures, do not round differently and do not invent values. If an analysis was not run or gave no significant results, say so.
2. Do not write (Author, year) citations. To support a method use only these keys, in brackets, e.g. [@veech2013] or [@chao2014; @hsieh2016]:
${refs}
3. Do not write a reference list: it is added automatically.
4. Do not compare with other studies or make claims about the literature. Where a comparison would help, write a marker [COMPARE: specific topic] for the authors to complete with verified sources.
5. Separate results (what the data show) from interpretation (possible ecological explanation); present interpretations as hypotheses.
6. Report adjusted p-values when available. A non-significant result does not prove absence of an effect.
7. Use these headings: ### 1. Structure and diversity, ### 2. Indicator species and co-occurrence, ### 3. Species–environment relationships, ### 4. Biomass and carbon (omit those without data). At most 1000 words.

RESULTS SUMMARY:
${dossier}`;
};

const parseNumber = (raw: string): { value: number; decimals: number } => {
  const s = raw.replace('−', '-').replace(',', '.');
  const decimals = s.includes('.') ? s.split('.')[1].length : 0;
  return { value: parseFloat(s), decimals };
};

const extractNumbers = (text: string) => Array.from(text.matchAll(NUMBER_RE), m => m[0]);

/** Una cifra es trazable si coincide, a la precisión con que está escrita, con alguna del dossier
 *  (directamente o como porcentaje/proporción). */
export const isTraceable = (raw: string, dossierValues: number[]): boolean => {
  const { value, decimals } = parseNumber(raw);
  if (!Number.isFinite(value)) return true;
  const a = Math.abs(value);
  if (decimals === 0 && a <= 10) return true; // conteos pequeños, órdenes q, numeración
  if (decimals === 0 && a >= 1900 && a <= 2100) return true; // años
  const tol = 0.5 * 10 ** -decimals + 1e-9;
  return dossierValues.some(d => {
    const b = Math.abs(d);
    return Math.abs(a - b) <= tol || Math.abs(a - 100 * b) <= tol || Math.abs(a - b / 100) <= tol;
  });
};

export const auditInterpretation = (aiText: string, dossier: string, lang: 'es' | 'en'): AuditedText => {
  let text = aiText.replace(/\r\n/g, '\n');
  const issues: AuditIssues = {
    invalidKeys: [], unkeyedCitations: [], untraceableNumbers: [], removedReferenceSection: false, placeholders: 0,
  };

  // 1. Lista de referencias escrita por la IA: se elimina.
  const refHeading = text.match(REFERENCE_HEADING_RE);
  if (refHeading && refHeading.index !== undefined) {
    text = text.slice(0, refHeading.index).trimEnd();
    issues.removedReferenceSection = true;
  }

  // 2. Texto sin claves ni marcas, para buscar citas sueltas y cifras.
  const bare = text.replace(KEY_RE, ' ').replace(PLACEHOLDER_RE, ' ');
  issues.unkeyedCitations = Array.from(new Set(Array.from(bare.matchAll(AUTHOR_YEAR_RE), m => m[0].trim())));
  const dossierValues = extractNumbers(dossier).map(r => parseNumber(r).value).filter(Number.isFinite);
  const withoutCitations = bare.replace(AUTHOR_YEAR_RE, ' ');
  issues.untraceableNumbers = Array.from(new Set(extractNumbers(withoutCitations).filter(r => !isTraceable(r, dossierValues))));
  issues.placeholders = (text.match(PLACEHOLDER_RE) ?? []).length;

  // 3. Claves → citas.
  const cited = new Set<string>();
  text = text.replace(KEY_RE, (_m, inner: string) => {
    const keys = inner.split(';').map(k => k.trim().replace(/^@/, '')).filter(Boolean);
    const valid = keys.filter(k => REFERENCES[k]);
    keys.filter(k => !REFERENCES[k]).forEach(k => issues.invalidKeys.includes(k) || issues.invalidKeys.push(k));
    valid.forEach(k => cited.add(k));
    const invalidMark = keys.length > valid.length
      ? (lang === 'es' ? ' [CITA NO VÁLIDA]' : ' [INVALID CITATION]') : '';
    return (valid.length ? cite(valid, lang) : '') + invalidMark;
  });

  const citedKeys = Array.from(cited);
  if (citedKeys.length) {
    text += `\n\n## ${lang === 'es' ? 'Referencias' : 'References'}\n\n` + formatBibliography(citedKeys).join('\n\n');
  }
  return { markdown: text, citedKeys, issues };
};

export const hasIssues = (i: AuditIssues) =>
  i.invalidKeys.length > 0 || i.unkeyedCitations.length > 0 || i.untraceableNumbers.length > 0 || i.removedReferenceSection;
