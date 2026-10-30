import { describe, expect, it } from 'vitest';
import { cca, ccaPermutationTest, groupEllipses } from '../services/stats/cca';
import { expectArrayClose, expectClose, expectScoresClose, loadFixture } from './helpers';

const fx = loadFixture('cca');

describe.skipIf(!fx)('CCA vs vegan::cca', () => {
  for (const name of ['dune', 'varespec']) {
    describe(name, () => {
      const ref = fx?.[name];
      const input = ref && { Y: ref.Y, X: ref.X, siteNames: ref.siteNames, speciesNames: ref.speciesNames, envNames: ref.envNames };
      const res = input ? cca(input) : null;
      const axes = ref ? ref.eigenvalues.length : 0;

      it('inertia and eigenvalues', () => {
        expectClose(res!.totalInertia, ref.totalInertia, 1e-10, 'total');
        expectClose(res!.constrainedInertia, ref.constrainedInertia, 1e-10, 'constrained');
        expectArrayClose(res!.eigenvalues, ref.eigenvalues, 1e-8, 'eig');
        expectArrayClose(res!.residualEigenvalues.slice(0, 5), ref.residualEigenvalues.slice(0, 5), 1e-8, 'CA eig');
      });

      it('scaling-2 scores (species, WA sites, LC sites, biplot)', () => {
        expectScoresClose(res!.raw.speciesScores, ref.species, axes, 1e-6, 'species');
        expectScoresClose(res!.raw.siteWAScores, ref.sitesWA, axes, 1e-6, 'sites WA');
        expectScoresClose(res!.raw.siteLCScores, ref.sitesLC, axes, 1e-6, 'sites LC');
        expectScoresClose(res!.raw.biplotScores, ref.biplot, axes, 1e-6, 'biplot');
      });

      it('variance inflation factors', () => {
        for (const [k, v] of Object.entries(ref.vif)) expectClose(res!.vif[k], v as number, 1e-6, `VIF ${k}`);
      });

      it('permutation test: F exact, p within Monte-Carlo error', () => {
        const t = ccaPermutationTest(input!);
        expectClose(t.F, ref.F, 1e-8, 'F');
        expect(t.df).toBe(ref.df);
        expect(t.dfResidual).toBe(ref.dfResidual);
        const se = Math.sqrt((ref.p * (1 - ref.p)) / 999) + 0.002;
        expect(Math.abs(t.p - ref.p)).toBeLessThanOrEqual(4 * se + 0.01);
      });

      it.skipIf(!ref?.ellipses)('95% group ellipses equal vegan::ordiellipse', () => {
        const ell = groupEllipses(res!.sitesWA, ref.groups);
        // Align sign of axes with vegan before comparing centres.
        const sx = Math.sign(res!.raw.siteWAScores.reduce((s, r, i) => s + r[0] * ref.sitesWA[i][0], 0));
        const sy = Math.sign(res!.raw.siteWAScores.reduce((s, r, i) => s + r[1] * ref.sitesWA[i][1], 0));
        for (const e of ref.ellipses) {
          const mine = ell.find(x => x.group === e.group)!;
          expectClose(mine.cx * sx, e.cx, 1e-6, `cx ${e.group}`);
          expectClose(mine.cy * sy, e.cy, 1e-6, `cy ${e.group}`);
          expectClose(mine.rx, e.rx, 1e-6, `rx ${e.group}`);
          expectClose(mine.ry, e.ry, 1e-6, `ry ${e.group}`);
        }
      });
    });
  }
});
