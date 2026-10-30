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

import { EQUATIONS, computeAGB, equationForRow, isOutsideRange } from '../services/biomassEquations';
import { REFERENCES } from '../services/references';

const tree = (name: string, D: number, H?: number, rho?: number) => ({
  'Tipo de vegetación': 'SAF', Parcela: 'P1', 'Nombre científico (Completo)': name,
  'DAP (cm)': D, 'Altura (m)': H ?? '', 'Densidad (g/cm3)': rho ?? '',
}) as any;

describe('allometric equation registry (coefficients as printed in the sources)', () => {
  it('Segura et al. (2006) Table 3, Eqs. 3 and 4 (kg per coffee plant)', () => {
    expectClose(computeAGB('cafe', tree('Coffea arabica', 4))!, 10 ** (-1.181 + 1.991 * Math.log10(4)), 1e-12);
    expectClose(computeAGB('cafe_altura', tree('Coffea arabica', 4, 2))!, 10 ** (-1.113 + 1.578 * Math.log10(4) + 0.581 * Math.log10(2)), 1e-12);
  });

  it('cacao by d30 (Andrade et al. 2008) equals the natural-log form printed by Suárez et al. (2025)', () => {
    const agb = computeAGB('cacao', tree('Theobroma cacao', 11))!;
    expectClose(agb, 10 ** (-1.625 + 2.63 * Math.log10(11)), 1e-12);
    expect(Math.abs(Math.log(agb) - (-3.74 + 2.63 * Math.log(11)))).toBeLessThan(0.002);
    expect(EQUATIONS.cacao.diameter).toBe('d30');
  });

  it('Hairiah et al. (2011) Table 3: cacao (DBH) and banana', () => {
    expectClose(computeAGB('cacao_dap', tree('Theobroma cacao', 10))!, 0.1208 * 10 ** 1.98, 1e-12);
    expectClose(computeAGB('musa_sp', tree('Musa paradisiaca', 20))!, 0.03 * 20 ** 2.13, 1e-12);
  });

  it('Chave et al. (2005) via Hairiah et al. (2011) Table 2', () => {
    const t = tree('Ocotea sp.', 30, 20, 0.6);
    expectClose(computeAGB('dry', t)!, 0.112 * (0.6 * 900 * 20) ** 0.916, 1e-12);
    expectClose(computeAGB('moist', t)!, 0.0509 * 0.6 * 900 * 20, 1e-12);
    expectClose(computeAGB('wet', t)!, 0.0776 * (0.6 * 900 * 20) ** 0.94, 1e-12);
    const l = Math.log(30);
    expectClose(computeAGB('dry_no_height', t)!, 0.6 * Math.exp(-0.667 + 1.784 * l + 0.207 * l * l - 0.0281 * l ** 3), 1e-12);
    expectClose(computeAGB('generic_no_height', t)!, 0.6 * Math.exp(-1.499 + 2.148 * l + 0.207 * l * l - 0.0281 * l ** 3), 1e-12);
    expectClose(computeAGB('wet_no_height', t)!, 0.6 * Math.exp(-1.239 + 1.98 * l + 0.207 * l * l - 0.0281 * l ** 3), 1e-12);
  });

  it('missing height or density gives no result instead of a wrong one', () => {
    expect(computeAGB('chave2014', tree('Ocotea sp.', 30, undefined, 0.6))).toBeNull();
    expect(computeAGB('moist', tree('Ocotea sp.', 30, 20))).toBeNull();
  });

  it('crop species are assigned by name; coffee uses Eq. 4 when height is available', () => {
    expect(equationForRow(tree('Theobroma cacao', 10), {})).toBe('cacao');
    expect(equationForRow(tree('Coffea arabica', 3), {})).toBe('cafe');
    expect(equationForRow(tree('Coffea arabica', 3, 1.8), {})).toBe('cafe_altura');
    expect(equationForRow(tree('Ocotea sp.', 30), { SAF: 'chave2014' })).toBe('chave2014');
    expect(equationForRow(tree('Ocotea sp.', 30), {})).toBeNull();
  });

  it('flags trees outside the published calibration range', () => {
    expect(isOutsideRange('cafe', tree('Coffea arabica', 9))).toBe(true);
    expect(isOutsideRange('cafe', tree('Coffea arabica', 5))).toBe(false);
    expect(isOutsideRange('cafe_altura', tree('Coffea arabica', 5, 4))).toBe(true);
    expect(isOutsideRange('moist', tree('Ocotea sp.', 3, 5, 0.5))).toBe(true);
  });

  it('every equation points to a reference in the fixed bibliography (or is marked unverified)', () => {
    Object.values(EQUATIONS).forEach(eq => {
      if (eq.verified) expect(REFERENCES[eq.reference], eq.id).toBeDefined();
    });
  });

  it('reports equations used, unverified ones and trees without equation', () => {
    const res = runBiomassAnalysis([tree('Coffea arabica', 9), tree('Citrus sinensis', 15), tree('Ocotea sp.', 30)],
      {}, { SAF: { numPlots: '1', plotArea: '1000' } }, []);
    const byId = Object.fromEntries(res.equationsUsed.map(u => [u.equation, u]));
    expect(byId.cafe.outsideRange).toBe(1);
    expect(byId.citrus_sinensis.verified).toBe(false);
    expect(res.withoutEquation).toBe(1);
  });
});
