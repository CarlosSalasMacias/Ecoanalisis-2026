import { describe, expect, it } from 'vitest';
import { chiSquareUpper, normalCdf, tCdf, tQuantile } from '../services/stats/distributions';
import { dunnTest, kruskalWallis, permutationTestMeans } from '../services/stats/nonparametric';
import { expectClose, loadFixture } from './helpers';

const ref = loadFixture<any>('nonparametric');

describe.skipIf(!ref)('distributions vs R', () => {
  it('pnorm', () => ref.distributions.pnorm.forEach((r: any) => expectClose(normalCdf(r.x), r.p, 1e-12, `pnorm(${r.x})`)));
  it('pchisq upper tail', () => ref.distributions.pchisq.forEach((r: any) => expectClose(chiSquareUpper(r.x, r.df), r.upper, 1e-12, `pchisq(${r.x}, ${r.df})`)));
  it('pt', () => ref.distributions.pt.forEach((r: any) => expectClose(tCdf(r.t, r.df), r.p, 1e-12, `pt(${r.t}, ${r.df})`)));
  it('qt(0.975)', () => ref.distributions.qt.forEach((r: any) => expectClose(tQuantile(0.975, r.df), r.q, 1e-10, `qt(.975, ${r.df})`)));
});

describe.skipIf(!ref)('Kruskal–Wallis and Dunn vs R', () => {
  it('kruskal.test with ties', () => {
    const groups = Object.values(ref.kruskal.groups) as number[][];
    const kw = kruskalWallis(groups);
    expectClose(kw.H, ref.kruskal.H, 1e-12, 'H');
    expect(kw.df).toBe(ref.kruskal.df);
    expectClose(kw.p, ref.kruskal.p, 1e-10, 'p');
  });

  it('Dunn z, p and BH-adjusted p', () => {
    const names = Object.keys(ref.kruskal.groups);
    const out = dunnTest(Object.values(ref.kruskal.groups) as number[][], names);
    ref.dunn.forEach((r: any, k: number) => {
      expect([out[k].a, out[k].b]).toEqual([r.a, r.b]);
      expectClose(out[k].z, r.z, 1e-12, 'z');
      expectClose(out[k].p, r.p, 1e-10, 'p');
      expectClose(out[k].pAdj, r.pAdj, 1e-10, 'pAdj');
    });
  });

  it.skipIf(!ref?.distributions?.dunnTestPackage)('matches the dunn.test package', () => {
    const pkg = ref.distributions.dunnTestPackage;
    const out = dunnTest(Object.values(ref.kruskal.groups) as number[][], Object.keys(ref.kruskal.groups));
    const absZ = out.map(o => Math.abs(o.z)).sort();
    const pkgZ = (pkg.z as number[]).map(Math.abs).sort();
    absZ.forEach((z, i) => expectClose(z, pkgZ[i], 1e-10));
  });
});

describe('permutation test of means', () => {
  it.skipIf(!ref)('exact p equals full enumeration in R', () => {
    ref.permutation.forEach((r: any) => {
      const out = permutationTestMeans(r.a, r.b);
      expect(out.exact).toBe(true);
      expect(out.nPermutations).toBe(r.n);
      expectClose(out.diff, r.diff, 1e-12);
      expectClose(out.p, r.p, 1e-12);
    });
  });

  it('Monte Carlo p is close to the exact p and reproducible', () => {
    const a = [5.8, 6.1, 5.5, 6.4, 6.0, 5.9, 6.2, 6.3], b = [4.9, 5.2, 5.0, 5.6, 5.1, 5.5, 5.4, 5.3, 5.8];
    const exact = permutationTestMeans(a, b);
    const mc = permutationTestMeans(a, b, { maxExact: 10, nPermutations: 20000 });
    expect(exact.exact).toBe(true);
    expect(mc.exact).toBe(false);
    expect(Math.abs(mc.p - exact.p)).toBeLessThan(0.003);
    expect(permutationTestMeans(a, b, { maxExact: 10, nPermutations: 20000 }).p).toBe(mc.p);
  });
});
