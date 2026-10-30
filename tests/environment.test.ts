import { describe, expect, it } from 'vitest';
import { analyzeAllEnvironmentalFactors } from '../services/analysisService';
import { permutationTestMeans } from '../services/stats/nonparametric';
import { adjustBH } from '../services/stats/special';

const sp = (veg: string, plot: string, name: string) => ({ 'Tipo de vegetación': veg, Parcela: plot, 'N_Científico (Abreviado)': name });

describe('environmental comparison of significant pairs', () => {
  // A y B coinciden en P1–P4; solo A en P5–P7; P8 sin ninguna.
  const species = [
    ...['P1', 'P2', 'P3', 'P4'].flatMap(p => [sp('B', p, 'A'), sp('B', p, 'B')]),
    ...['P5', 'P6', 'P7'].map(p => sp('B', p, 'A')),
    sp('B', 'P8', 'C'),
  ];
  const ph = { P1: 5.1, P2: 5.3, P3: 5.0, P4: 5.2, P5: 6.4, P6: 6.1, P7: 6.6, P8: 7.0 };
  const temp = { P1: 20, P2: 21, P3: 19, P4: 22, P5: 20, P6: 21, P7: 22, P8: 18 };
  const site = Object.fromEntries(Object.keys(ph).map(p => [`B-${p}`, { pH: (ph as any)[p], Temp: (temp as any)[p] }]));
  const pair = { speciesA: 'A', speciesB: 'B', effect: 'positive' as const, p_value: 0.01, obs: 4, exp: 2 } as any;
  const out = analyzeAllEnvironmentalFactors([pair], species as any, site);
  const rows = out['A & B'].analysis;

  it('uses only plots with both species vs plots with one of them, and reports n', () => {
    const r = rows.find(x => x.factor === 'pH')!;
    expect(r.nCooccurrence).toBe(4);
    expect(r.nControl).toBe(3);
    expect(r.cooccurrenceMean).toBe(5.15);
  });

  it('p-values come from the permutation test and are BH-adjusted across variables', () => {
    const pPH = permutationTestMeans([5.1, 5.3, 5.0, 5.2], [6.4, 6.1, 6.6]).p;
    const pT = permutationTestMeans([20, 21, 19, 22], [20, 21, 22]).p;
    expect(rows.find(x => x.factor === 'pH')!.pValue).toBe(pPH);
    expect(rows.find(x => x.factor === 'Temp')!.pValue).toBe(pT);
    const adj = adjustBH([pPH, pT]);
    expect(rows.find(x => x.factor === 'pH')!.pAdj).toBe(adj[0]);
    expect(rows.find(x => x.factor === 'pH')!.exact).toBe(true);
  });
});
