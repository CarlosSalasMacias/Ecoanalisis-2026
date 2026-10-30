import { describe, expect, it } from 'vitest';
import { indicatorSpecies } from '../services/stats/indval';
import { expectClose, loadFixture } from './helpers';

const fx = loadFixture('indval');

describe.skipIf(!fx)('indicator species (IndVal)', () => {
  const res = fx ? indicatorSpecies(fx.abundance, fx.species, fx.groups) : null;

  it.skipIf(!fx?.labdsv)('IndVal (A·B) per group and best group equal labdsv::indval', () => {
    const order: string[] = fx.labdsv.groupOrder;
    res!.species.forEach((sp, j) => {
      order.forEach((g, k) => expectClose(sp.groups[g].indvalPct / 100, fx.labdsv.indval[j][k], 1e-10, `${sp.species}/${g}`));
      expectClose(sp.indvalPct / 100, fx.labdsv.indcls[j], 1e-10, `${sp.species} max`);
    });
  });

  it.skipIf(!fx?.labdsv)('permutation p-values agree with labdsv within Monte-Carlo error', () => {
    res!.species.forEach((sp, j) => {
      const ref = fx.labdsv.pval[j];
      // 999 permutations: standard error of p is at most ~0.016; allow 4 s.e.
      const se = Math.sqrt((ref * (1 - ref)) / 999) + 0.002;
      expect(Math.abs(sp.p - ref), `${sp.species}: ${sp.p} vs ${ref}`).toBeLessThanOrEqual(4 * se + 0.01);
    });
  });

  it.skipIf(!fx?.indicspecies)('sqrt(A·B), A, B and p-values agree with indicspecies::multipatt', () => {
    const order: string[] = fx.indicspecies.groupOrder;
    res!.species.forEach((sp, j) => {
      order.forEach((g, k) => {
        expectClose(sp.groups[g].A, fx.indicspecies.A[j][k], 1e-10, `A ${sp.species}/${g}`);
        expectClose(sp.groups[g].B, fx.indicspecies.B[j][k], 1e-10, `B ${sp.species}/${g}`);
      });
      expectClose(sp.stat, fx.indicspecies.stat[j], 1e-10, `stat ${sp.species}`);
      expect(sp.bestGroup).toBe(order[fx.indicspecies.index[j] - 1]);
      const ref = fx.indicspecies.p[j];
      if (ref !== null) {
        const se = Math.sqrt((ref * (1 - ref)) / 999) + 0.002;
        expect(Math.abs(sp.p - ref), `${sp.species}: ${sp.p} vs ${ref}`).toBeLessThanOrEqual(4 * se + 0.01);
      }
    });
  });

  it('is reproducible with the same seed', () => {
    const a = indicatorSpecies(fx.abundance, fx.species, fx.groups, { seed: 7, nPermutations: 199 });
    const b = indicatorSpecies(fx.abundance, fx.species, fx.groups, { seed: 7, nPermutations: 199 });
    expect(a.species.map(s => s.p)).toEqual(b.species.map(s => s.p));
  });
});
