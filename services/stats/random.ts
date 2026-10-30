/**
 * Reproducible random numbers.
 *
 * Every stochastic procedure in the app (permutation tests, bootstrap) takes a
 * seed so that the same data always gives the same p-values and confidence
 * intervals. The seed is reported in the methods text.
 */

export const DEFAULT_SEED = 20260101;

export type Rng = () => number;

/** Mulberry32: small, fast 32-bit generator with good statistical quality for permutations. */
export function createRng(seed: number = DEFAULT_SEED): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Unbiased in-place Fisher–Yates shuffle. */
export function shuffleInPlace<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function shuffled<T>(arr: readonly T[], rng: Rng): T[] {
  return shuffleInPlace(arr.slice(), rng);
}

/** Draws a multinomial sample of size n with probabilities p (sequential conditional binomials). */
export function multinomial(n: number, p: readonly number[], rng: Rng): number[] {
  const out = new Array(p.length).fill(0);
  // Inverse-CDF sampling per draw; n is the number of individuals (hundreds to a few thousands).
  const cdf: number[] = [];
  let acc = 0;
  for (const pi of p) {
    acc += pi;
    cdf.push(acc);
  }
  const total = acc;
  for (let k = 0; k < n; k++) {
    const u = rng() * total;
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    out[lo]++;
  }
  return out;
}

/** Sample standard deviation (n - 1 denominator), as R's sd(). */
export function sampleSd(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const ss = values.reduce((a, b) => a + (b - mean) ** 2, 0);
  return Math.sqrt(ss / (n - 1));
}
