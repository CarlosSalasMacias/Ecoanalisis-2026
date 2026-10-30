import { describe, expect, it } from 'vitest';
import { DEFAULT_CARBON_FRACTION, runBiomassAnalysis } from '../services/analysisService';
import { expectClose } from './helpers';

const row = (veg: string, plot: string, D: number, H: number, rho: number) => ({
  'Tipo de vegetación': veg, Parcela: plot, 'Nombre científico (Completo)': 'Ocotea sp.',
  'DAP (cm)': D, 'Altura (m)': H, 'Densidad (g/cm3)': rho,
});

describe('biomass and carbon', () => {
  it('Chave et al. (2014) Eq. 4 in kg, converted to Mg; IPCC carbon fraction by default', () => {
    const res = runBiomassAnalysis([row('A', 'P1', 30, 20, 0.6)] as any, { A: 'chave2014' }, { A: { numPlots: '1', plotArea: '1000' } }, []);
    const agbKg = 0.0673 * Math.pow(0.6 * 30 * 30 * 20, 0.976);
    expectClose(res.totals.agb, agbKg / 1000, 1e-12);
    expect(DEFAULT_CARBON_FRACTION).toBe(0.47);
    expectClose(res.totals.carbon, (agbKg / 1000) * 0.47, 1e-12);
  });

  it('carbon fraction is configurable', () => {
    const res = runBiomassAnalysis([row('A', 'P1', 30, 20, 0.6)] as any, { A: 'chave2014' }, { A: { numPlots: '1', plotArea: '1000' } }, [], 0.5);
    expectClose(res.totals.carbon / res.totals.agb, 0.5, 1e-12);
  });

  it('study-wide carbon density is weighted by sampled area', () => {
    // A: 1 plot of 0.1 ha; B: 4 plots of 0.1 ha. Unweighted mean of densities would differ.
    const data = [row('A', 'P1', 40, 25, 0.6), row('B', 'P1', 10, 8, 0.5), row('B', 'P2', 10, 8, 0.5)];
    const res = runBiomassAnalysis(data as any, { A: 'chave2014', B: 'chave2014' },
      { A: { numPlots: '1', plotArea: '1000' }, B: { numPlots: '4', plotArea: '1000' } }, []);
    expectClose(res.totals.carbonPerHa!, res.totals.carbon / 0.5, 1e-12);
  });
});
