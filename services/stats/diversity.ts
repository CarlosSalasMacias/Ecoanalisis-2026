/**
 * Alpha-diversity estimators for abundance data (one vector of counts per assemblage).
 *
 * References
 * - Chao A. (1987) Biometrics 43:783–791 (Chao1, bias-corrected form with (n−1)/n).
 * - Chao A., Jost L. (2012) Ecology 93:2533–2547 (sample coverage).
 * - Chao A., Wang Y.T., Jost L. (2013) Methods Ecol. Evol. 4:1091–1100 (Shannon entropy estimator).
 * - Chao A. et al. (2014) Ecol. Monogr. 84:45–67 (Hill-number rarefaction/extrapolation).
 *
 * Formulas follow the R package iNEXT (Hsieh, Ma & Chao 2016) so that results can be checked against it.
 */

import { logChoose } from './special';

export interface AbundanceSummary {
  n: number; // individuals
  S: number; // observed species
  f1: number; // singletons
  f2: number; // doubletons
}

export function summarize(counts: readonly number[]): AbundanceSummary {
  const x = counts.filter(c => c > 0);
  return {
    n: x.reduce((a, b) => a + b, 0),
    S: x.length,
    f1: x.filter(c => c === 1).length,
    f2: x.filter(c => c === 2).length,
  };
}

/** Estimated number of undetected species, f̂0 (Chao 1987, bias-corrected). */
export function f0Hat({ n, f1, f2 }: AbundanceSummary): number {
  if (n === 0) return 0;
  return f2 > 0 ? ((n - 1) / n) * (f1 * f1) / (2 * f2) : ((n - 1) / n) * (f1 * (f1 - 1)) / 2;
}

export interface Chao1Result {
  estimate: number;
  se: number;
  lcl: number;
  ucl: number;
}

/** Chao1 richness with s.e. and 95% log-normal CI (same as iNEXT::ChaoRichness). */
export function chao1(counts: readonly number[]): Chao1Result {
  const s = summarize(counts);
  const { n, S, f1, f2 } = s;
  if (n === 0) return { estimate: 0, se: 0, lcl: 0, ucl: 0 };
  const f0 = f0Hat(s);
  const estimate = S + f0;
  const k = (n - 1) / n;
  const t = estimate - S;
  const z = 1.959964;
  if (t > 0) {
    let variance: number;
    if (f2 > 0) {
      const r = f1 / f2;
      variance = f2 * ((k * r ** 2) / 2 + k ** 2 * r ** 3 + (k ** 2 * r ** 4) / 4);
    } else {
      variance = (k * f1 * (f1 - 1)) / 2 + (k ** 2 * f1 * (2 * f1 - 1) ** 2) / 4 - (k ** 2 * f1 ** 4) / 4 / f0;
    }
    variance = Math.max(variance, 0);
    const K = Math.exp(z * Math.sqrt(Math.log(1 + variance / (t * t))));
    return { estimate, se: Math.sqrt(variance), lcl: S + t / K, ucl: S + t * K };
  }
  // No undetected species estimated (f1 = 0, or f1 = 1 and f2 = 0): iNEXT's observed-variance branch.
  const x = counts.filter(c => c > 0);
  const varObs = Math.max(
    0,
    x.reduce((a, xi) => a + Math.exp(-xi) - Math.exp(-2 * xi), 0) - x.reduce((a, xi) => a + xi * Math.exp(-xi), 0) ** 2 / n,
  );
  const P = x.reduce((a, xi) => a + Math.exp(-xi), 0) / S;
  const lcl = Math.max(S, S / (1 - P) - (z * Math.sqrt(varObs)) / (1 - P));
  const ucl = S / (1 - P) + (z * Math.sqrt(varObs)) / (1 - P);
  return { estimate, se: Math.sqrt(varObs), lcl, ucl };
}

/** Good–Turing sample coverage with the Chao & Jost (2012) correction. */
export function sampleCoverage(counts: readonly number[]): number {
  const s = summarize(counts);
  return coverageAt(counts, s.n);
}

/** Expected sample coverage of a sample of m individuals (interpolated or extrapolated). */
export function coverageAt(counts: readonly number[], m: number): number {
  const x = counts.filter(c => c > 0);
  const { n, f1, f2 } = summarize(x);
  if (n === 0) return 0;
  const f0 = f0Hat({ n, S: x.length, f1, f2 });
  const A = f1 > 0 ? (n * f0) / (n * f0 + f1) : 1;
  if (m < n) {
    let sum = 0;
    for (const xi of x) {
      if (n - xi >= m) sum += (xi / n) * Math.exp(logChoose(n - xi, m) - logChoose(n - 1, m));
    }
    return 1 - sum;
  }
  if (m === n) return 1 - (f1 / n) * A;
  return 1 - (f1 / n) * A ** (m - n + 1);
}

/** Observed Shannon entropy (natural log). */
export function shannonEntropy(counts: readonly number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return 0;
  return -counts.filter(c => c > 0).reduce((a, c) => a + (c / n) * Math.log(c / n), 0);
}

/** Simpson's dominance λ = Σ p_i² (observed). */
export function simpsonDominance(counts: readonly number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return 0;
  return counts.reduce((a, c) => a + (c / n) ** 2, 0);
}

