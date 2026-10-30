/**
 * Pruebas no paramétricas:
 * - Kruskal–Wallis con corrección por empates (igual a stats::kruskal.test de R).
 * - Comparaciones múltiples de Dunn (1964) con la misma corrección (igual a dunn.test), p ajustado BH.
 * - Prueba de permutación de la diferencia de medias entre dos grupos (exacta si es factible).
 */
import { chiSquareUpper, normalTwoSided } from './distributions';
import { adjustBH } from './special';
import { createRng, DEFAULT_SEED, shuffleInPlace } from './random';

/** Rangos medios (los empates reciben la media de sus rangos) y Σ(t³ − t) de los grupos de empates. */
export function midRanks(values: readonly number[]): { ranks: number[]; tieSum: number } {
  const idx = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(values.length);
  let tieSum = 0;
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = r;
    const t = j - i + 1;
    tieSum += t * t * t - t;
    i = j + 1;
  }
  return { ranks, tieSum };
}

export interface KruskalResult { H: number; df: number; p: number; n: number }

export function kruskalWallis(groups: readonly (readonly number[])[]): KruskalResult {
  const g = groups.filter(x => x.length > 0);
  const all = g.flat();
  const N = all.length;
  const { ranks, tieSum } = midRanks(all);
  let offset = 0, sum = 0;
  g.forEach(x => {
    const R = ranks.slice(offset, offset + x.length).reduce((a, b) => a + b, 0);
    sum += (R * R) / x.length;
    offset += x.length;
  });
  const correction = 1 - tieSum / (N * N * N - N);
  const H = ((12 / (N * (N + 1))) * sum - 3 * (N + 1)) / correction;
  const df = g.length - 1;
  return { H, df, p: chiSquareUpper(H, df), n: N };
}

export interface DunnPair { a: string; b: string; z: number; p: number; pAdj: number }

/** Dunn (1964): z = (R̄a − R̄b) / √[(N(N+1)/12 − Σ(t³−t)/(12(N−1)))·(1/na + 1/nb)], p bilateral. */
export function dunnTest(groups: readonly (readonly number[])[], names: readonly string[]): DunnPair[] {
  const all = groups.flat();
  const N = all.length;
  const { ranks, tieSum } = midRanks(all);
  const meanRanks: number[] = [];
  let offset = 0;
  groups.forEach(x => {
    meanRanks.push(ranks.slice(offset, offset + x.length).reduce((a, b) => a + b, 0) / x.length);
    offset += x.length;
  });
  const s2 = (N * (N + 1)) / 12 - tieSum / (12 * (N - 1));
  const pairs: Omit<DunnPair, 'pAdj'>[] = [];
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
    const z = (meanRanks[i] - meanRanks[j]) / Math.sqrt(s2 * (1 / groups[i].length + 1 / groups[j].length));
    pairs.push({ a: names[i], b: names[j], z, p: normalTwoSided(z) });
  }
  const adj = adjustBH(pairs.map(p => p.p));
  return pairs.map((p, k) => ({ ...p, pAdj: adj[k] }));
}

export interface PermutationResult {
  meanA: number;
  meanB: number;
  /** Media de A menos media de B. */
  diff: number;
  p: number;
  exact: boolean;
  nPermutations: number;
}

/**
 * Prueba de permutación bilateral de la diferencia de medias. Si el número de reparticiones posibles
 * C(nA + nB, nA) no supera `maxExact`, se enumeran todas (p exacto); si no, se usan `nPermutations`
 * permutaciones aleatorias con semilla y p = (b + 1)/(nPermutations + 1).
 */
export function permutationTestMeans(
  a: readonly number[], b: readonly number[],
  { maxExact = 100000, nPermutations = 9999, seed = DEFAULT_SEED }: { maxExact?: number; nPermutations?: number; seed?: number } = {},
): PermutationResult {
  const all = [...a, ...b];
  const nA = a.length, N = all.length;
  const total = all.reduce((s, v) => s + v, 0);
  const mean = (x: readonly number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const meanA = mean(a), meanB = mean(b);
  const diff = meanA - meanB;
  const statFromSumA = (sumA: number) => Math.abs(sumA / nA - (total - sumA) / (N - nA));
  const obs = Math.abs(diff);
  const tol = 1e-9 * Math.max(1, obs);

  let combos = 1;
  for (let i = 1; i <= nA; i++) { combos = (combos * (N - nA + i)) / i; if (combos > maxExact) break; }

  if (combos <= maxExact) {
    let count = 0, n = 0;
    const pick = (start: number, left: number, sum: number) => {
      if (left === 0) { n++; if (statFromSumA(sum) >= obs - tol) count++; return; }
      for (let i = start; i <= N - left; i++) pick(i + 1, left - 1, sum + all[i]);
    };
    pick(0, nA, 0);
    return { meanA, meanB, diff, p: count / n, exact: true, nPermutations: n };
  }
  const rng = createRng(seed);
  const work = all.slice();
  let count = 0;
  for (let k = 0; k < nPermutations; k++) {
    shuffleInPlace(work, rng);
    let sumA = 0;
    for (let i = 0; i < nA; i++) sumA += work[i];
    if (statFromSumA(sumA) >= obs - tol) count++;
  }
  return { meanA, meanB, diff, p: (count + 1) / (nPermutations + 1), exact: false, nPermutations };
}
