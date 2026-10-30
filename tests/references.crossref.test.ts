/**
 * Comprueba la bibliografía fija contra Crossref: que cada DOI exista y que título, año, primer
 * autor, revista, volumen y páginas coincidan con los de services/references.ts.
 *
 * Necesita acceso a internet, así que solo se ejecuta con CHECK_REFERENCES=1 (lo hace el workflow
 * "Validación contra R"). Localmente: CHECK_REFERENCES=1 npx vitest run tests/references.crossref.test.ts
 */
import { afterAll, describe, expect, it } from 'vitest';
import { REFERENCES } from '../services/references';

const enabled = process.env.CHECK_REFERENCES === '1';
const withDoi = Object.values(REFERENCES).filter(r => r.doi);

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/[^a-z0-9]+/g, ' ').trim();

const tokens = (s: string) => new Set(norm(s).split(' ').filter(w => w.length > 2));
const similarity = (a: string, b: string) => {
  const A = tokens(a), B = tokens(b);
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / Math.max(1, Math.min(A.size, B.size));
};
const pageStart = (p?: string) => p?.split(/[–-]/)[0].trim();

async function fetchCrossref(doi: string): Promise<any> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'EcoAnalytics reference check (https://github.com/CarlosSalasMacias/Ecoanalisis-2026)' } });
    if (res.ok) return (await res.json()).message;
    if (res.status === 404) throw new Error(`DOI no encontrado en Crossref: ${doi}`);
    await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
  }
  throw new Error(`Crossref no respondió para ${doi}`);
}

describe.skipIf(!enabled)('bibliografía contra Crossref', () => {
  let checked = 0;
  afterAll(() => {
    // Aparece como anotación en GitHub Actions: confirma cuántas referencias se comprobaron.
    console.log(`::notice title=Bibliografía::${checked} de ${withDoi.length} referencias con DOI coinciden con Crossref`);
  });
  it.each(withDoi.map(r => [r.key, r] as const))('%s', async (_key, ref) => {
    const m = await fetchCrossref(ref.doi!);
    const problems: string[] = [];

    const title = [...(m.title ?? []), ...(m.subtitle ?? [])].join(' ');
    if (similarity(ref.title, title) < 0.8) problems.push(`título: "${title}"`);

    const parts = (m.issued?.['date-parts']?.[0] ?? m['published-print']?.['date-parts']?.[0] ?? []) as number[];
    const years = [parts[0], m['published-print']?.['date-parts']?.[0]?.[0], m['published-online']?.['date-parts']?.[0]?.[0]].filter(Boolean);
    if (!years.includes(ref.year)) problems.push(`año: ${years.join('/')}`);

    const first = m.author?.[0]?.family ?? m.author?.[0]?.name ?? '';
    const expectedFirst = ref.authors[0].split(',')[0];
    if (first && !norm(first).includes(norm(expectedFirst).split(' ').pop()!)) problems.push(`primer autor: ${first}`);

    const container = (m['container-title'] ?? []).join(' ');
    if (container && similarity(ref.container, container) < 0.6) problems.push(`revista: ${container}`);

    if (ref.volume && m.volume && String(m.volume) !== ref.volume) problems.push(`volumen: ${m.volume}`);
    if (ref.pages && m.page && pageStart(String(m.page)) !== pageStart(ref.pages)) problems.push(`páginas: ${m.page}`);

    if (problems.length === 0) checked++;
    expect(problems, `${ref.key} (${ref.doi}) no coincide con Crossref → ${problems.join('; ')}`).toEqual([]);
  });
});
