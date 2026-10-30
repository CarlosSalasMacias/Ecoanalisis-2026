import { describe, expect, it } from 'vitest';
import { chao1, coverageAt, hillAtSize, shannonEntropy, shannonEstimate, simpsonDominance, simpsonEstimate } from '../services/stats/diversity';
import { rarefactionExtrapolation } from '../services/stats/inext';
import { createRng } from '../services/stats/random';
import { expectClose, loadFixture } from './helpers';

const fx = loadFixture('diversity');
const cases = fx ? Object.values(fx) as any[] : [];

describe.skipIf(!fx)('diversity vs vegan', () => {
  for (const c of cases) {
    it(`${c.name}: Shannon, Simpson, Chao1 and rarefaction (q = 0)`, () => {
      expectClose(shannonEntropy(c.counts), c.shannon, 1e-12, 'H');
      expectClose(simpsonDominance(c.counts), c.simpson, 1e-12, 'lambda');
      expectClose(chao1(c.counts).estimate, c.chao1Manual, 1e-12, 'chao1');
      const ms = c.sizes.filter((m: number) => m <= c.counts.reduce((a: number, b: number) => a + b, 0));
      ms.forEach((m: number, i: number) => expectClose(hillAtSize(c.counts, 0, m), c.rarefyQ0[i], 1e-9, `rarefy m=${m}`));
    });
  }
});

describe('diversity: internal consistency', () => {
  const x = [46, 22, 17, 15, 15, 9, 8, 6, 6, 4, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const n = x.reduce((a, b) => a + b, 0);
  it('interpolated curves meet the observed values at m = n', () => {
    expectClose(hillAtSize(x, 0, n), x.length, 1e-12);
    expectClose(hillAtSize(x, 1, n), Math.exp(shannonEntropy(x)), 1e-10);
    expectClose(hillAtSize(x, 2, n), 1 / simpsonDominance(x), 1e-10);
    expectClose(hillAtSize(x, 1, n - 1), hillAtSize(x, 1, n), 0.02);
  });
  it('extrapolation converges to the asymptotic estimators', () => {
    expectClose(hillAtSize(x, 0, 1e6), chao1(x).estimate, 1e-6);
    expectClose(hillAtSize(x, 1, 1e7), Math.exp(shannonEstimate(x)), 1e-4);
    expectClose(hillAtSize(x, 2, 1e9), simpsonEstimate(x), 1e-6);
  });
  it('coverage is monotone and Chao1 CI brackets the estimate', () => {
    expect(coverageAt(x, 10)).toBeLessThan(coverageAt(x, n));
    expect(coverageAt(x, n)).toBeLessThan(coverageAt(x, 2 * n));
    const c = chao1(x);
    expect(c.lcl).toBeLessThan(c.estimate);
    expect(c.ucl).toBeGreaterThan(c.estimate);
  });
});

describe.skipIf(!cases.some(c => c.inext))('rarefaction/extrapolation vs iNEXT', () => {
  for (const c of cases.filter(c => c.inext)) {
    it(`${c.name}: point estimates, coverage and Chao estimators`, () => {
      const res = rarefactionExtrapolation(c.counts, { sizes: c.sizes, nBoot: 200 });
      for (const ref of c.inext) {
        const curve = res.curves.find(k => k.q === ref.q)!;
        ref.m.forEach((m: number, i: number) => {
          const pt = curve.points.find(p => p.m === m)!;
          expectClose(pt.qD, ref.qD[i], 1e-6, `q=${ref.q} m=${m}`);
          expectClose(pt.SC, ref.SC[i], 1e-6, `SC m=${m}`);
          // Bootstrap CI: compare half-widths within 35% (different random streams, 200 replicates).
          const hw = (ref.ucl[i] - ref.lcl[i]) / 2;
          const mine = (pt.ucl - pt.lcl) / 2;
          if (hw > 1e-6) expect(Math.abs(mine - hw) / hw, `CI q=${ref.q} m=${m}`).toBeLessThan(0.35);
        });
      }
      const cr = chao1(c.counts);
      expectClose(cr.estimate, c.chaoRichness.estimate, 1e-3);
      expectClose(cr.se, c.chaoRichness.se, 1e-3);
      expectClose(cr.lcl, c.chaoRichness.lcl, 1e-3);
      expectClose(cr.ucl, c.chaoRichness.ucl, 1e-3);
      expectClose(shannonEstimate(c.counts), c.shannonEstimate, 1e-3);
      expectClose(simpsonEstimate(c.counts), c.simpsonEstimate, 1e-3);
    });
  }
});

describe('rarefaction formulas vs Monte-Carlo subsampling', () => {
  // Independent check that does not rely on iNEXT: draw m individuals without replacement many times.
  const x = [46, 22, 17, 15, 15, 9, 8, 6, 6, 4, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const pool = x.flatMap((c, i) => new Array(c).fill(i));
  const n = pool.length;
  const rand = createRng(12345);
  for (const m of [10, 40, 100]) {
    it(`m = ${m}: E[H], E[S] and expected coverage`, () => {
      const reps = 20000;
      let sumH = 0;
      let sumS = 0;
      let sumC = 0;
      const arr = pool.slice();
      for (let r = 0; r < reps; r++) {
        for (let i = 0; i <= m; i++) {
          const j = i + Math.floor(rand() * (n - i));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        const counts = new Array(x.length).fill(0);
        for (let i = 0; i < m; i++) counts[arr[i]]++;
        sumH += shannonEntropy(counts);
        sumS += counts.filter(c => c > 0).length;
        // Coverage (Chao & Jost 2012): probability that individual m+1 belongs to a species already seen.
        sumC += counts[arr[m]] > 0 ? 1 : 0;
      }
      expect(Math.abs(sumH / reps - Math.log(hillAtSize(x, 1, m)))).toBeLessThan(0.01);
      expect(Math.abs(sumS / reps - hillAtSize(x, 0, m))).toBeLessThan(0.05);
      expect(Math.abs(sumC / reps - coverageAt(x, m))).toBeLessThan(0.012);
    });
  }
});
