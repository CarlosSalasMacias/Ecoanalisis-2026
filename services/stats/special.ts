/**
 * Special functions used by the exact tests and rarefaction formulas.
 */

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** Natural log of the gamma function, log Γ(z), for real z > 0 (Lanczos, g = 7). */
export function logGamma(z: number): number {
  if (z < 0.5) {
    // Reflection: Γ(z)Γ(1−z) = π / sin(πz)  →  logΓ(z) = log(π / |sin(πz)|) − logΓ(1−z)
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - logGamma(1 - z);
  }
  const x0 = z - 1;
  let x = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) x += LANCZOS[i] / (x0 + i);
  const t = x0 + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x0 + 0.5) * Math.log(t) - t + Math.log(x);
}

const logFactorialCache: number[] = [0, 0];
/** log(n!) for integer n ≥ 0, cached. */
export function logFactorial(n: number): number {
  if (n < 0) return NaN;
  if (n < logFactorialCache.length) return logFactorialCache[n];
  if (n > 1e6) return logGamma(n + 1);
  for (let k = logFactorialCache.length; k <= n; k++) {
    logFactorialCache[k] = logFactorialCache[k - 1] + Math.log(k);
  }
  return logFactorialCache[n];
}

/** log C(n, k); −Infinity when the coefficient is zero. */
export function logChoose(n: number, k: number): number {
  if (k < 0 || k > n || n < 0) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/**
 * Hypergeometric probabilities for X = number of plots shared by two species,
 * with N plots, species A present in n1 and species B in n2.
 * Returns P(X ≤ obs) and P(X ≥ obs) computed exactly (Veech 2013).
 */
export function hypergeometricTails(obs: number, N: number, n1: number, n2: number): { pLower: number; pUpper: number } {
  const kMin = Math.max(0, n1 + n2 - N);
  const kMax = Math.min(n1, n2);
  const denom = logChoose(N, n2);
  let lower = 0;
  let upper = 0;
  for (let k = kMin; k <= kMax; k++) {
    const p = Math.exp(logChoose(n1, k) + logChoose(N - n1, n2 - k) - denom);
    if (k <= obs) lower += p;
    if (k >= obs) upper += p;
  }
  return { pLower: Math.min(1, lower), pUpper: Math.min(1, upper) };
}

/** Benjamini–Hochberg adjusted p-values (same as R's p.adjust(method = "BH")). */
export function adjustBH(pvalues: readonly number[]): number[] {
  const m = pvalues.length;
  if (m === 0) return [];
  const order = pvalues.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const adjusted = new Array<number>(m);
  let cumMin = 1;
  order.forEach(({ p, i }, idx) => {
    const rank = m - idx;
    cumMin = Math.min(cumMin, (p * m) / rank);
    adjusted[i] = Math.min(1, cumMin);
  });
  return adjusted;
}