/** Chao, Wang & Jost (2013) bias-reduced Shannon entropy estimator. */
export function shannonEstimate(counts: readonly number[]): number {
  const x = counts.filter(c => c > 0);
  const { n, f1, f2 } = summarize(x);
  if (n <= 1) return 0;
  // UE = Σ x_i/n · Σ_{k=x_i}^{n-1} 1/k
  const harmonic: number[] = new Array(n + 1).fill(0); // harmonic[j] = Σ_{k=1}^{j} 1/k
  for (let k = 1; k <= n; k++) harmonic[k] = harmonic[k - 1] + 1 / k;
  let UE = 0;
  for (const xi of x) {
    if (xi <= n - 1) UE += (xi / n) * (harmonic[n - 1] - harmonic[xi - 1]);
  }
  let A: number;
  if (f2 > 0) A = (2 * f2) / ((n - 1) * f1 + 2 * f2);
  else if (f1 > 0) A = 2 / ((n - 1) * (f1 - 1) + 2);
  else A = 1;
  let B = 0;
  if (f1 > 0 && A !== 1) {
    let r = 0;
    for (let k = 1; k <= n - 1; k++) r += (1 / k) * (1 - A) ** k;
    B = (f1 / n) * (1 - A) ** (1 - n) * (-Math.log(A) - r);
  }
  return UE + B;
}

/** Asymptotic estimate of Simpson diversity (q = 2): 1 / Σ x(x−1)/(n(n−1)). */
export function simpsonEstimate(counts: readonly number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n <= 1) return 0;
  const s = counts.reduce((a, x) => a + (x * (x - 1)) / (n * (n - 1)), 0);
  return s > 0 ? 1 / s : Infinity;
}

/** Expected Hill number of order q (0, 1 or 2) for a sample of m individuals. */
export function hillAtSize(counts: readonly number[], q: 0 | 1 | 2, m: number): number {
  const x = counts.filter(c => c > 0);
  const s = summarize(x);
  const { n, S, f1 } = s;
  if (n === 0 || m <= 0) return 0;

  if (q === 0) {
    if (m <= n) {
      let sum = 0;
      for (const xi of x) sum += 1 - Math.exp(logChoose(n - xi, m) - logChoose(n, m));
      return sum;
    }
    const f0 = f0Hat(s);
    if (f1 === 0 || f0 === 0) return S;
    const A = (n * f0) / (n * f0 + f1);
    return S + f0 * (1 - A ** (m - n));
  }

  if (q === 1) {
    if (m < n) {
      // Expected entropy of a rarefied sample: Σ_i Σ_k −(k/m)·log(k/m)·P(X_i = k), with X_i hypergeometric.
      // The pmf of each species is walked with its recurrence, so the cost per m is O(n).
      let H = 0;
      const lcNm = logChoose(n, m);
      for (const xi of x) {
        const kMin = Math.max(0, m - (n - xi));
        const kMax = Math.min(xi, m);
        let p = Math.exp(logChoose(xi, kMin) + logChoose(n - xi, m - kMin) - lcNm);
        for (let k = kMin; k <= kMax; k++) {
          if (k > 0 && p > 0) H -= (k / m) * Math.log(k / m) * p;
          // P(k+1)/P(k) = (xi−k)(m−k) / ((k+1)(n−xi−m+k+1))
          p *= ((xi - k) * (m - k)) / ((k + 1) * (n - xi - m + k + 1));
        }
      }
      return Math.exp(H);
    }
    const Hobs = shannonEntropy(x);
    if (m === n) return Math.exp(Hobs);
    const Hhat = shannonEstimate(x);
    return Math.exp((n / m) * Hobs + (1 - n / m) * Hhat);
  }

  // q = 2
  const sumSq = x.reduce((a, xi) => a + (xi * (xi - 1)) / (n * (n - 1)), 0);
  if (n === 1) return 1;
  return 1 / (1 / m + (1 - 1 / m) * sumSq);
}

/** Sample sizes used by iNEXT by default (endpoint = 2n, 40 knots). */
export function defaultKnots(n: number, endpoint = 2 * n, knots = 40): number[] {
  let m: number[];
  if (endpoint <= n) {
    m = linspace(1, endpoint, Math.floor(knots)).map(Math.floor);
  } else {
    m = [
      ...linspace(1, n - 1, Math.floor(knots / 2) - 1).map(Math.floor),
      n,
      ...linspace(n + 1, endpoint, Math.floor(knots / 2)).map(Math.floor),
    ];
  }
  m[0] = 1;
  return Array.from(new Set(m)).sort((a, b) => a - b);
}

function linspace(from: number, to: number, len: number): number[] {
  if (len <= 1) return [from];
  const step = (to - from) / (len - 1);
  return Array.from({ length: len }, (_, i) => from + i * step);
}

/**
 * Bootstrap community (iNEXT's EstiBootComm.Ind): coverage-adjusted relative abundances of the
 * detected species plus ceil(f̂0) undetected species sharing the missing coverage equally.
 */
export function bootstrapCommunity(counts: readonly number[]): number[] {
  const x = counts.filter(c => c > 0);
  const s = summarize(x);
  const { n, f1 } = s;
  const f0 = Math.ceil(f0Hat(s));
  const A = f1 > 0 ? (n * f0) / (n * f0 + f1) : 1;
  const a = (f1 / n) * A;
  const b = x.reduce((acc, xi) => acc + (xi / n) * (1 - xi / n) ** n, 0);
  const w = f0 === 0 ? 0 : a / b;
  const detected = x.map(xi => (xi / n) * (1 - w * (1 - xi / n) ** n));
  const undetected = f0 > 0 ? new Array(f0).fill(a / f0) : [];
  return [...detected, ...undetected].sort((p, q) => q - p);
}
