/**
 * Funciones de distribución (normal, chi-cuadrado, t de Student) validadas contra R
 * (pnorm, pchisq, pt, qt) en tests/distributions.test.ts.
 */
import { logGamma } from './special';

/** P(Z ≤ x) para la normal estándar; usa la gamma incompleta para precisión de doble. */
export function normalCdf(x: number): number {
  if (!Number.isFinite(x)) return x > 0 ? 1 : 0;
  // Φ(x) = ½·erfc(−x/√2); erfc(y) = Q(½, y²) para y ≥ 0.
  const y = x / Math.SQRT2;
  if (Math.abs(y) < 1e-8) return 0.5 + x / Math.sqrt(2 * Math.PI);
  const q = gammaQ(0.5, y * y);
  return y > 0 ? 1 - 0.5 * q : 0.5 * q;
}

/** P(Z > |x|)·2, sin pérdida de precisión en la cola. */
export function normalTwoSided(x: number): number {
  return gammaQ(0.5, (x * x) / 2);
}

/** Gamma incompleta regularizada inferior P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a, term = sum, ap = a;
    for (let n = 0; n < 10000; n++) {
      ap += 1; term *= x / ap; sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  return 1 - gammaQ(a, x);
}

/** Gamma incompleta regularizada superior Q(a, x) (fracción continua de Lentz). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) return 1 - gammaP(a, x);
  const tiny = 1e-300;
  let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
  for (let i = 1; i < 10000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** P(X > x) para chi-cuadrado con df grados de libertad. */
export function chiSquareUpper(x: number, df: number): number {
  return gammaQ(df / 2, x / 2);
}

/** Beta incompleta regularizada I_x(a, b). */
export function betaInc(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a + b) - logGamma(a) - logGamma(b);
  const front = Math.exp(lbeta + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (aa: number, bb: number, xx: number) => {
    const tiny = 1e-300;
    let c = 1, d = 1 - ((aa + bb) * xx) / (aa + 1);
    if (Math.abs(d) < tiny) d = tiny;
    d = 1 / d;
    let h = d;
    for (let m = 1; m < 10000; m++) {
      const m2 = 2 * m;
      let num = (m * (bb - m) * xx) / ((aa + m2 - 1) * (aa + m2));
      d = 1 + num * d; if (Math.abs(d) < tiny) d = tiny;
      c = 1 + num / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d; h *= d * c;
      num = (-(aa + m) * (aa + bb + m) * xx) / ((aa + m2) * (aa + m2 + 1));
      d = 1 + num * d; if (Math.abs(d) < tiny) d = tiny;
      c = 1 + num / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? (front * cf(a, b, x)) / a : 1 - (front * cf(b, a, 1 - x)) / b;
}

/** P(T ≤ t) para t de Student con df grados de libertad. */
export function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const tail = 0.5 * betaInc(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}

/** Cuantil de la t de Student (bisección sobre tCdf; precisión ~1e-12). */
export function tQuantile(p: number, df: number): number {
  if (p <= 0 || p >= 1) throw new Error('p debe estar entre 0 y 1');
  if (p === 0.5) return 0;
  let lo = -1, hi = 1;
  while (tCdf(lo, df) > p) lo *= 2;
  while (tCdf(hi, df) < p) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < p) lo = mid; else hi = mid;
    if (hi - lo < 1e-13 * Math.max(1, Math.abs(mid))) break;
  }
  return (lo + hi) / 2;
}

/** Normal estándar a partir de un generador uniforme (Box–Muller). */
export function normalDraw(rng: () => number): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

