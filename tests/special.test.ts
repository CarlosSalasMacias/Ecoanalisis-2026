import { describe, expect, it } from 'vitest';
import { adjustBH, hypergeometricTails, logChoose, logGamma } from '../services/stats/special';
import { createRng, shuffled } from '../services/stats/random';
import { expectClose } from './helpers';

describe('special functions', () => {
  it('logGamma matches known values, including the reflection branch', () => {
    expectClose(logGamma(1), 0, 1e-12);
    expectClose(logGamma(5), Math.log(24), 1e-12);
    expectClose(logGamma(0.5), Math.log(Math.sqrt(Math.PI)), 1e-12);
    expectClose(logGamma(0.25), 1.2880225246980774, 1e-12); // log Γ(1/4)
    expectClose(logGamma(100.5), 361.43554046777757, 1e-10);
  });

  it('logChoose is exact for small integers', () => {
    expectClose(Math.exp(logChoose(10, 3)), 120, 1e-12);
    expect(logChoose(3, 5)).toBe(-Infinity);
  });

  it('hypergeometric tails sum to 1 + P(X = obs)', () => {
    const { pLower, pUpper } = hypergeometricTails(3, 20, 8, 7);
    const pEq = Math.exp(logChoose(8, 3) + logChoose(12, 4) - logChoose(20, 7));
    expectClose(pLower + pUpper, 1 + pEq, 1e-12);
  });

  it('Benjamini–Hochberg equals R p.adjust', () => {
    // p.adjust(c(0.01, 0.04, 0.03, 0.2, 0.005), "BH")
    const adj = adjustBH([0.01, 0.04, 0.03, 0.2, 0.005]);
    [0.025, 0.05, 0.05, 0.2, 0.025].forEach((v, i) => expectClose(adj[i], v, 1e-12));
  });

  it('seeded RNG is reproducible and Fisher–Yates is unbiased', () => {
    const a = shuffled([1, 2, 3, 4, 5], createRng(1));
    const b = shuffled([1, 2, 3, 4, 5], createRng(1));
    expect(a).toEqual(b);
    const rng = createRng(42);
    const counts = [0, 0, 0];
    const n = 30000;
    for (let i = 0; i < n; i++) counts[shuffled([0, 1, 2], rng)[0]]++;
    counts.forEach(c => expect(Math.abs(c / n - 1 / 3)).toBeLessThan(0.015));
  });
});
