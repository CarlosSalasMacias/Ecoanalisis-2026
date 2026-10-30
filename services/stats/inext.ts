/**
 * Sample-size-based rarefaction and extrapolation of Hill numbers (q = 0, 1, 2) with bootstrap
 * confidence intervals, following Chao et al. (2014) Ecol. Monogr. 84:45–67 and the R package iNEXT
 * (Hsieh, Ma & Chao 2016, Methods Ecol. Evol. 7:1451–1456).
 */

import { bootstrapCommunity, coverageAt, defaultKnots, hillAtSize } from './diversity';
import { createRng, DEFAULT_SEED, multinomial, sampleSd } from './random';

export type CurveMethod = 'interpolated' | 'observed' | 'extrapolated';

export interface CurvePoint {
  m: number;
  method: CurveMethod;
  qD: number;
  lcl: number;
  ucl: number;
  SC: number;
  scLcl: number;
  scUcl: number;
}

export interface HillCurve {
  q: 0 | 1 | 2;
  points: CurvePoint[];
}

export interface RarefactionOptions {
  sizes?: number[];
  endpoint?: number;
  knots?: number;
  nBoot?: number;
  conf?: number;
  seed?: number;
}

export interface RarefactionResult {
  n: number;
  S: number;
  curves: HillCurve[];
  nBoot: number;
  seed: number;
}

const Z95 = 1.959963984540054;

export function rarefactionExtrapolation(counts: readonly number[], options: RarefactionOptions = {}): RarefactionResult {
  const x = counts.filter(c => c > 0);
  const n = x.reduce((a, b) => a + b, 0);
  const { nBoot = 50, seed = DEFAULT_SEED, endpoint = 2 * n, knots = 40 } = options;
  const sizes = (options.sizes ?? defaultKnots(n, endpoint, knots)).filter(m => m >= 1);
  const z = options.conf && options.conf !== 0.95 ? normalQuantile(1 - (1 - options.conf) / 2) : Z95;
  const qs: (0 | 1 | 2)[] = [0, 1, 2];

  const est = qs.map(q => sizes.map(m => hillAtSize(x, q, m)));
  const sc = sizes.map(m => coverageAt(x, m));

  // Bootstrap replicates drawn from the estimated community.
  const boot: number[][][] = qs.map(() => sizes.map(() => [] as number[]));
  const bootSc: number[][] = sizes.map(() => []);
  if (nBoot > 1 && n > 1) {
    const rng = createRng(seed);
    const probs = bootstrapCommunity(x);
    for (let b = 0; b < nBoot; b++) {
      const sample = multinomial(n, probs, rng).filter(v => v > 0);
      qs.forEach((q, qi) => sizes.forEach((m, mi) => boot[qi][mi].push(hillAtSize(sample, q, m))));
      sizes.forEach((m, mi) => bootSc[mi].push(coverageAt(sample, m)));
    }
  }

  const curves: HillCurve[] = qs.map((q, qi) => ({
    q,
    points: sizes.map((m, mi) => {
      const se = nBoot > 1 ? sampleSd(boot[qi][mi]) : 0;
      const seSc = nBoot > 1 ? sampleSd(bootSc[mi]) : 0;
      return {
        m,
        method: m < n ? 'interpolated' : m === n ? 'observed' : 'extrapolated',
        qD: est[qi][mi],
        lcl: Math.max(0, est[qi][mi] - z * se),
        ucl: est[qi][mi] + z * se,
        SC: sc[mi],
        scLcl: Math.max(0, sc[mi] - z * seSc),
        scUcl: Math.min(1, sc[mi] + z * seSc),
      };
    }),
  }));

  return { n, S: x.length, curves, nBoot, seed };
}

/** Inverse standard normal CDF (Acklam's rational approximation; |error| < 1.2e-9). */
function normalQuantile(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
