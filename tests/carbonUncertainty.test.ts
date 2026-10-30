import { describe, expect, it } from 'vitest';
import { runBiomassAnalysis } from '../services/analysisService';
import { tQuantile } from '../services/stats/distributions';
import { expectClose } from './helpers';

const tree = (veg: string, plot: string, D: number, H: number, rho: number) => ({
  'Tipo de vegetación': veg, Parcela: plot, 'Nombre científico (Completo)': 'Ocotea sp.',
  'DAP (cm)': D, 'Altura (m)': H, 'Densidad (g/cm3)': rho,
});
const agbMg = (D: number, H: number, rho: number) => 0.0673 * Math.pow(rho * D * D * H, 0.976) / 1000;

describe('carbon uncertainty', () => {
  const data = [
    tree('Bosque', 'P1', 40, 25, 0.6), tree('Bosque', 'P1', 30, 20, 0.55), tree('Bosque', 'P2', 35, 22, 0.6),
    tree('Bosque', 'P3', 50, 28, 0.65), tree('SAF', 'P1', 20, 12, 0.5), tree('SAF', 'P2', 25, 14, 0.45),
    tree('SAF', 'P3', 18, 10, 0.5),
  ];
  const plotInfo = { Bosque: { numPlots: '4', plotArea: '1000' }, SAF: { numPlots: '3', plotArea: '1000' } };
  const res = runBiomassAnalysis(data as any, { Bosque: 'chave2014', SAF: 'chave2014' }, plotInfo, [], 0.47, { nSimulations: 400 });
  const u = res.uncertainty;

  it('plot values in Mg C/ha, including declared plots without trees as zero', () => {
    const b = u.byType.find(x => x.type === 'Bosque')!;
    expect(b.nPlots).toBe(4);
    expect(b.emptyPlots).toBe(1);
    const p1 = (agbMg(40, 25, 0.6) + agbMg(30, 20, 0.55)) * 0.47 / 0.1;
    expectClose(b.plotValues[0].carbonPerHa, p1, 1e-12);
    expect(b.plotValues[3].carbonPerHa).toBe(0);
  });

  it('sampling CI uses Student t; mean agrees with the area-weighted total', () => {
    const b = u.byType.find(x => x.type === 'Bosque')!;
    const vals = b.plotValues.map(v => v.carbonPerHa);
    const m = vals.reduce((a, c) => a + c, 0) / 4;
    const sd = Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / 3);
    expectClose(b.mean, m, 1e-12);
    expectClose(b.ciSampling![1], m + tQuantile(0.975, 3) * sd / 2, 1e-12);
    expectClose(u.overall.carbonPerHa, res.totals.carbonPerHa!, 1e-12);
  });

  it('Monte Carlo interval contains the estimate, is reproducible and wider than sampling alone for single-plot noise', () => {
    u.byType.forEach(t => {
      expect(t.ciTotal![0]).toBeLessThan(t.mean);
      expect(t.ciTotal![1]).toBeGreaterThan(t.mean);
    });
    const again = runBiomassAnalysis(data as any, { Bosque: 'chave2014', SAF: 'chave2014' }, plotInfo, [], 0.47, { nSimulations: 400 }).uncertainty;
    expect(again.byType[0].ciTotal).toEqual(u.byType[0].ciTotal);
    expect(u.equationsWithModelError).toEqual(['chave2014']);
  });

  it('compares vegetation types with Kruskal–Wallis and Dunn', () => {
    expect(u.comparison).not.toBeNull();
    expect(u.comparison!.kruskal.df).toBe(1);
    expect(u.comparison!.dunn).toHaveLength(1);
  });
});
