import { describe, expect, it } from 'vitest';
import { cooccurrenceAnalysis } from '../services/stats/cooccurrence';
import { expectClose, loadFixture } from './helpers';

const fx = loadFixture('cooccurrence');

describe.skipIf(!fx)('co-occurrence vs R (phyper, p.adjust)', () => {
  it('reproduces observed/expected counts, exact tails and BH-adjusted p for every pair', () => {
    const presence: Record<string, Set<string>> = {};
    fx.plots.forEach((plot: string, i: number) => {
      presence[plot] = new Set(fx.species.filter((_: string, j: number) => fx.presence[i][j] === 1));
    });
    const res = cooccurrenceAnalysis(presence);
    const byKey = new Map(res.pairs.map(p => [`${p.speciesA}|${p.speciesB}`, p]));
    expect(res.pairs.length).toBe(fx.pairs.length);
    for (const ref of fx.pairs) {
      const p = byKey.get([ref.speciesA, ref.speciesB].sort().join('|'))!;
      expect(p.obs).toBe(ref.obs);
      expectClose(p.exp, ref.exp, 1e-12, 'exp');
      expectClose(p.pLower, ref.pLower, 1e-10, `pLower ${ref.speciesA}-${ref.speciesB}`);
      expectClose(p.pUpper, ref.pUpper, 1e-10, `pUpper ${ref.speciesA}-${ref.speciesB}`);
      if (ref.pAdj !== undefined) expectClose(p.pAdj!, ref.pAdj, 1e-10, 'pAdj');
      else expect(p.tested).toBe(false);
    }
  });
});
