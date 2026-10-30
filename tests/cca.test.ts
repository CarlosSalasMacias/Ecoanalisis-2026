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

      it.skipIf(!ref?.ellipsesSE)('95% centroid ellipses equal vegan::ordiellipse(kind = "se")', () => {
        const ell = groupEllipses(res!.sitesWA, ref.groups, 0.95, 'se');
        for (const e of ref.ellipsesSE) {
          const mine = ell.find(x => x.group === e.group)!;
          expectClose(mine.rx, e.rx, 1e-6, `rx ${e.group}`);
          expectClose(mine.ry, e.ry, 1e-6, `ry ${e.group}`);
        }
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

describe('group ellipses: dispersion (sd) and centroid confidence (se)', () => {
  const pts = [
    { x: 0, y: 0, weight: 1 }, { x: 1, y: 0.5, weight: 2 }, { x: 2, y: 1.5, weight: 1 }, { x: 0.5, y: 2, weight: 3 },
    { x: 5, y: 5, weight: 1 }, { x: 6, y: 4, weight: 1 }, { x: 5.5, y: 6, weight: 2 },
  ];
  const groups = ['101-150', '101-150', '101-150', '101-150', '51-100', '51-100', '51-100'];

  it('the se ellipse is the sd ellipse shrunk by sqrt(Σw²) (normalised weights), as in vegan', () => {
    const sd = groupEllipses(pts, groups, 0.95, 'sd');
    const se = groupEllipses(pts, groups, 0.95, 'se');
    sd.forEach((e, k) => {
      const w = pts.filter((_, i) => groups[i] === e.group).map(p => p.weight);
      const tot = w.reduce((a, b) => a + b, 0);
      const f = Math.sqrt(w.reduce((a, b) => a + (b / tot) ** 2, 0));
      expectClose(se[k].rx, e.rx * f, 1e-12);
      expectClose(se[k].ry, e.ry * f, 1e-12);
      expectClose(se[k].cx, e.cx, 1e-12);
    });
  });

  it('groups are ordered naturally (51-100 before 101-150)', () => {
    expect(groupEllipses(pts, groups).map(e => e.group)).toEqual(['51-100', '101-150']);
  });
});
