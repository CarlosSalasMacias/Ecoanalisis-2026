/**
 * Probabilistic species co-occurrence model (Veech 2013, Global Ecol. Biogeogr. 22:252–260),
 * as implemented in the R package `cooccur` (Griffith, Veech & Marsh 2016).
 *
 * For each pair, the number of shared plots under random, independent placement follows a
 * hypergeometric distribution. P(X ≤ obs) and P(X ≥ obs) are computed exactly.
 *
 * Additions for publication use:
 * - Pairs with expected co-occurrence < 1 are flagged and not tested (cooccur's default `thresh = TRUE`).
 * - Benjamini–Hochberg false discovery rate correction across all tested pairs.
 */

import { adjustBH, hypergeometricTails } from './special';

export interface PairResult {
  speciesA: string;
  speciesB: string;
  obs: number;
  exp: number;
  pLower: number; // P(X ≤ obs)
  pUpper: number; // P(X ≥ obs)
  pAdj: number | null; // BH-adjusted p of the tail in the observed direction; null if not tested
  tested: boolean;
  effect: 'positive' | 'negative' | 'random';
}

export interface CooccurrenceOptions {
  alpha?: number;
  /** Skip pairs whose expected co-occurrence is below 1 (default true, as in `cooccur`). */
  threshold?: boolean;
  /** Use FDR-adjusted p-values to classify associations (default true). */
  adjust?: boolean;
}

/**
 * @param presence Map from plot id to the set of species present in it.
 */
export function cooccurrenceAnalysis(
  presence: Record<string, Set<string>>,
  options: CooccurrenceOptions = {},
): { species: string[]; nPlots: number; prevalence: Record<string, number>; pairs: PairResult[] } {
  const { alpha = 0.05, threshold = true, adjust = true } = options;
  const plots = Object.keys(presence);
  const N = plots.length;
  const species = Array.from(new Set(plots.flatMap(p => Array.from(presence[p])))).sort();
  const prevalence: Record<string, number> = {};
  for (const sp of species) prevalence[sp] = plots.filter(p => presence[p].has(sp)).length;

  const pairs: PairResult[] = [];
  for (let i = 0; i < species.length; i++) {
    for (let j = i + 1; j < species.length; j++) {
      const a = species[i];
      const b = species[j];
      const n1 = prevalence[a];
      const n2 = prevalence[b];
      const obs = plots.filter(p => presence[p].has(a) && presence[p].has(b)).length;
      const exp = (n1 * n2) / N;
      const { pLower, pUpper } = hypergeometricTails(obs, N, n1, n2);
      pairs.push({
        speciesA: a,
        speciesB: b,
        obs,
        exp,
        pLower,
        pUpper,
        pAdj: null,
        tested: !threshold || exp >= 1,
        effect: 'random',
      });
    }
  }

  const tested = pairs.filter(p => p.tested);
  const directional = tested.map(p => (p.obs >= p.exp ? p.pUpper : p.pLower));
  const adjusted = adjust ? adjustBH(directional) : directional;
  tested.forEach((p, k) => {
    p.pAdj = adjusted[k];
    if (adjusted[k] < alpha) {
      if (p.obs > p.exp) p.effect = 'positive';
      else if (p.obs < p.exp) p.effect = 'negative';
    }
  });

  return { species, nPlots: N, prevalence, pairs };
}
